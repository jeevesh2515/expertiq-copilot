"use client";

import { useEffect, useRef, useState } from "react";
import { Network, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import type { GraphData, GraphNode } from "@/lib/api";

interface KnowledgeGraphVizProps {
  data: GraphData;
}

const NODE_COLORS: Record<string, { fill: string; stroke: string }> = {
  expert: { fill: "#10b981", stroke: "#059669" }, // emerald
  company: { fill: "#0f766e", stroke: "#115e59" }, // teal
  industry: { fill: "#f59e0b", stroke: "#d97706" }, // amber
  topic: { fill: "#a8a29e", stroke: "#78716c" }, // stone
};

const NODE_RADIUS: Record<string, number> = {
  expert: 9,
  company: 11,
  industry: 13,
  topic: 7,
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
        ctx.strokeStyle = "rgba(0, 0, 0, 0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Draw nodes
      for (const node of nodes) {
        const colors = NODE_COLORS[node.type] || NODE_COLORS.topic;
        const radius = NODE_RADIUS[node.type] || 7;
        const isHovered = hoveredNode?.id === node.id;

        // Shadow/glow
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
        ctx.strokeStyle = "white"; // White border for clean punch-out effect
        ctx.lineWidth = isHovered ? 2.5 : 1.5;
        ctx.stroke();
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = isHovered ? 1 : 0.5;
        ctx.stroke();

        // Label (only for larger nodes or hovered)
        if (node.type !== "topic" || isHovered) {
          ctx.font = `${isHovered ? "bold " : "500 "}${isHovered ? 11 : 9}px Inter, system-ui, sans-serif`;
          ctx.fillStyle = isHovered ? "#1c1917" : "#78716c";
          ctx.textAlign = "center";
          const label = node.label.length > 20 ? node.label.slice(0, 18) + "…" : node.label;
          // Soft text shadow for readability
          ctx.shadowColor = "rgba(255,255,255,0.8)";
          ctx.shadowBlur = 4;
          ctx.fillText(label, node.x, node.y + radius + (isHovered ? 14 : 12));
          ctx.shadowBlur = 0; // reset
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
    <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 bg-stone-50/50">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-50 rounded-lg">
            <Network className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <span className="text-sm font-bold text-stone-900 block leading-tight">Knowledge Graph</span>
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5 block">
              {data.nodes.length} nodes · {data.edges.length} edges
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg p-1 shadow-sm">
          <button
            onClick={() => setZoom((z) => Math.max(0.3, z - 0.2))}
            className="p-1.5 rounded-md text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-bold text-stone-500 w-9 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            className="p-1.5 rounded-md text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-4 bg-stone-200 mx-0.5" />
          <button
            onClick={() => {
              setZoom(1);
              offsetRef.current = { x: 0, y: 0 };
            }}
            className="p-1.5 rounded-md text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors title='Reset'"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="relative bg-[#FAF9F6] bg-[radial-gradient(#e5e5e5_1px,transparent_1px)] [background-size:16px_16px]" style={{ height: "400px" }}>
        <canvas ref={canvasRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Tooltip */}
        {hoveredNode && (
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md border border-stone-200 shadow-xl rounded-xl px-4 py-2 pointer-events-none">
            <div className="text-sm text-stone-900 font-bold tracking-tight">{hoveredNode.label}</div>
            <div className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-0.5">{hoveredNode.type}</div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 right-4 flex items-center gap-3 bg-white/80 backdrop-blur-md border border-stone-200 px-4 py-2 rounded-xl shadow-sm">
          {Object.entries(NODE_COLORS).map(([type, colors]) => (
            <div key={type} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full border"
                style={{ backgroundColor: colors.fill, borderColor: colors.stroke }}
              />
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
