"use client";

import { memo, useMemo, useRef, useEffect, useState, useCallback } from "react";
import { Network, Maximize2, Minimize2 } from "@/components/icons";
import type { GraphData, GraphNode, GraphEdge } from "@/lib/api";

interface KnowledgeGraphVizProps {
  data: GraphData;
  selectedId?: string | null;
}

const NODE_COLORS: Record<string, string> = {
  expert: "#EF4444",
  company: "#F59E0B",
  industry: "#A78BFA",
  topic: "#34D399",
};

interface ForceNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pinned: boolean;
}

interface ForceLink {
  source: string;
  target: string;
  sourceNode: ForceNode;
  targetNode: ForceNode;
}

function computeForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  centerId?: string | null
): { nodes: ForceNode[]; links: ForceLink[]; nodeMap: Map<string, ForceNode> } {
  const nodeMap = new Map<string, ForceNode>();
  const forceNodes: ForceNode[] = nodes.map((n, i) => {
    const rows = Math.ceil(Math.sqrt(nodes.length));
    const cols = Math.ceil(nodes.length / rows);
    const row = Math.floor(i / cols);
    const col = i % cols;
    return {
      ...n,
      x: centerId && n.id === centerId ? width / 2 : (col + 0.5) * (width / cols),
      y: centerId && n.id === centerId ? height / 2 : (row + 0.5) * (height / rows),
      vx: 0,
      vy: 0,
      radius: n.type === "expert" ? 28 : n.type === "company" ? 22 : n.type === "industry" ? 18 : 14,
      pinned: false,
    };
  });

  forceNodes.forEach(n => nodeMap.set(n.id, n));

  const forceLinks: ForceLink[] = [];
  for (const e of edges) {
    const sn = nodeMap.get(e.source);
    const tn = nodeMap.get(e.target);
    if (sn && tn) forceLinks.push({ source: e.source, target: e.target, sourceNode: sn, targetNode: tn });
  }

  return { nodes: forceNodes, links: forceLinks, nodeMap };
}

function KnowledgeGraphViz({ data, selectedId }: KnowledgeGraphVizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [dimensions, setDimensions] = useState({ width: 600, height: 420 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const dragRef = useRef<{ nodeId: string | null; offsetX: number; offsetY: number }>({
    nodeId: null, offsetX: 0, offsetY: 0,
  });
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const isDraggingCanvas = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const containerId = "kg-container";

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: isFullscreen ? window.innerHeight - 80 : Math.max(420, entry.contentRect.height),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isFullscreen]);

  const filteredNodes = useMemo(() => {
    return selectedId
      ? data.nodes.filter(n => n.id === selectedId || data.edges.some(e => (e.source === selectedId && e.target === n.id) || (e.target === selectedId && e.source === n.id)))
      : data.nodes;
  }, [data.nodes, data.edges, selectedId]);

  const filteredEdges = useMemo(() => {
    const ids = new Set(filteredNodes.map(n => n.id));
    return data.edges.filter(e => ids.has(e.source) && ids.has(e.target));
  }, [filteredNodes, data.edges]);

  const simRef = useRef<{ nodes: ForceNode[]; links: ForceLink[]; nodeMap: Map<string, ForceNode> }>({
    nodes: [], links: [], nodeMap: new Map(),
  });

  useEffect(() => {
    simRef.current = computeForceLayout(
      filteredNodes,
      filteredEdges,
      dimensions.width,
      dimensions.height,
      selectedId
    );

    if (selectedId && simRef.current.nodeMap.has(selectedId)) {
      const center = simRef.current.nodeMap.get(selectedId)!;
      center.x = dimensions.width / 2;
      center.y = dimensions.height / 2;
      center.pinned = true;
    }

    let running = true;
    const iterate = () => {
      if (!running) return;
      const { nodes, links } = simRef.current;

      for (let i = 0; i < 3; i++) {
        for (const n of nodes) {
          if (n.pinned) continue;
          let fx = 0, fy = 0;

          for (const other of nodes) {
            if (other.id === n.id) continue;
            const dx = n.x - other.x;
            const dy = n.y - other.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = 3000 / (dist * dist);
            fx += (dx / dist) * force;
            fy += (dy / dist) * force;
          }

          for (const link of links) {
            if (link.sourceNode.id === n.id) {
              const dx = link.targetNode.x - n.x;
              const dy = link.targetNode.y - n.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const force = (dist - 120) * 0.01;
              fx += (dx / dist) * force;
              fy += (dy / dist) * force;
            }
            if (link.targetNode.id === n.id) {
              const dx = link.sourceNode.x - n.x;
              const dy = link.sourceNode.y - n.y;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const force = (dist - 120) * 0.01;
              fx += (dx / dist) * force;
              fy += (dy / dist) * force;
            }
          }

          n.vx = (n.vx + fx) * 0.85;
          n.vy = (n.vy + fy) * 0.85;
          n.x += n.vx;
          n.y += n.vy;

          const margin = 30;
          if (n.x < margin) { n.x = margin; }
          if (n.x > dimensions.width - margin) { n.x = dimensions.width - margin; }
          if (n.y < margin) { n.y = margin; }
          if (n.y > dimensions.height - margin) { n.y = dimensions.height - margin; }
        }

        for (const n of nodes) {
          if (n.pinned) continue;
          n.x += (dimensions.width / 2 - n.x) * 0.001;
          n.y += (dimensions.height / 2 - n.y) * 0.001;
        }
      }

      renderCanvas();
      if (running) animRef.current = requestAnimationFrame(iterate);
    };

    animRef.current = requestAnimationFrame(iterate);
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [filteredNodes, filteredEdges, dimensions, selectedId]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { nodes, links } = simRef.current;
    const { x: tx, y: ty, scale } = transformRef.current;

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(scale, scale);

    for (const link of links) {
      const sx = link.sourceNode.x;
      const sy = link.sourceNode.y;
      const tx2 = link.targetNode.x;
      const ty2 = link.targetNode.y;

      const grad = ctx.createLinearGradient(sx, sy, tx2, ty2);
      grad.addColorStop(0, "rgba(239, 68, 68, 0.15)");
      grad.addColorStop(0.5, "rgba(245, 158, 11, 0.08)");
      grad.addColorStop(1, "rgba(52, 211, 153, 0.15)");

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx2, ty2);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      const mx = (sx + tx2) / 2;
      const my = (sy + ty2) / 2;
      ctx.beginPath();
      ctx.arc(mx, my, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(245, 158, 11, 0.3)";
      ctx.fill();
    }

    for (const node of nodes) {
      const color = NODE_COLORS[node.type] || "#71717A";
      const isSelected = node.id === selectedId;
      const isHovered = node.id === hoveredNodeId;
      const r = node.radius * (isSelected || isHovered ? 1.3 : 1);

      ctx.save();

      const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 3);
      grad.addColorStop(0, color + "40");
      grad.addColorStop(1, color + "00");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);

      if (isSelected) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 20;
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else {
        ctx.fillStyle = color + "CC";
        ctx.fill();
        ctx.strokeStyle = color + "66";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      ctx.restore();

      ctx.save();
      ctx.fillStyle = "#F8FAFC";
      ctx.font = `600 ${isSelected || isHovered ? 12 : 11}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;
      const labelY = node.y + r + 16 + (isSelected || isHovered ? 2 : 0);
      ctx.fillText(
        node.label.length > 18 ? node.label.slice(0, 17) + "…" : node.label,
        node.x, labelY
      );
      ctx.restore();

      if (isSelected) {
        ctx.save();
        ctx.strokeStyle = color + "30";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore();
  }, [dimensions, selectedId, hoveredNodeId]);

  const getNodeAt = useCallback((x: number, y: number): ForceNode | null => {
    const { nodes } = simRef.current;
    const { x: tx, y: ty, scale } = transformRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const sx = n.x * scale + tx;
      const sy = n.y * scale + ty;
      const sr = n.radius * scale;
      if (Math.abs(x - sx) < sr && Math.abs(y - sy) < sr) return n;
    }
    return null;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const node = getNodeAt(mx, my);
    if (node) {
      dragRef.current = { nodeId: node.id, offsetX: 0, offsetY: 0 };
    } else {
      isDraggingCanvas.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, [getNodeAt]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const node = getNodeAt(mx, my);
    setHoveredNodeId(node?.id || null);

    if (dragRef.current.nodeId) {
      const { x: tx, y: ty, scale } = transformRef.current;
      const dragged = simRef.current.nodeMap.get(dragRef.current.nodeId);
      if (dragged) {
        dragged.x = (mx - tx) / scale;
        dragged.y = (my - ty) / scale;
        dragged.pinned = true;
      }
      return;
    }

    if (isDraggingCanvas.current) {
      const dx = e.clientX - lastMousePos.current.x;
      const dy = e.clientY - lastMousePos.current.y;
      transformRef.current.x += dx;
      transformRef.current.y += dy;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
    }
  }, [getNodeAt]);

  const handleMouseUp = useCallback(() => {
    if (dragRef.current.nodeId) {
      const node = simRef.current.nodeMap.get(dragRef.current.nodeId);
      if (node) node.pinned = true;
    }
    dragRef.current = { nodeId: null, offsetX: 0, offsetY: 0 };
    isDraggingCanvas.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(4, Math.max(0.2, transformRef.current.scale * factor));

    transformRef.current.x = mx - (mx - transformRef.current.x) * (newScale / transformRef.current.scale);
    transformRef.current.y = my - (my - transformRef.current.y) * (newScale / transformRef.current.scale);
    transformRef.current.scale = newScale;
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(v => !v);
  }, []);

  if (!data.nodes.length) return null;

  return (
    <div
      className={`rounded-xl border border-zinc-800 bg-zinc-900 flex flex-col overflow-hidden transition-all duration-500 ${
        isFullscreen ? 'fixed inset-4 z-50' : 'h-full'
      }`}
      id="knowledge-graph"
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 shrink-0 bg-zinc-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Network className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-zinc-100">Knowledge Graph</div>
            <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              {data.nodes.length} nodes · {data.edges.length} edges
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Visually hidden screen reader announcements for WCAG compliance */}
      <div className="sr-only" aria-live="polite">
        Interactive expert network graph containing {data.nodes.length} nodes and {data.edges.length} edges.
        {selectedId ? `Currently highlighting connections for expert ${selectedId}.` : "Displaying entire query discovery graph."}
      </div>

      <div
        className="relative flex-1 bg-zinc-950 overflow-hidden cursor-grab active:cursor-grabbing"
        ref={containerRef}
      >
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />

        <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-[10px] text-zinc-500 bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-800">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-soft" />
          Force layout · Pan & zoom
        </div>

        <div className="absolute bottom-4 left-4 grid grid-cols-2 gap-1.5 text-[10px]">
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5 bg-zinc-900/80 px-2 py-1 rounded-md border border-zinc-800">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-zinc-400 capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default memo(KnowledgeGraphViz);
