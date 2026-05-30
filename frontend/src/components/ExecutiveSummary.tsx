import { Brain, FileText, Sparkles } from "@/components/icons";

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
  if (!summary) return null;

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-red-500/20 bg-zinc-950/90 shadow-md shadow-red-950/10 backdrop-blur-sm transition-all duration-300"
      id="executive-summary"
    >
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-40" />
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 bg-red-500/10 rounded-lg border border-red-500/20 flex-shrink-0">
              <Brain className="w-4 h-4 text-red-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-bold text-zinc-100 tracking-tight flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-red-400" />
                AI Executive Summary
              </h3>
              <p className="text-[8px] text-red-400 font-bold uppercase tracking-widest mt-0">
                AI-Generated Evaluation
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {processingTimeMs != null && (
              <div className="px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-md text-[10px] font-bold text-zinc-400 font-[family-name:var(--font-mono)] tracking-tight">
                {(processingTimeMs / 1000).toFixed(2)}s
              </div>
            )}
            {onShowAll && (
              <button
                type="button"
                onClick={onShowAll}
                className="hidden rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-zinc-400 transition hover:border-red-500/30 hover:text-red-300 sm:inline-flex"
              >
                Show all
              </button>
            )}
          </div>
        </div>

        <div className="mt-3 overflow-hidden">
          <div className="text-[13px] text-zinc-200 font-medium leading-relaxed break-words whitespace-pre-wrap sm:text-[14px]">
            {summary}
          </div>

          {queryAnalysis && (
            <div className="mt-3 pt-3 border-t border-zinc-800">
              <div className="flex items-center gap-1.5 mb-2">
                <FileText className="w-3 h-3 text-zinc-500" />
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                  Query Intelligence
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Array.isArray(queryAnalysis.detected_industries) &&
                  queryAnalysis.detected_industries.map((ind) => (
                    <span
                      key={ind as string}
                      className="px-2 py-0.5 bg-red-500/10 text-red-300 rounded-md text-[10px] font-bold border border-red-500/20"
                    >
                      {ind as string}
                    </span>
                  ))}
                {Array.isArray(queryAnalysis.key_topics) &&
                  queryAnalysis.key_topics.map((topic) => (
                    <span
                      key={topic as string}
                      className="px-2 py-0.5 bg-amber-500/10 text-amber-300 rounded-md text-[10px] font-bold border border-amber-500/20"
                    >
                      {topic as string}
                    </span>
                  ))}
                {typeof queryAnalysis.intent === "string" && (
                  <span className="px-2 py-0.5 bg-zinc-900 text-zinc-300 rounded-md text-[10px] font-bold border border-zinc-700 flex items-center gap-1">
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
