"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Network, Maximize2, Minimize2, RotateCw } from "@/components/icons";
import { cn } from "@/lib/utils";
import type { GraphData, GraphNode } from "@/lib/api";
import * as THREE from 'three';

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

const NODE_SIZES: Record<string, number> = {
  expert: 8,
  company: 5,
  industry: 4,
  topic: 3,
};

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
        const h = entry.contentRect.height;
        setDimensions({
          width: w > 50 ? w : 380,
          height: isFullscreen ? window.innerHeight - 80 : (h > 50 ? h : 240),
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isFullscreen]);

  const graphData = useMemo(() => {
    const filteredNodes = selectedId
      ? data.nodes.filter(n => n.id === selectedId || data.edges.some(e => (e.source === selectedId && e.target === n.id) || (e.target === selectedId && e.source === n.id)))
      : data.nodes;
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = data.edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));

    return {
      nodes: filteredNodes.map((n) => ({
        ...n,
        val: NODE_SIZES[n.type] || 3,
      })),
      links: filteredEdges.map((e) => ({ ...e, source: e.source, target: e.target })),
    };
  }, [data, selectedId]);

  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      const timer = setTimeout(() => {
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

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden transition-all duration-500",
        isFullscreen ? 'fixed inset-4 z-50 bg-zinc-900 border border-zinc-800 rounded-xl' : '',
        !isFullscreen && !hideHeader ? 'rounded-2xl border border-zinc-800 bg-zinc-900/80 glass-card h-full' : '',
        !isFullscreen && hideHeader ? 'bg-transparent border-0 w-full h-full' : ''
      )}
      id="vector-3d-graph"
    >
      {!hideHeader && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 shrink-0 bg-zinc-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <Network className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-zinc-100">3D Semantic Vector Space</div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                {data.nodes.length} nodes · {data.edges.length} edges
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomToFit}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all cursor-pointer"
              title="Reset view"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all cursor-pointer"
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      <div className="relative flex-1 bg-zinc-950 overflow-hidden" ref={containerRef}>
        {dimensions.width > 0 && (
          <ForceGraph3D
            key={`${selectedId || "all"}-${data.nodes.length}`}
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nodeLabel={(node: any) => `${node.label} (${node.type})`}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            nodeColor={(node: any) => NODE_COLORS[node.type] || "#71717A"}
            nodeRelSize={7}
            linkColor={() => "rgba(148, 163, 184, 0.35)"}
            linkWidth={0.8}
            linkDirectionalParticles={2}
            linkDirectionalParticleWidth={1.5}
            linkDirectionalParticleColor={() => "#EF4444"}
            backgroundColor="#09090B"
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
                  emissiveIntensity: isSelected ? 1.2 : 0.45,
                  roughness: 0.25,
                  metalness: 0.15,
                })
              );
              group.add(sphere);

              if (isSelected) {
                const glowRing = new THREE.Mesh(
                  new THREE.RingGeometry(size * 0.8, size * 1.2, 32),
                  new THREE.MeshBasicMaterial({
                    color: color,
                    transparent: true,
                    opacity: 0.5,
                    side: THREE.DoubleSide,
                  })
                );
                glowRing.rotation.x = Math.PI / 2;
                group.add(glowRing);

                const glowRing2 = glowRing.clone();
                glowRing2.rotation.x = Math.PI / 3;
                glowRing2.rotation.z = Math.PI / 4;
                group.add(glowRing2);
              }

              const glowSphere = new THREE.Mesh(
                new THREE.SphereGeometry(size * 0.8, 16, 16),
                new THREE.MeshBasicMaterial({
                  color: color,
                  transparent: true,
                  opacity: isSelected ? 0.35 : 0.15,
                })
              );
              group.add(glowSphere);

              return group;
            }}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
            warmupTicks={100}
            cooldownTicks={0}
          />
        )}

        {hoveredNode && (
          <div className="absolute top-4 left-4 px-4 py-2.5 bg-zinc-900/90 backdrop-blur-md rounded-xl border border-zinc-800 shadow-xl z-10">
            <div className="text-sm font-bold text-zinc-100">{hoveredNode.label}</div>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: NODE_COLORS[hoveredNode.type] || "#71717A" }}
              />
              <span className="text-xs text-zinc-400 capitalize">{hoveredNode.type}</span>
            </div>
          </div>
        )}

        <div className="absolute bottom-4 right-4 flex items-center gap-1.5 text-[10px] text-zinc-500 bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-800">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse-soft" />
          Interactive 3D · Drag to explore
        </div>
      </div>
    </div>
  );
}
