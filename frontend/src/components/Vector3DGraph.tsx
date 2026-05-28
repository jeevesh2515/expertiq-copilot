"use client";

import { useMemo, useCallback, useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Network } from "@/components/icons";
import type { GraphData, GraphNode, GraphEdge } from "@/lib/api";
import * as THREE from 'three';

// Dynamically import ForceGraph3D to avoid SSR issues
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });

interface Vector3DGraphProps {
  data: GraphData;
  selectedId?: string | null;
}

const TYPE_STYLES: Record<string, { color: string; label: string }> = {
  expert: { color: "#10B981", label: "Expert" }, // Emerald
  company: { color: "#34D399", label: "Company" }, // Teal
  industry: { color: "#06B6D4", label: "Industry" }, // Cyan
  topic: { color: "#F59E0B", label: "Topic" }, // Amber
};

export default function Vector3DGraph({ data, selectedId }: Vector3DGraphProps) {
  const fgRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 420 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

    const graphData = useMemo(() => {
    const filteredNodes = selectedId 
        ? data.nodes.filter(n => n.id === selectedId || data.edges.some(e => (e.source === selectedId && e.target === n.id) || (e.target === selectedId && e.source === n.id)))
        : data.nodes;
    const filteredNodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = data.edges.filter(e => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target));
    
    return {
      nodes: filteredNodes.map((n) => ({ ...n, val: n.type === "expert" ? 5 : 2 })),
      links: filteredEdges.map((e) => ({ ...e, source: e.source, target: e.target })),
    };
  }, [data, selectedId]);

  // Handle graph ready to apply custom forces or camera position
  useEffect(() => {
    if (fgRef.current && graphData.nodes.length > 0) {
      // Zoom to fit
      setTimeout(() => {
        fgRef.current?.zoomToFit(400, 50);
      }, 1000);
    }
  }, [graphData]);

  if (!data.nodes.length) return null;

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white shadow-sm flex flex-col h-[500px]"
      id="vector-3d-graph"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
            <Network className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">3D Semantic Vector Space</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {data.nodes.length} dimensions · {data.edges.length} relationships
            </div>
          </div>
        </div>
        <div className="text-[10px] font-medium text-emerald-700 px-2 py-1 rounded-md bg-emerald-50 border border-emerald-200">
          Interactive 3D
        </div>
      </div>

      <div className="relative flex-1 bg-gray-50 overflow-hidden rounded-b-xl" ref={containerRef}>
        {dimensions.width > 0 && (
          <ForceGraph3D
            ref={fgRef}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeLabel="label"
            nodeColor={(node: any) => TYPE_STYLES[node.type]?.color || "#94A3B8"}
            nodeRelSize={6}
            linkColor={() => "rgba(0, 0, 0, 0.15)"}
            linkWidth={1}
            backgroundColor="#F9FAFB"
            showNavInfo={false}
            enableNodeDrag={true}
            enableNavigationControls={true}
          />
        )}
        
        {/* Overlay Legend */}
        <div className="absolute bottom-4 left-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 pointer-events-none z-10 w-[calc(100%-2rem)]">
          {Object.entries(TYPE_STYLES).map(([type, style]) => (
            <div
              key={type}
              className="flex items-center justify-between rounded-lg border border-gray-200 bg-white/80 backdrop-blur-md px-3 py-2 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: style.color }}
                />
                <span className="text-gray-700 font-medium">{style.label}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
