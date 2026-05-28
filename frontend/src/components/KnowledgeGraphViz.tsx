"use client";

import { memo, useMemo } from "react";
import { Network } from "@/components/icons";
import type { GraphData, GraphNode } from "@/lib/api";

interface KnowledgeGraphVizProps {
  data: GraphData;
  selectedId?: string | null;
}

const TYPE_STYLES: Record<string, { fill: string; stroke: string; label: string }> = {
  expert: { fill: "#10B981", stroke: "#059669", label: "Expert" }, // Emerald
  company: { fill: "#34D399", stroke: "#10B981", label: "Company" }, // Teal
  industry: { fill: "#06B6D4", stroke: "#0891B2", label: "Industry" }, // Cyan
  topic: { fill: "#F59E0B", stroke: "#D97706", label: "Topic" }, // Amber
};

const TYPE_ORDER = ["industry", "company", "expert", "topic"];
const TYPE_LIMITS: Record<string, number> = {
  industry: 5,
  company: 6,
  expert: 8,
  topic: 5,
};

function truncate(label: string, max = 18): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function KnowledgeGraphViz({ data, selectedId }: KnowledgeGraphVizProps) {
  if (!data.nodes.length) return null;

  const { nodesByType, visibleNodes, visibleEdges, layout } = useMemo(() => {
    const byType = new Map<string, GraphNode[]>();
    for (const type of TYPE_ORDER) byType.set(type, []);

    const filteredNodes = selectedId 
        ? data.nodes.filter(n => n.id === selectedId || data.edges.some(e => (e.source === selectedId && e.target === n.id) || (e.target === selectedId && e.source === n.id)))
        : data.nodes;

    for (const node of filteredNodes) {
      const list = byType.get(node.type);
      if (!list) continue;
      if (list.length < (TYPE_LIMITS[node.type] || 6)) {
        list.push(node);
      }
    }

    const nodes = TYPE_ORDER.flatMap((type) => byType.get(type) || []);
    const visibleIds = new Set(nodes.map((node) => node.id));
    const edges = data.edges
      .filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target))
      .slice(0, 40);

    const graphLayout = new Map<string, { x: number; y: number }>();
    const columns = [140, 360, 620, 860];
    const viewHeight = 420;

    TYPE_ORDER.forEach((type, columnIndex) => {
      const list = byType.get(type) || [];
      const verticalGap = viewHeight / (list.length + 1 || 1);
      list.forEach((node, index) => {
        graphLayout.set(node.id, {
          x: columns[columnIndex],
          y: verticalGap * (index + 1),
        });
      });
    });

    return { nodesByType: byType, visibleNodes: nodes, visibleEdges: edges, layout: graphLayout };
  }, [data.edges, data.nodes, selectedId]);
  const columns = [140, 360, 620, 860];

  return (
    <div
      className="rounded-xl border border-gray-200 bg-white shadow-sm"
      id="knowledge-graph"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
            <Network className="w-4 h-4 text-emerald-600" />
          </div>
          <div>
            <div className="text-sm font-bold text-gray-900">Knowledge Graph</div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {data.nodes.length} nodes · {data.edges.length} edges
            </div>
          </div>
        </div>
        <div className="text-[10px] font-medium text-gray-500 px-2 py-1 rounded-md bg-gray-50 border border-gray-200">
          Static lite mode
        </div>
      </div>

      <div className="p-4">
        <svg
          viewBox="0 0 1000 420"
          className="w-full h-auto rounded-lg border border-gray-200 bg-gray-50 shadow-inner"
          aria-label="Knowledge graph overview"
        >
          {TYPE_ORDER.map((type, index) => (
            <g key={type}>
              <text
                x={columns[index]}
                y="24"
                textAnchor="middle"
                fill="#6B7280"
                fontSize="12"
                fontWeight="700"
              >
                {TYPE_STYLES[type]?.label || type}
              </text>
            </g>
          ))}

          {visibleEdges.map((edge, index) => {
            const source = layout.get(edge.source);
            const target = layout.get(edge.target);
            if (!source || !target) return null;

            return (
              <line
                key={`${edge.source}-${edge.target}-${index}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke="rgba(0, 0, 0, 0.1)"
                strokeWidth="1"
              />
            );
          })}

          {visibleNodes.map((node) => {
            const pos = layout.get(node.id);
            if (!pos) return null;
            const style = TYPE_STYLES[node.type] || TYPE_STYLES.topic;

            return (
              <g key={node.id}>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="10"
                  fill={style.fill}
                  stroke={style.stroke}
                  strokeWidth="2"
                />
                <text
                  x={pos.x}
                  y={pos.y + 24}
                  textAnchor="middle"
                  fill="#4B5563"
                  fontSize="10"
                  fontWeight="600"
                >
                  {truncate(node.label)}
                </text>
              </g>
            );
          })}
        </svg>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {TYPE_ORDER.map((type) => {
            const style = TYPE_STYLES[type] || TYPE_STYLES.topic;
            const count = nodesByType.get(type)?.length || 0;
            return (
              <div
                key={type}
                className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: style.fill }}
                  />
                  <span className="text-gray-600 font-bold">{style.label}</span>
                </div>
                <span className="font-bold text-gray-900">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default memo(KnowledgeGraphViz);
