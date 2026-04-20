"use client";

import { Sparkles, FileText, Brain } from "lucide-react";

interface ExecutiveSummaryProps {
  summary: string;
  processingTimeMs?: number;
  queryAnalysis?: Record<string, unknown>;
}

export default function ExecutiveSummary({
  summary,
  processingTimeMs,
  queryAnalysis,
}: ExecutiveSummaryProps) {
  if (!summary) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-violet-500/[0.08] via-blue-500/[0.06] to-cyan-500/[0.04] backdrop-blur-md border border-violet-500/[0.15] rounded-xl">
      {/* Decorative gradient */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-violet-500/20 rounded-lg">
              <Brain className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Executive Summary</h3>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">
                AI-Generated Analysis
              </p>
            </div>
          </div>
          {processingTimeMs && (
            <div className="text-xs text-white/20">
              {(processingTimeMs / 1000).toFixed(1)}s
            </div>
          )}
        </div>

        {/* Summary text */}
        <div className="relative pl-4 border-l-2 border-violet-500/30">
          <Sparkles className="absolute -left-[9px] top-0 w-4 h-4 text-violet-400 bg-[#0c0a18] rounded-full" />
          <p className="text-sm text-white/70 leading-relaxed">{summary}</p>
        </div>

        {/* Query Analysis Chips */}
        {queryAnalysis && (
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-1.5 mb-2">
              <FileText className="w-3 h-3 text-white/30" />
              <span className="text-[10px] text-white/30 uppercase tracking-wider">
                Query Intelligence
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(queryAnalysis.detected_industries) &&
                queryAnalysis.detected_industries.map((ind) => (
                  <span
                    key={ind as string}
                    className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md text-xs border border-emerald-500/20"
                  >
                    {ind as string}
                  </span>
                ))}
              {Array.isArray(queryAnalysis.key_topics) &&
                queryAnalysis.key_topics.map((topic) => (
                  <span
                    key={topic as string}
                    className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md text-xs border border-blue-500/20"
                  >
                    {topic as string}
                  </span>
                ))}
              {typeof queryAnalysis.intent === "string" && (
                <span className="px-2 py-0.5 bg-white/[0.05] text-white/40 rounded-md text-xs border border-white/[0.08]">
                  Intent: {queryAnalysis.intent}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
