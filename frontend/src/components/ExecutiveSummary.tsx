"use client";

import { Brain, FileText } from "@/components/icons";

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
    <div
      className="relative bg-white rounded-[24px] border border-emerald-100 overflow-hidden shadow-sm"
      id="executive-summary"
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start sm:items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 flex-shrink-0">
              <Brain className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <span className="text-emerald-600">✦</span>
                AI Executive Summary
              </h3>
              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest mt-0.5">
                AI-Generated Evaluation
              </p>
            </div>
          </div>
          {processingTimeMs != null && (
            <div className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-500 font-[family-name:var(--font-mono)] tracking-tight flex-shrink-0">
              {(processingTimeMs / 1000).toFixed(2)}s
            </div>
          )}
        </div>

        <div className="relative pt-2">
          <div className="text-[15px] text-gray-700 font-medium leading-relaxed break-words whitespace-pre-wrap">
            {summary}
          </div>
        </div>

        {queryAnalysis && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Query Intelligence Vectors
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(queryAnalysis.detected_industries) &&
                queryAnalysis.detected_industries.map((ind) => (
                  <span
                    key={ind as string}
                    className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200"
                  >
                    {ind as string}
                  </span>
                ))}
              {Array.isArray(queryAnalysis.key_topics) &&
                queryAnalysis.key_topics.map((topic) => (
                  <span
                    key={topic as string}
                    className="px-2.5 py-1 bg-teal-50 text-teal-700 rounded-lg text-xs font-bold border border-teal-200"
                  >
                    {topic as string}
                  </span>
                ))}
              {typeof queryAnalysis.intent === "string" && (
                <span className="px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold border border-gray-200 flex items-center gap-1.5">
                  <span className="text-gray-400 font-medium">Intent:</span> {queryAnalysis.intent}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
