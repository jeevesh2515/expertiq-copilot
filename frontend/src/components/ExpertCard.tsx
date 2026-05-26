"use client";

import { memo, useMemo, useState } from "react";
import {
  Bookmark as BookmarkIcon,
  Building2,
  ChevronDown,
  ChevronUp,
  Heart,
  GraduationCap,
  Sparkles,
  Star,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import type { ExpertResult } from "@/lib/api";
import { addBookmark, removeBookmark } from "@/lib/api";

interface ExpertCardProps {
  expert: ExpertResult;
  rank?: number;
  initBookmarked?: boolean;
  onBookmarkToggle?: (expertId: string, bookmarked: boolean) => void;
}

/** Color-coded score badge colors based on thresholds */
function getMatchScoreColor(score: number) {
  if (score >= 80) return { text: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", shadow: "shadow-emerald-500/10" };
  if (score >= 60) return { text: "text-teal-600", bg: "bg-teal-50", border: "border-teal-200", shadow: "shadow-teal-500/10" };
  return { text: "text-gray-500", bg: "bg-gray-100", border: "border-gray-200", shadow: "shadow-gray-900/5" };
}

function ExpertCard({ expert, rank, initBookmarked, onBookmarkToggle }: ExpertCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [bookmarked, setBookmarked] = useState(initBookmarked || false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  const matchScore = typeof expert.match_score === "number" ? expert.match_score : null;
  const vectorScore = typeof expert.vector_score === "number" ? expert.vector_score : null;
  const llmScore = typeof expert.llm_score === "number" ? expert.llm_score : null;
  const matchColors = useMemo(
    () => (matchScore !== null ? getMatchScoreColor(matchScore) : null),
    [matchScore]
  );

  const handleBookmark = async () => {
    setBookmarkLoading(true);
    try {
      if (bookmarked) {
        await removeBookmark(expert.id);
        setBookmarked(false);
        onBookmarkToggle?.(expert.id, false);
      } else {
        await addBookmark(expert.id);
        setBookmarked(true);
        onBookmarkToggle?.(expert.id, true);
      }
    } catch (err) {
      console.error("Bookmark error:", err);
    } finally {
      setBookmarkLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-gray-200 bg-white shadow-sm",
        "hover:border-emerald-500/50 hover:shadow-md hover:-translate-y-[2px]",
        "transition-all duration-200"
      )}
      id={`expert-card-${expert.id}`}
    >
      {/* Bookmark Action */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleBookmark}
          disabled={bookmarkLoading}
          className={cn(
            "p-2 rounded-xl border transition-all duration-200",
            bookmarked
              ? "bg-rose-50 border-rose-200 text-rose-500"
              : "bg-gray-50 border-gray-200 text-gray-400 hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50",
            bookmarkLoading ? "opacity-50 cursor-wait" : "cursor-pointer"
          )}
          title={bookmarked ? "Remove bookmark" : "Bookmark expert"}
          id={`bookmark-${expert.id}`}
        >
          <Heart className={cn("w-4 h-4", bookmarked && "fill-rose-400")} />
        </button>
      </div>

      <div className="p-5 sm:p-6">
        {/* ── Score Badges Row — always visible at TOP ── */}
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5 flex-wrap pr-12">
          {/* Match Score */}
          {matchScore !== null && matchColors && (
            <div
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border",
                matchColors.bg, matchColors.border
              )}
            >
              <span className={cn("text-sm font-bold", matchColors.text)}>
                {Math.round(matchScore)}
              </span>
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", matchColors.text, "opacity-80")}>
                Match
              </span>
            </div>
          )}

          {/* Vector Score */}
          {vectorScore !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-100 flex-shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Semantic</span>
              <span className="text-sm font-bold text-teal-700">
                {vectorScore.toFixed(1)}
              </span>
            </div>
          )}

          {/* LLM Score */}
          {llmScore !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 flex-shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#059669]">AI Judge</span>
              <span className="text-sm font-bold text-[#047857]">
                {Math.round(llmScore)}<span className="text-emerald-600/60 text-xs">/10</span>
              </span>
            </div>
          )}

          {/* Fallback when no scores */}
          {matchScore === null && vectorScore === null && llmScore === null && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200">
              <BookmarkIcon className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-medium text-gray-500">No scores available</span>
            </div>
          )}
        </div>

        {/* ── Expert Info ── */}
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight truncate group-hover:text-emerald-700 transition-colors">
            {expert.name}
          </h3>
          <p className="text-sm font-medium text-gray-500 flex items-center gap-1.5 mt-1">
            <GraduationCap className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="truncate">{expert.title}</span>
          </p>
          <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-1 flex-wrap">
            <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-700 font-semibold">{expert.company}</span>
            {expert.industry && (
              <>
                <span className="text-gray-300">·</span>
                <span>{expert.industry}</span>
              </>
            )}
          </p>
        </div>

        {/* ── Meta row ── */}
        <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-4">
          {expert.seniority && (
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-xs font-bold border border-gray-200">
              <Star className="w-3.5 h-3.5 text-emerald-500" />
              {expert.seniority}
            </span>
          )}
          {expert.years_experience != null && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 px-2.5 sm:px-3 py-1 rounded-lg border border-gray-200">
              {expert.years_experience} yrs exp
            </span>
          )}
          {expert.availability && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold border",
                expert.availability === "available"
                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                  : "text-amber-700 bg-amber-50 border-amber-200"
              )}
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full animate-pulse-soft",
                  expert.availability === "available" ? "bg-emerald-500" : "bg-amber-500"
                )}
              />
              {expert.availability}
            </span>
          )}
        </div>

        {/* ── Topics ── */}
        {expert.topics && expert.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
            {expert.topics.slice(0, expanded ? undefined : 4).map((topic) => (
              <span
                key={topic}
                className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                {topic}
              </span>
            ))}
            {!expanded && expert.topics.length > 4 && (
              <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-gray-500 font-semibold text-xs bg-gray-50 rounded-lg border border-gray-200">
                +{expert.topics.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* ── Actions & AI Reasoning ── */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-3">
            {expert.publications && expert.publications.length > 0 && expert.publications[0].startsWith('http') ? (
              <a
                href={expert.publications[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-semibold transition-colors bg-[#059669] hover:bg-[#047857] text-white px-5 py-2 rounded-full shadow-sm"
                onClick={(e) => e.stopPropagation()}
              >
                View Research
              </a>
            ) : (
              <button
                className="text-[13px] font-semibold transition-colors bg-[#059669] hover:bg-[#047857] text-white px-5 py-2 rounded-full shadow-sm"
                onClick={(e) => { e.stopPropagation(); window.location.href = `mailto:connect@expertiq.ai?subject=Connect with ${encodeURIComponent(expert.name)}` }}
              >
                Request Connection
              </button>
            )}
            {expert.ai_reasoning && (
              <button
                onClick={() => setExpanded(!expanded)}
                className={cn(
                  "flex items-center gap-1.5 text-[13px] font-semibold transition-colors",
                  "px-4 py-2 rounded-full border",
                  expanded ? "bg-emerald-50 text-[#059669] border-emerald-100" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                )}
                id={`reasoning-toggle-${expert.id}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                {expanded ? (
                  <>
                    <span>Hide AI Reasoning</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>View AI Reasoning</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>

          {expert.ai_reasoning && (
            <div
              className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                expanded ? "max-h-[500px] opacity-100 mt-3" : "max-h-0 opacity-0"
              )}
            >
              <div className="p-3 sm:p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-sm text-gray-700 font-medium leading-relaxed break-words">
                  {expert.ai_reasoning}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Expanded Bio + Publications ── */}
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 animate-fade-in">
            {expert.bio && (
              <>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Biography
                </h4>
                <p className="text-sm text-gray-600 font-medium leading-relaxed mb-4 break-words">
                  {expert.bio}
                </p>
              </>
            )}

            {expert.publications && expert.publications.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Key Publications
                </h4>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <ul className="space-y-2">
                    {expert.publications.map((pub, i) => (
                      <li key={i} className="text-sm text-gray-600 font-medium pl-3 border-l-2 border-emerald-500/30 break-words">
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

export default memo(ExpertCard);
