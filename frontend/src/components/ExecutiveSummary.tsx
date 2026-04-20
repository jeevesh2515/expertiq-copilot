"use client";

import { Sparkles, FileText, Brain } from "lucide-react";

import ReactMarkdown from "react-markdown";

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
    <div className="relative overflow-hidden bg-white border border-stone-200 rounded-3xl shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* Decorative top bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400" />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
              <Brain className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 tracking-tight">Executive Summary</h3>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-0.5">
                AI-Generated Evaluation
              </p>
            </div>
          </div>
          {processingTimeMs && (
            <div className="px-2.5 py-1 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-400 font-mono tracking-tight shadow-sm">
              {(processingTimeMs / 1000).toFixed(2)}s
            </div>
          )}
        </div>

        {/* Summary text */}
        <div className="relative pl-5 border-l-2 border-emerald-200">
          <Sparkles className="absolute -left-[11px] top-0.5 w-5 h-5 text-emerald-500 bg-white p-0.5 shadow-sm rounded-full border border-emerald-100" />
          <div className="text-sm text-stone-700 font-medium leading-relaxed prose prose-stone max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0.5">
            <ReactMarkdown>{summary}</ReactMarkdown>
          </div>
        </div>

        {/* Query Analysis Chips */}
        {queryAnalysis && (
          <div className="mt-6 pt-5 border-t border-stone-100">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-stone-400" />
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                Query Intelligence Vectors
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(queryAnalysis.detected_industries) &&
                queryAnalysis.detected_industries.map((ind) => (
                  <span
                    key={ind as string}
                    className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-100 shadow-sm"
                  >
                    {ind as string}
                  </span>
                ))}
              {Array.isArray(queryAnalysis.key_topics) &&
                queryAnalysis.key_topics.map((topic) => (
                  <span
                    key={topic as string}
                    className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold border border-amber-100 shadow-sm"
                  >
                    {topic as string}
                  </span>
                ))}
              {typeof queryAnalysis.intent === "string" && (
                <span className="px-2.5 py-1 bg-stone-50 text-stone-600 rounded-lg text-xs font-bold border border-stone-200 shadow-sm flex items-center gap-1.5">
                  <span className="text-stone-400 font-medium">Intent:</span> {queryAnalysis.intent}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
