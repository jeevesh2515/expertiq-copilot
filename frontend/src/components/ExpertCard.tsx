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
  if (score >= 80) return "from-emerald-400 to-green-500";
  if (score >= 60) return "from-blue-400 to-cyan-500";
  if (score >= 40) return "from-amber-400 to-orange-500";
  return "from-red-400 to-rose-500";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500/10 border-emerald-500/20";
  if (score >= 60) return "bg-blue-500/10 border-blue-500/20";
  if (score >= 40) return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-500/10 border-red-500/20";
}

function getAvailabilityStyle(availability: string): { color: string; dot: string } {
  if (availability === "available") {
    return { color: "text-emerald-400", dot: "bg-emerald-400" };
  }
  return { color: "text-amber-400", dot: "bg-amber-400" };
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
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${
              rank === 1
                ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-black"
                : rank === 2
                ? "bg-gradient-to-br from-slate-300 to-gray-400 text-black"
                : "bg-gradient-to-br from-amber-700 to-orange-800 text-white"
            }`}
          >
            {rank}
          </div>
        </div>
      )}

      <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-xl p-5 hover:bg-white/[0.07] hover:border-white/[0.15] transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-white truncate">
                {expert.name}
              </h3>
              <div className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${availStyle.dot} animate-pulse`} />
                <span className={`text-xs ${availStyle.color}`}>
                  {expert.availability}
                </span>
              </div>
            </div>
            <p className="text-sm text-white/50 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{expert.title}</span>
            </p>
            <p className="text-sm text-white/40 flex items-center gap-1.5 mt-0.5">
              <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{expert.company}</span>
              <span className="text-white/20">·</span>
              <span>{expert.industry}</span>
            </p>
          </div>

          {/* Score Badge */}
          <div className={`flex-shrink-0 ${scoreBg} border rounded-xl px-3 py-2 text-center`}>
            <div className={`text-2xl font-bold bg-gradient-to-r ${scoreColor} bg-clip-text text-transparent`}>
              {Math.round(expert.match_score)}
            </div>
            <div className="text-[10px] text-white/40 uppercase tracking-wider">match</div>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-500/10 text-violet-400 rounded-lg text-xs font-medium border border-violet-500/20">
            <Star className="w-3 h-3" />
            {expert.seniority}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-white/40">
            <Clock className="w-3 h-3" />
            {expert.years_experience} yrs experience
          </span>
          {expert.llm_score && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs border border-blue-500/20">
              <TrendingUp className="w-3 h-3" />
              AI Score: {expert.llm_score}/10
            </span>
          )}
        </div>

        {/* Topics */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {expert.topics.slice(0, expanded ? undefined : 4).map((topic) => (
            <span
              key={topic}
              className="px-2 py-0.5 bg-white/[0.06] text-white/50 rounded-md text-xs border border-white/[0.06] hover:bg-white/[0.1] hover:text-white/70 transition-colors"
            >
              {topic}
            </span>
          ))}
          {!expanded && expert.topics.length > 4 && (
            <span className="px-2 py-0.5 text-white/30 text-xs">
              +{expert.topics.length - 4} more
            </span>
          )}
        </div>

        {/* AI Reasoning */}
        {expert.ai_reasoning && (
          <div className="mt-3 p-3 bg-gradient-to-r from-violet-500/[0.06] to-blue-500/[0.06] rounded-lg border border-violet-500/10">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3 h-3 text-violet-400" />
              <span className="text-[10px] uppercase tracking-wider text-violet-400 font-medium">
                AI Analysis
              </span>
            </div>
            <p className="text-sm text-white/60 leading-relaxed">
              {expert.ai_reasoning}
            </p>
          </div>
        )}

        {/* Expandable bio */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-3 text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" /> Show full profile
            </>
          )}
        </button>

        {expanded && (
          <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
            <p className="text-sm text-white/50 leading-relaxed">{expert.bio}</p>
            {expert.publications.length > 0 && (
              <div className="mt-3">
                <h4 className="text-xs uppercase tracking-wider text-white/30 mb-2">
                  Key Publications
                </h4>
                <ul className="space-y-1">
                  {expert.publications.map((pub, i) => (
                    <li key={i} className="text-xs text-white/40 pl-3 border-l border-white/10">
                      {pub}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
