"use client";

import {
  Building2,
  Clock,
  GraduationCap,
  Sparkles,
  Star,
  TrendingUp,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import type { ExpertResult } from "@/lib/api";

interface ExpertCardProps {
  expert: ExpertResult;
  rank: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-teal-600";
  if (score >= 40) return "text-amber-600";
  return "text-rose-600";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-50 border-emerald-200";
  if (score >= 60) return "bg-teal-50 border-teal-200";
  if (score >= 40) return "bg-amber-50 border-amber-200";
  return "bg-rose-50 border-rose-200";
}

function getAvailabilityStyle(availability: string): { color: string; dot: string } {
  if (availability === "available") {
    return { color: "text-emerald-700", dot: "bg-emerald-500" };
  }
  return { color: "text-amber-700", dot: "bg-amber-500" };
}

export default function ExpertCard({ expert, rank }: ExpertCardProps) {
  const [expanded, setExpanded] = useState(false);
  const scoreColor = getScoreColor(expert.match_score);
  const scoreBg = getScoreBg(expert.match_score);
  const availStyle = getAvailabilityStyle(expert.availability);

  return (
    <div className="group relative">
      {/* Rank badge */}
      {rank <= 3 && (
        <div className="absolute -top-3 -left-3 z-10">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black shadow-md border-2 border-white ${
              rank === 1
                ? "bg-amber-400 text-stone-900"
                : rank === 2
                ? "bg-stone-200 text-stone-700"
                : "bg-amber-600 text-white"
            }`}
          >
            {rank}
          </div>
        </div>
      )}

      <div className="bg-white border border-stone-200 rounded-3xl p-6 hover:border-stone-300 transition-all duration-300 shadow-sm hover:shadow-md">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1.5">
              <h3 className="text-xl font-bold text-stone-900 truncate tracking-tight">
                {expert.name}
              </h3>
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border bg-white ${availStyle.color === "text-emerald-700" ? "border-emerald-200" : "border-amber-200"} shadow-sm`}>
                <div className={`w-2 h-2 rounded-full ${availStyle.dot}`} />
                <span className={`text-[10px] uppercase font-bold tracking-wider ${availStyle.color}`}>
                  {expert.availability}
                </span>
              </div>
            </div>
            <p className="text-sm font-semibold text-stone-600 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-stone-400 flex-shrink-0" />
              <span className="truncate">{expert.title}</span>
            </p>
            <p className="text-sm font-medium text-stone-500 flex items-center gap-1.5 mt-1">
              <Building2 className="w-4 h-4 text-stone-400 flex-shrink-0" />
              <span className="text-stone-700 font-semibold">{expert.company}</span>
              <span className="text-stone-300">·</span>
              <span>{expert.industry}</span>
            </p>
          </div>

          {/* Score Badge */}
          <div className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-2xl border shadow-sm ${scoreBg}`}>
            <div className={`text-2xl font-black tracking-tighter ${scoreColor}`}>
              {Math.round(expert.match_score)}
            </div>
            <div className={`text-[9px] font-bold uppercase tracking-widest ${scoreColor} opacity-80 -mt-1`}>
              match
            </div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-100 text-stone-700 rounded-lg text-xs font-bold border border-stone-200 shadow-sm">
            <Star className="w-3.5 h-3.5 text-stone-500" />
            {expert.seniority}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 bg-stone-50 px-3 py-1 rounded-lg border border-stone-100 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            {expert.years_experience} yrs exp
          </span>
          {expert.llm_score && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-100 shadow-sm">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              AI Score: {expert.llm_score}/10
            </span>
          )}
        </div>

        {/* Topics */}
        <div className="flex flex-wrap gap-2 mt-4">
          {expert.topics.slice(0, expanded ? undefined : 4).map((topic) => (
            <span
              key={topic}
              className="px-2.5 py-1 bg-white text-stone-600 rounded-md text-xs font-medium border border-stone-200 shadow-sm hover:bg-stone-50 transition-colors"
            >
              {topic}
            </span>
          ))}
          {!expanded && expert.topics.length > 4 && (
            <span className="px-2.5 py-1 text-stone-400 font-semibold text-xs bg-stone-50 rounded-md border border-stone-100">
              +{expert.topics.length - 4} more
            </span>
          )}
        </div>

        {/* AI Reasoning */}
        {expert.ai_reasoning && (
          <div className="mt-5 p-4 bg-stone-50 rounded-2xl border border-stone-200 shadow-inner">
            <div className="flex items-center gap-1.5 mb-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                Agentic Evaluation
              </span>
            </div>
            <p className="text-sm text-stone-600 font-medium leading-relaxed">
              {expert.ai_reasoning}
            </p>
          </div>
        )}

        {/* Expandable bio */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 mt-4 text-xs font-bold text-stone-400 hover:text-stone-700 transition-colors bg-stone-50 hover:bg-stone-100 px-3 py-1.5 rounded-lg border border-transparent hover:border-stone-200"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> Collapse details
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> Expand full profile
            </>
          )}
        </button>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-stone-100 animate-in slide-in-from-top-2 duration-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
              Biography
            </h4>
            <p className="text-sm text-stone-600 font-medium leading-relaxed mb-4">{expert.bio}</p>
            
            {expert.publications.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
                  Key Publications
                </h4>
                <div className="bg-stone-50 border border-stone-100 rounded-xl p-3">
                  <ul className="space-y-2">
                    {expert.publications.map((pub, i) => (
                      <li key={i} className="text-sm text-stone-600 font-medium pl-3 border-l-2 border-stone-300">
                        {pub}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
