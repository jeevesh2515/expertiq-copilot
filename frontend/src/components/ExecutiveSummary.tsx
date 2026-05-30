import { useState } from "react";
import { Brain, FileText, Sparkles, ChevronDown, ChevronUp } from "@/components/icons";
import { cn } from "@/lib/utils";

interface ExecutiveSummaryProps {
  summary: string;
  processingTimeMs?: number;
  queryAnalysis?: Record<string, unknown>;
  onShowAll?: () => void;
}

export default function ExecutiveSummary({
  summary,
  processingTimeMs,
  queryAnalysis,
  onShowAll,
}: ExecutiveSummaryProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (!summary) return null;

  const handleClick = () => {
    setIsCollapsed(!isCollapsed);
    onShowAll?.();
  };

  return (
    <div
      onClick={handleClick}
      className="relative glass-card backdrop-blur-sm rounded-2xl border border-red-500/20 overflow-hidden shadow-lg red-glow cursor-pointer select-none hover:border-red-500/40 transition-all duration-300 group"
      id="executive-summary"
    >
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
      <div className="p-6 sm:p-8">
        <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20 flex-shrink-0">
              <Brain className="w-5 h-5 text-red-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-red-400" />
                AI Executive Summary
              </h3>
              <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mt-0.5">
                AI-Generated Evaluation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {processingTimeMs != null && (
              <div className="px-2.5 py-1 bg-zinc-800 border border-zinc-700 rounded-lg text-xs font-bold text-zinc-400 font-[family-name:var(--font-mono)] tracking-tight">
                {(processingTimeMs / 1000).toFixed(2)}s
              </div>
            )}
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-red-400 transition-colors flex items-center gap-1">
              {isCollapsed ? (
                <>
                  <span>Expand</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </>
              ) : (
                <>
                  <span>Collapse</span>
                  <ChevronUp className="w-3.5 h-3.5" />
                </>
              )}
            </div>
          </div>
        </div>

        <div className={cn(
          "overflow-hidden transition-all duration-500 ease-in-out",
          isCollapsed ? "max-h-0 opacity-0 mt-0" : "max-h-[1000px] opacity-100 mt-6"
        )}>
          <div className="relative pt-2">
            <div className="text-[15px] text-zinc-300 font-medium leading-relaxed break-words whitespace-pre-wrap">
              {summary}
            </div>
          </div>

          {queryAnalysis && (
            <div className="mt-5 pt-4 border-t border-zinc-800" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-zinc-500" />
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                  Query Intelligence Vectors
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(queryAnalysis.detected_industries) &&
                  queryAnalysis.detected_industries.map((ind) => (
                    <span
                      key={ind as string}
                      className="px-2.5 py-1 bg-red-500/10 text-red-300 rounded-lg text-xs font-bold border border-red-500/20"
                    >
                      {ind as string}
                    </span>
                  ))}
                {Array.isArray(queryAnalysis.key_topics) &&
                  queryAnalysis.key_topics.map((topic) => (
                    <span
                      key={topic as string}
                      className="px-2.5 py-1 bg-amber-500/10 text-amber-300 rounded-lg text-xs font-bold border border-amber-500/20"
                    >
                      {topic as string}
                    </span>
                  ))}
                {typeof queryAnalysis.intent === "string" && (
                  <span className="px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded-lg text-xs font-bold border border-zinc-700 flex items-center gap-1.5">
                    <span className="text-zinc-500 font-medium">Intent:</span> {queryAnalysis.intent}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
