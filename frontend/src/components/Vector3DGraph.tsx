"use client";

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Network, Maximize2, Minimize2, RotateCw } from "@/components/icons";
import type { GraphData, GraphNode, GraphEdge } from "@/lib/api";
import * as THREE from 'three';

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });

interface Vector3DGraphProps {
  data: GraphData;
  selectedId?: string | null;
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

const GLOW_COLORS: Record<string, string> = {
  expert: "#EF4444",
  company: "#F59E0B",
  industry: "#A78BFA",
  topic: "#34D399",
};

export default function Vector3DGraph({ data, selectedId }: Vector3DGraphProps) {
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 480 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: isFullscreen ? window.innerHeight - 80 : entry.contentRect.height,
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
      setTimeout(() => {
        fgRef.current?.zoomToFit(400, 60);
      }, 500);
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
      className={`rounded-xl border border-zinc-800 bg-zinc-900 flex flex-col overflow-hidden transition-all duration-500 ${
        isFullscreen ? 'fixed inset-4 z-50' : 'h-full'
      }`}
      id="vector-3d-graph"
    >
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
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
            title="Reset view"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="relative flex-1 bg-zinc-950 overflow-hidden" ref={containerRef}>
        {dimensions.width > 0 && (
          <ForceGraph3D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeLabel={(node: any) => `${node.label} (${node.type})`}
            nodeColor={(node: any) => NODE_COLORS[node.type] || "#71717A"}
            nodeRelSize={6}
            linkColor={() => "rgba(255, 255, 255, 0.08)"}
            linkWidth={0.5}
            linkDirectionalParticles={1}
            linkDirectionalParticleWidth={1.5}
            linkDirectionalParticleColor={() => "rgba(239, 68, 68, 0.4)"}
            backgroundColor="#09090B"
            showNavInfo={false}
            enableNodeDrag={true}
            enableNavigationControls={true}
            onNodeHover={(node: any) => setHoveredNode(node || null)}
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
                  emissiveIntensity: isSelected ? 0.8 : 0.3,
                  roughness: 0.3,
                  metalness: 0.1,
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
                  opacity: isSelected ? 0.25 : 0.1,
                })
              );
              group.add(glowSphere);

              return group;
            }}
            linkThreeObject={(link: any) => {
              const material = new THREE.LineBasicMaterial({
                color: 0xEF4444,
                transparent: true,
                opacity: 0.15,
              });
              const geometry = new THREE.BufferGeometry();
              const positions = new Float32Array([
                link.source.x || 0, link.source.y || 0, link.source.z || 0,
                link.target.x || 0, link.target.y || 0, link.target.z || 0,
              ]);
              geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
              return new THREE.Line(geometry, material);
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
