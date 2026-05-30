"use client";

import { memo, useMemo, useRef, useEffect, useState, useCallback } from "react";
import { Network, Maximize2, Minimize2, RotateCw } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { GraphData, GraphNode, GraphEdge } from "@/lib/api";

interface KnowledgeGraphVizProps {
  data: GraphData;
  selectedId?: string | null;
  hideHeader?: boolean;
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

const ALPHA_DECAY = 0.003;
const ALPHA_MIN = 0.001;
const VELOCITY_DECAY = 0.4;
const REPULSION_STRENGTH = 1800;
const REPULSION_DISTANCE_MAX = 350;
const SPRING_LENGTH = 100;
const SPRING_STRENGTH = 0.08;
const CENTER_GRAVITY = 0.04;
const BOUNDARY_PADDING = 30;

function computeForceLayout(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number,
  height: number,
  centerId?: string | null,
): { nodes: ForceNode[]; links: ForceLink[]; nodeMap: Map<string, ForceNode> } {
  const nodeMap = new Map<string, ForceNode>();
  const cx = width / 2;
  const cy = height / 2;

  const forceNodes: ForceNode[] = nodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / nodes.length;
    const spread = Math.min(width, height) * 0.3;
    const isCenter = !!(centerId && n.id === centerId);
    return {
      ...n,
      x: isCenter ? cx : cx + Math.cos(angle) * spread * (0.5 + Math.random() * 0.5),
      y: isCenter ? cy : cy + Math.sin(angle) * spread * (0.5 + Math.random() * 0.5),
      vx: 0,
      vy: 0,
      radius: n.type === "expert" ? 10 : n.type === "company" ? 8 : n.type === "industry" ? 7 : 6,
      pinned: isCenter,
    };
  });

  forceNodes.forEach((n) => nodeMap.set(n.id, n));

  const forceLinks: ForceLink[] = [];
  for (const e of edges) {
    const sn = nodeMap.get(e.source);
    const tn = nodeMap.get(e.target);
    if (sn && tn) forceLinks.push({ source: e.source, target: e.target, sourceNode: sn, targetNode: tn });
  }

  return { nodes: forceNodes, links: forceLinks, nodeMap };
}

function KnowledgeGraphViz({ data, selectedId, hideHeader }: KnowledgeGraphVizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const alphaRef = useRef(1);
  const [dimensions, setDimensions] = useState({ width: 380, height: 240 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettled, setIsSettled] = useState(true);
  const hoveredRef = useRef<string | null>(null);
  const transformRef = useRef({ x: 0, y: 0, scale: 1 });
  const isDraggingCanvas = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ nodeId: string | null }>({ nodeId: null });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        setDimensions({
          width: w > 50 ? w : 380,
          height: isFullscreen ? window.innerHeight - 80 : h > 50 ? h : 240,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isFullscreen]);

  const filteredNodes = useMemo(() => {
    if (!data || !data.nodes) return [];
    const nodes = data.nodes || [];
    const edges = data.edges || [];
    return selectedId
      ? nodes.filter(
          (n) =>
            n.id === selectedId ||
            edges.some(
              (e) =>
                (e.source === selectedId && e.target === n.id) ||
                (e.target === selectedId && e.source === n.id),
            ),
        )
      : nodes;
  }, [data, selectedId]);

  const filteredEdges = useMemo(() => {
    if (!data || !data.nodes || !data.edges) return [];
    const edges = data.edges || [];
    const ids = new Set(filteredNodes.map((n) => n.id));
    return edges.filter((e) => ids.has(e.source) && ids.has(e.target));
  }, [filteredNodes, data]);

  const simRef = useRef<{ nodes: ForceNode[]; links: ForceLink[]; nodeMap: Map<string, ForceNode> }>({
    nodes: [],
    links: [],
    nodeMap: new Map(),
  });

  // renderCanvas depends ONLY on dimensions — reads hovered/selected from refs
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { nodes, links } = simRef.current;
    const { x: tx, y: ty, scale } = transformRef.current;
    const hoveredId = hoveredRef.current;

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(scale, scale);

    for (const link of links) {
      const sx = link.sourceNode.x;
      const sy = link.sourceNode.y;
      const tx2 = link.targetNode.x;
      const ty2 = link.targetNode.y;

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx2, ty2);
      ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();

      const mx = (sx + tx2) / 2;
      const my = (sy + ty2) / 2;
      ctx.beginPath();
      ctx.arc(mx, my, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(148, 163, 184, 0.5)";
      ctx.fill();
    }

    for (const node of nodes) {
      const color = NODE_COLORS[node.type] || "#71717A";
      const isSelected = node.id === selectedId;
      const isHovered = node.id === hoveredId;
      const r = node.radius * (isSelected || isHovered ? 1.3 : 1);

      ctx.save();

      const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 2);
      glow.addColorStop(0, color + "30");
      glow.addColorStop(1, color + "00");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(node.x, node.y, r * 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, Math.PI * 2);

      if (isSelected) {
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.restore();

      ctx.save();
      const labelY = node.y + r + 12;
      ctx.font = `500 ${isSelected || isHovered ? 11 : 10}px system-ui, -apple-system, sans-serif`;
      ctx.textAlign = "center";

      const labelText = node.label.length > 20 ? node.label.slice(0, 19) + "…" : node.label;
      const textWidth = ctx.measureText(labelText).width;

      ctx.save();
      ctx.fillStyle = "rgba(15, 15, 20, 0.9)";
      ctx.strokeStyle = color + "50";
      ctx.lineWidth = 0.5;
      ctx.beginPath();

      const px = node.x - textWidth / 2 - 6;
      const py = labelY - 8;
      const pw = textWidth + 12;
      const ph = 13;
      const pr = 3;

      ctx.moveTo(px + pr, py);
      ctx.lineTo(px + pw - pr, py);
      ctx.quadraticCurveTo(px + pw, py, px + pw, py + pr);
      ctx.lineTo(px + pw, py + ph - pr);
      ctx.quadraticCurveTo(px + pw, py + ph, px + pw - pr, py + ph);
      ctx.lineTo(px + pr, py + ph);
      ctx.quadraticCurveTo(px, py + ph, px, py + ph - pr);
      ctx.lineTo(px, py + pr);
      ctx.quadraticCurveTo(px, py, px + pr, py);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = "#E2E8F0";
      ctx.fillText(labelText, node.x, labelY + 2);
      ctx.restore();

      if (isSelected) {
        ctx.save();
        ctx.strokeStyle = color + "40";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    ctx.restore();
  }, [dimensions, selectedId]);

  const settledRef = useRef(true);

  // Main simulation — only re-runs when data/dimensions/selectedId change (NOT hovered)
  useEffect(() => {
    simRef.current = computeForceLayout(filteredNodes, filteredEdges, dimensions.width, dimensions.height, selectedId);

    if (selectedId && simRef.current.nodeMap.has(selectedId)) {
      const center = simRef.current.nodeMap.get(selectedId)!;
      center.x = dimensions.width / 2;
      center.y = dimensions.height / 2;
      center.pinned = true;
    }

    alphaRef.current = 1;
    settledRef.current = false;

    const iterate = () => {
      if (!settledRef.current) setIsSettled(false);
      const { nodes, links } = simRef.current;
      const alpha = alphaRef.current;

      if (alpha < ALPHA_MIN) {
        if (!settledRef.current) {
          settledRef.current = true;
          setIsSettled(true);
        }
        renderCanvas();
        return;
      }

      for (const n of nodes) {
        if (n.pinned) continue;
        let fx = 0;
        let fy = 0;

        for (const other of nodes) {
          if (other.id === n.id) continue;
          const dx = n.x - other.x;
          const dy = n.y - other.y;
          const distSq = dx * dx + dy * dy;
          const dist = Math.sqrt(distSq) || 1;

          if (dist < REPULSION_DISTANCE_MAX) {
            const strength = (REPULSION_STRENGTH * alpha) / distSq;
            fx += (dx / dist) * strength;
            fy += (dy / dist) * strength;
          }
        }

        for (const link of links) {
          let other: ForceNode | null = null;
          if (link.sourceNode.id === n.id) other = link.targetNode;
          else if (link.targetNode.id === n.id) other = link.sourceNode;

          if (other) {
            const dx = other.x - n.x;
            const dy = other.y - n.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const displacement = dist - SPRING_LENGTH;
            const strength = SPRING_STRENGTH * displacement * alpha;
            fx += (dx / dist) * strength;
            fy += (dy / dist) * strength;
          }
        }

        const gcx = dimensions.width / 2;
        const gcy = dimensions.height / 2;
        fx += (gcx - n.x) * CENTER_GRAVITY * alpha;
        fy += (gcy - n.y) * CENTER_GRAVITY * alpha;

        n.vx = (n.vx + fx) * VELOCITY_DECAY;
        n.vy = (n.vy + fy) * VELOCITY_DECAY;
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < BOUNDARY_PADDING) { n.x = BOUNDARY_PADDING; n.vx *= -0.3; }
        if (n.x > dimensions.width - BOUNDARY_PADDING) { n.x = dimensions.width - BOUNDARY_PADDING; n.vx *= -0.3; }
        if (n.y < BOUNDARY_PADDING) { n.y = BOUNDARY_PADDING; n.vy *= -0.3; }
        if (n.y > dimensions.height - BOUNDARY_PADDING) { n.y = dimensions.height - BOUNDARY_PADDING; n.vy *= -0.3; }
      }

      alphaRef.current = alpha * (1 - ALPHA_DECAY);
      renderCanvas();
      animRef.current = requestAnimationFrame(iterate);
    };

    animRef.current = requestAnimationFrame(iterate);
    return () => {
      cancelAnimationFrame(animRef.current);
    };
  }, [filteredNodes, filteredEdges, dimensions, selectedId, renderCanvas]);

  const getNodeAt = useCallback(
    (x: number, y: number): ForceNode | null => {
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
    },
    [],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const node = getNodeAt(mx, my);
      if (node) {
        dragRef.current = { nodeId: node.id };
      } else {
        isDraggingCanvas.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
      }
    },
    [getNodeAt],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const node = getNodeAt(mx, my);
      const newHoveredId = node?.id || null;

      // Update ref and redraw ONLY — no React state, no simulation restart
      if (hoveredRef.current !== newHoveredId) {
        hoveredRef.current = newHoveredId;
        renderCanvas();
      }

      if (dragRef.current.nodeId) {
        const { x: tx, y: ty, scale } = transformRef.current;
        const dragged = simRef.current.nodeMap.get(dragRef.current.nodeId);
        if (dragged) {
          dragged.x = (mx - tx) / scale;
          dragged.y = (my - ty) / scale;
          dragged.pinned = true;
          dragged.vx = 0;
          dragged.vy = 0;
          alphaRef.current = Math.max(alphaRef.current, 0.15);
          if (settledRef.current) {
            settledRef.current = false;
            setIsSettled(false);
            const reheat = () => {
              if (alphaRef.current < ALPHA_MIN) {
                settledRef.current = true;
                setIsSettled(true);
                renderCanvas();
                return;
              }
              const { nodes: ns, links: lk } = simRef.current;
              const a = alphaRef.current;
              for (const n of ns) {
                if (n.pinned) continue;
                let fx = 0;
                let fy = 0;
                for (const other of ns) {
                  if (other.id === n.id) continue;
                  const dx = n.x - other.x;
                  const dy = n.y - other.y;
                  const dSq = dx * dx + dy * dy;
                  const d = Math.sqrt(dSq) || 1;
                  if (d < REPULSION_DISTANCE_MAX) {
                    const s = (REPULSION_STRENGTH * a) / dSq;
                    fx += (dx / d) * s;
                    fy += (dy / d) * s;
                  }
                }
                for (const link of lk) {
                  let o: ForceNode | null = null;
                  if (link.sourceNode.id === n.id) o = link.targetNode;
                  else if (link.targetNode.id === n.id) o = link.sourceNode;
                  if (o) {
                    const dx = o.x - n.x;
                    const dy = o.y - n.y;
                    const d = Math.sqrt(dx * dx + dy * dy) || 1;
                    const disp = d - SPRING_LENGTH;
                    const s = SPRING_STRENGTH * disp * a;
                    fx += (dx / d) * s;
                    fy += (dy / d) * s;
                  }
                }
                const gcx = dimensions.width / 2;
                const gcy = dimensions.height / 2;
                fx += (gcx - n.x) * CENTER_GRAVITY * a;
                fy += (gcy - n.y) * CENTER_GRAVITY * a;
                n.vx = (n.vx + fx) * VELOCITY_DECAY;
                n.vy = (n.vy + fy) * VELOCITY_DECAY;
                n.x += n.vx;
                n.y += n.vy;
              }
              alphaRef.current = a * (1 - ALPHA_DECAY);
              renderCanvas();
              animRef.current = requestAnimationFrame(reheat);
            };
            animRef.current = requestAnimationFrame(reheat);
          }
        }
        return;
      }

      if (isDraggingCanvas.current) {
        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        transformRef.current.x += dx;
        transformRef.current.y += dy;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
        renderCanvas();
      }
    },
    [getNodeAt, dimensions, renderCanvas],
  );

  const handleMouseUp = useCallback(() => {
    if (dragRef.current.nodeId) {
      const node = simRef.current.nodeMap.get(dragRef.current.nodeId);
      if (node) node.pinned = true;
    }
    dragRef.current = { nodeId: null };
    isDraggingCanvas.current = false;
  }, []);

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const node = getNodeAt(mx, my);
      if (node) {
        transformRef.current = {
          x: dimensions.width / 2 - node.x * 1.5,
          y: dimensions.height / 2 - node.y * 1.5,
          scale: 1.5,
        };
      } else {
        transformRef.current = { x: 0, y: 0, scale: 1 };
      }
      renderCanvas();
    },
    [getNodeAt, dimensions, renderCanvas],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const factor = e.deltaY > 0 ? 0.92 : 1.08;
      const newScale = Math.min(5, Math.max(0.15, transformRef.current.scale * factor));

      transformRef.current.x = mx - (mx - transformRef.current.x) * (newScale / transformRef.current.scale);
      transformRef.current.y = my - (my - transformRef.current.y) * (newScale / transformRef.current.scale);
      transformRef.current.scale = newScale;
      renderCanvas();
    };

    canvas.addEventListener("wheel", handleWheelNative, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheelNative);
  }, [renderCanvas]);

  const handleResetView = useCallback(() => {
    transformRef.current = { x: 0, y: 0, scale: 1 };
    renderCanvas();
  }, [renderCanvas]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((v) => !v);
  }, []);

  if (!data || !data.nodes || !data.nodes.length) return null;

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden transition-all duration-500",
        isFullscreen ? "fixed inset-4 z-50 bg-zinc-900 border border-zinc-800 rounded-xl" : "",
        !isFullscreen && !hideHeader ? "rounded-2xl border border-zinc-800 bg-zinc-900/80 glass-card h-full" : "",
        !isFullscreen && hideHeader ? "bg-transparent border-0 w-full h-full" : "",
      )}
      id="knowledge-graph"
    >
      {!hideHeader && (
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
              onClick={handleResetView}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all cursor-pointer"
              title="Reset view"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all cursor-pointer"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

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
          onDoubleClick={handleDoubleClick}
        />

        <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-[10px] text-zinc-500 bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-800">
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              isSettled ? "bg-emerald-400" : "bg-amber-400 animate-pulse",
            )}
          />
          {isSettled ? "Settled · Drag to interact" : "Simulating…"}
        </div>

        <div className="absolute bottom-4 left-4 grid grid-cols-2 gap-1.5 text-[10px]">
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-1.5 bg-zinc-900/80 px-2 py-1 rounded-md border border-zinc-800">
              <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-zinc-400 capitalize">{type}</span>
            </div>
          ))}
        </div>

        <div className="absolute top-4 right-4 text-[10px] text-zinc-600 bg-zinc-900/60 px-2.5 py-1.5 rounded-md border border-zinc-800/50 select-none">
          Scroll to zoom · Double-click to focus
        </div>
      </div>
    </div>
  );
}

export default memo(KnowledgeGraphViz);
