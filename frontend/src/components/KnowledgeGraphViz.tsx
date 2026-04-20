"use client";

import { useEffect, useRef, useState } from "react";
import { Network, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import type { GraphData, GraphNode } from "@/lib/api";

interface KnowledgeGraphVizProps {
  data: GraphData;
}

const NODE_COLORS: Record<string, { fill: string; stroke: string }> = {
  expert: { fill: "#8b5cf6", stroke: "#a78bfa" },
  company: { fill: "#3b82f6", stroke: "#60a5fa" },
  industry: { fill: "#10b981", stroke: "#34d399" },
  topic: { fill: "#f59e0b", stroke: "#fbbf24" },
};

const NODE_RADIUS: Record<string, number> = {
  expert: 8,
  company: 10,
  industry: 12,
  topic: 6,
};

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export default function KnowledgeGraphViz({ data }: KnowledgeGraphVizProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const nodesRef = useRef<SimNode[]>([]);
  const offsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!data.nodes.length || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = containerRef.current.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.scale(2, 2);

    const width = rect.width;
    const height = rect.height;

    // Initialize node positions with force layout
    const nodes: SimNode[] = data.nodes.map((n, i) => ({
      ...n,
      x: width / 2 + (Math.random() - 0.5) * width * 0.6,
      y: height / 2 + (Math.random() - 0.5) * height * 0.6,
      vx: 0,
      vy: 0,
    }));
    nodesRef.current = nodes;

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    // Simple force-directed layout
    let iteration = 0;
    const maxIterations = 200;

    function simulate() {
      if (iteration >= maxIterations) {
        draw();
        return;
      }
      iteration++;

      const alpha = 1 - iteration / maxIterations;
      const repulsion = 800;
      const attraction = 0.005;
      const centerForce = 0.01;

      // Repulsion between all nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (repulsion / (dist * dist)) * alpha;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          nodes[i].vx -= fx;
          nodes[i].vy -= fy;
          nodes[j].vx += fx;
          nodes[j].vy += fy;
        }
      }

      // Attraction along edges
      for (const edge of data.edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) continue;
        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = dist * attraction * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        source.vx += fx;
        source.vy += fy;
        target.vx -= fx;
        target.vy -= fy;
      }

      // Center gravity
      for (const node of nodes) {
        node.vx += (width / 2 - node.x) * centerForce * alpha;
        node.vy += (height / 2 - node.y) * centerForce * alpha;
        node.x += node.vx;
        node.y += node.vy;
        node.vx *= 0.9;
        node.vy *= 0.9;
        // Boundary
        node.x = Math.max(20, Math.min(width - 20, node.x));
        node.y = Math.max(20, Math.min(height - 20, node.y));
      }

      draw();
      animFrameRef.current = requestAnimationFrame(simulate);
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(offsetRef.current.x, offsetRef.current.y);
      ctx.scale(zoom, zoom);

      // Draw edges
      for (const edge of data.edges) {
        const source = nodeMap.get(edge.source);
        const target = nodeMap.get(edge.target);
        if (!source || !target) continue;

        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = "rgba(255,255,255,0.06)";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Draw nodes
      for (const node of nodes) {
        const colors = NODE_COLORS[node.type] || NODE_COLORS.topic;
        const radius = NODE_RADIUS[node.type] || 6;
        const isHovered = hoveredNode?.id === node.id;

        // Glow
        if (isHovered) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = colors.fill + "20";
          ctx.fill();
        }

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, isHovered ? radius * 1.3 : radius, 0, Math.PI * 2);
        ctx.fillStyle = colors.fill;
        ctx.fill();
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = isHovered ? 2 : 1;
        ctx.stroke();

        // Label (only for larger nodes or hovered)
        if (node.type !== "topic" || isHovered) {
          ctx.font = `${isHovered ? "bold " : ""}${isHovered ? 11 : 9}px Inter, system-ui, sans-serif`;
          ctx.fillStyle = isHovered ? "white" : "rgba(255,255,255,0.5)";
          ctx.textAlign = "center";
          const label = node.label.length > 18 ? node.label.slice(0, 16) + "…" : node.label;
          ctx.fillText(label, node.x, node.y + radius + 12);
        }
      }

      ctx.restore();
    }

    // Mouse handling
    function handleMouseMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left - offsetRef.current.x) / zoom;
      const my = (e.clientY - rect.top - offsetRef.current.y) / zoom;

      let found: SimNode | null = null;
      for (const node of nodes) {
        const dx = mx - node.x;
        const dy = my - node.y;
        const r = NODE_RADIUS[node.type] || 6;
        if (dx * dx + dy * dy < (r + 5) * (r + 5)) {
          found = node;
          break;
        }
      }
      setHoveredNode(found);
      canvas.style.cursor = found ? "pointer" : "default";
      draw();
    }

    canvas.addEventListener("mousemove", handleMouseMove);
    simulate();

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      canvas.removeEventListener("mousemove", handleMouseMove);
    };
  }, [data, zoom]);

  if (!data.nodes.length) return null;

  return (
    <div className="bg-white/[0.03] backdrop-blur-md border border-white/[0.08] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-white/70">Knowledge Graph</span>
          <span className="text-xs text-white/30">
            {data.nodes.length} nodes · {data.edges.length} edges
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-white/30 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setZoom(1);
              offsetRef.current = { x: 0, y: 0 };
            }}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative" style={{ height: "360px" }}>
        <canvas ref={canvasRef} className="w-full h-full" />

        {/* Tooltip */}
        {hoveredNode && (
          <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 pointer-events-none">
            <div className="text-sm text-white font-medium">{hoveredNode.label}</div>
            <div className="text-xs text-white/40 capitalize">{hoveredNode.type}</div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-3 right-3 flex items-center gap-3">
          {Object.entries(NODE_COLORS).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: colors.fill }}
              />
              <span className="text-[10px] text-white/30 capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
