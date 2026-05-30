"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Network, Maximize2, Minimize2, RotateCw } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { GraphData, GraphNode } from "@/lib/api";
import * as THREE from "three";

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });

interface Vector3DGraphProps {
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

const NODE_LABELS: Record<string, string> = {
  expert: "Experts",
  company: "Companies",
  industry: "Industries",
  topic: "Topics",
};

const NODE_ORDER = ["expert", "company", "industry", "topic"] as const;

const NODE_SIZES: Record<string, number> = {
  expert: 8.5,
  company: 5.4,
  industry: 4.5,
  topic: 3.4,
};

const MIN_GRAPH_WIDTH = 160;
const MIN_GRAPH_HEIGHT = 160;

function getSafeGraphSize(width: number, height: number) {
  return {
    width: Number.isFinite(width) && width >= MIN_GRAPH_WIDTH ? width : 380,
    height: Number.isFinite(height) && height >= MIN_GRAPH_HEIGHT ? height : 240,
  };
}

function getEndpointType(endpoint: unknown) {
  return typeof endpoint === "object" && endpoint !== null && "type" in endpoint
    ? String((endpoint as { type?: unknown }).type || "")
    : "";
}

function linkTouchesType(link: unknown, type: string) {
  if (typeof link !== "object" || link === null) return false;
  const { source, target } = link as { source?: unknown; target?: unknown };
  return getEndpointType(source) === type || getEndpointType(target) === type;
}

function makeLabelSprite(text: string, color: string) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = 260 * pixelRatio;
  canvas.height = 56 * pixelRatio;
  if (!context) return null;

  context.scale(pixelRatio, pixelRatio);
  context.font = "700 18px system-ui, -apple-system, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";

  const label = text.length > 24 ? `${text.slice(0, 23)}…` : text;
  const textWidth = Math.min(220, context.measureText(label).width + 28);
  const x = (260 - textWidth) / 2;
  const y = 8;
  const radius = 10;

  context.fillStyle = "rgba(5, 7, 10, 0.82)";
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.beginPath();
  context.roundRect(x, y, textWidth, 32, radius);
  context.fill();
  context.stroke();
  context.fillStyle = "#F8FAFC";
  context.fillText(label, 130, 24);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(58, 13, 1);
  sprite.position.set(0, 13, 0);
  return sprite;
}

export default function Vector3DGraph({ data, selectedId, hideHeader }: Vector3DGraphProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 380, height: 240 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        const h = isFullscreen ? window.innerHeight - 80 : entry.contentRect.height;
        setDimensions(getSafeGraphSize(w, h));
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isFullscreen]);

  const graphData = useMemo(() => {
    const filteredNodes = selectedId
      ? data.nodes.filter((n) => n.id === selectedId || data.edges.some((e) => (e.source === selectedId && e.target === n.id) || (e.target === selectedId && e.source === n.id)))
      : data.nodes;
    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = data.edges.filter((e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));

    return {
      nodes: filteredNodes.map((n) => ({
        ...n,
        val: NODE_SIZES[n.type] || 3,
      })),
      links: filteredEdges.map((e) => ({ ...e, source: e.source, target: e.target })),
    };
  }, [data, selectedId]);

  const typeCounts = useMemo(
    () =>
      NODE_ORDER.map((type) => ({
        type,
        color: NODE_COLORS[type],
        label: NODE_LABELS[type],
        count: graphData.nodes.filter((node) => node.type === type).length,
      })).filter((item) => item.count > 0),
    [graphData.nodes],
  );

  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      const timer = setTimeout(() => {
        const graph = fgRef.current;
        graph?.d3Force("charge")?.strength(-125);
        graph?.d3Force("link")?.distance((link: unknown) => {
          const { source, target } =
            typeof link === "object" && link !== null
              ? (link as { source?: unknown; target?: unknown })
              : {};
          return getEndpointType(source) && getEndpointType(source) === getEndpointType(target) ? 58 : 86;
        });
        graph?.d3Force("link")?.strength(0.38);
        fgRef.current?.zoomToFit(500, 50);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [graphData]);

  const handleZoomToFit = useCallback(() => {
    fgRef.current?.zoomToFit(400, 60);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(v => !v);
  }, []);

  if (!data.nodes.length) return null;
  const safeDimensions = getSafeGraphSize(dimensions.width, dimensions.height);

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden transition-all duration-500",
        isFullscreen ? "fixed inset-4 z-50 bg-zinc-900 border border-zinc-800 rounded-xl" : "",
        !isFullscreen && !hideHeader ? "rounded-2xl border border-zinc-800 bg-zinc-900/80 glass-card h-full" : "",
        !isFullscreen && hideHeader ? "bg-transparent border-0 w-full h-full" : "",
      )}
      id="vector-3d-graph"
    >
      {!hideHeader && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 shrink-0 bg-zinc-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
              <Network className="w-3.5 h-3.5 text-red-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-zinc-100">3D Semantic Vector Space</div>
              <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                {data.nodes.length} nodes · {data.edges.length} edges
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleZoomToFit}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all cursor-pointer"
              title="Reset view"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all cursor-pointer"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden bg-[#050608]" ref={containerRef}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_32%_38%,rgba(239,68,68,0.18),transparent_34%),radial-gradient(circle_at_72%_70%,rgba(52,211,153,0.12),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.65),rgba(2,6,23,0.1)_45%,rgba(0,0,0,0.35))]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.055)_1px,transparent_1px)] bg-[size:42px_42px] opacity-40" />
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-zinc-800/70 bg-zinc-950/70 px-2 py-1.5 backdrop-blur-md">
          <div className="text-[9px] font-black uppercase text-zinc-300">Semantic Orbit</div>
          <div className="mt-0.5 text-[9px] text-zinc-500">Drag to rotate · Scroll to zoom</div>
        </div>
        {safeDimensions.width > 0 && (
          <ForceGraph3D
            key={`${selectedId || "all"}-${data.nodes.length}`}
            ref={fgRef}
            width={safeDimensions.width}
            height={safeDimensions.height}
            graphData={graphData}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nodeLabel={(node: any) => `${node.label} (${node.type})`}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nodeColor={(node: any) => NODE_COLORS[node.type] || "#71717A"}
            nodeRelSize={7.5}
            linkColor={(link) =>
              linkTouchesType(link, "expert")
                ? "rgba(248, 113, 113, 0.42)"
                : "rgba(148, 163, 184, 0.24)"
            }
            linkWidth={(link) =>
              linkTouchesType(link, "expert") ? 1.15 : 0.65
            }
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={1.35}
            linkDirectionalParticleSpeed={0.006}
            linkDirectionalParticleColor={(link) =>
              linkTouchesType(link, "topic") ? "#34D399" : "#F87171"
            }
            backgroundColor="rgba(0,0,0,0)"
            showNavInfo={false}
            enableNodeDrag={true}
            enableNavigationControls={true}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onNodeHover={(node: any) => setHoveredNode(node || null)}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nodeThreeObject={(node: any) => {
              const color = new THREE.Color(NODE_COLORS[node.type] || "#71717A");
              const size = NODE_SIZES[node.type] || 3;
              const isSelected = node.id === selectedId;

              const group = new THREE.Group();

              const sphere = new THREE.Mesh(
                new THREE.SphereGeometry(size * 0.6, 16, 16),
                new THREE.MeshStandardMaterial({
                  color: color,
                  emissive: color,
                  emissiveIntensity: isSelected ? 1.25 : 0.5,
                  roughness: 0.25,
                  metalness: 0.15,
                }),
              );
              group.add(sphere);

              const shell = new THREE.Mesh(
                new THREE.SphereGeometry(size * 0.86, 20, 20),
                new THREE.MeshBasicMaterial({
                  color,
                  transparent: true,
                  opacity: isSelected ? 0.18 : node.type === "expert" ? 0.12 : 0.07,
                  wireframe: true,
                  depthWrite: false,
                }),
              );
              group.add(shell);

              if (isSelected) {
                const glowRing = new THREE.Mesh(
                  new THREE.RingGeometry(size * 0.8, size * 1.2, 32),
                  new THREE.MeshBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.5,
                    side: THREE.DoubleSide,
                  }),
                );
                glowRing.rotation.x = Math.PI / 2;
                group.add(glowRing);

                const glowRing2 = glowRing.clone();
                glowRing2.rotation.x = Math.PI / 3;
                glowRing2.rotation.z = Math.PI / 4;
                group.add(glowRing2);
              }

              const glowSphere = new THREE.Mesh(
                new THREE.SphereGeometry(size * 1.05, 20, 20),
                new THREE.MeshBasicMaterial({
                  color: color,
                  transparent: true,
                  opacity: isSelected ? 0.34 : node.type === "expert" ? 0.2 : 0.1,
                  depthWrite: false,
                }),
              );
              group.add(glowSphere);

              if (node.type === "expert" || isSelected) {
                const label = makeLabelSprite(node.label, `#${color.getHexString()}`);
                if (label) group.add(label);
              }

              return group;
            }}
            d3AlphaDecay={0.016}
            d3VelocityDecay={0.34}
            warmupTicks={140}
            cooldownTicks={0}
          />
        )}

        {hoveredNode && (
          <div className="absolute left-4 top-4 z-10 max-w-[260px] rounded-xl border border-zinc-800 bg-zinc-950/85 px-4 py-3 shadow-2xl backdrop-blur-md">
            <div className="truncate text-sm font-bold text-zinc-100">{hoveredNode.label}</div>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full shadow-[0_0_10px_currentColor]"
                style={{ backgroundColor: NODE_COLORS[hoveredNode.type] || "#71717A" }}
              />
              <span className="text-[11px] font-bold uppercase text-zinc-400">{hoveredNode.type}</span>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-zinc-800/70 bg-zinc-950/95 px-2 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="grid min-w-0 flex-1 grid-cols-4 gap-1">
            {typeCounts.map((item) => (
              <div key={item.type} className="flex min-w-0 items-center gap-1 rounded-md border border-zinc-800/80 bg-zinc-900/60 px-1.5 py-0.5">
                <span className="h-2 w-2 shrink-0 rounded-full shadow-[0_0_8px_currentColor]" style={{ backgroundColor: item.color, color: item.color }} />
                <span className="truncate text-[8px] font-bold uppercase text-zinc-400">{item.label}</span>
                <span className="text-[8px] font-black text-zinc-200">{item.count}</span>
              </div>
            ))}
          </div>
          <div className="flex shrink-0 items-center gap-1 text-[8px] font-bold uppercase text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse-soft" />
            3D
          </div>
        </div>
      </div>
    </div>
  );
}
