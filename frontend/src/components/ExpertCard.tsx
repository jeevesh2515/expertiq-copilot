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

function getMatchScoreColor(score: number) {
  if (score >= 80) return { text: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" };
  if (score >= 60) return { text: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" };
  return { text: "text-zinc-400", bg: "bg-zinc-800", border: "border-zinc-700" };
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
        "group relative rounded-2xl border bg-zinc-900/80 shadow-lg backdrop-blur-sm",
        "border-zinc-800 hover:border-red-500/40 hover:shadow-xl hover:-translate-y-[2px]",
        "transition-all duration-300"
      )}
      id={`expert-card-${expert.id}`}
    >
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleBookmark}
          disabled={bookmarkLoading}
          className={cn(
            "p-2 rounded-xl border transition-all duration-200",
            bookmarked
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10",
            bookmarkLoading ? "opacity-50 cursor-wait" : "cursor-pointer"
          )}
          title={bookmarked ? "Remove bookmark" : "Bookmark expert"}
          id={`bookmark-${expert.id}`}
        >
          <Heart className={cn("w-4 h-4", bookmarked && "fill-red-400")} />
        </button>
      </div>

      <div className="p-5 sm:p-6">
        {rank != null && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-700">
              Rank #{rank}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-5 flex-wrap pr-12">
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

          {vectorScore !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 flex-shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Semantic</span>
              <span className="text-sm font-bold text-amber-300">
                {vectorScore.toFixed(1)}
              </span>
            </div>
          )}

          {llmScore !== null && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 flex-shrink-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">AI Judge</span>
              <span className="text-sm font-bold text-red-300">
                {Math.round(llmScore)}<span className="text-red-400/60 text-xs">/10</span>
              </span>
            </div>
          )}

          {matchScore === null && vectorScore === null && llmScore === null && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-800 border border-zinc-700">
              <BookmarkIcon className="w-4 h-4 text-zinc-500" />
              <span className="text-xs font-medium text-zinc-400">No scores available</span>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight truncate group-hover:text-red-300 transition-colors">
            {expert.name}
          </h3>
          <p className="text-sm font-medium text-zinc-400 flex items-center gap-1.5 mt-1">
            <GraduationCap className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <span className="truncate">{expert.title}</span>
          </p>
          <p className="text-sm text-zinc-400 flex items-center gap-1.5 mt-1 flex-wrap">
            <Building2 className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <span className="text-zinc-200 font-semibold">{expert.company}</span>
            {expert.industry && (
              <>
                <span className="text-zinc-600">·</span>
                <span>{expert.industry}</span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-3 sm:mt-4">
          {expert.seniority && (
            <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 bg-zinc-800 text-zinc-300 rounded-lg text-xs font-bold border border-zinc-700">
              <Star className="w-3.5 h-3.5 text-red-400" />
              {expert.seniority}
            </span>
          )}
          {expert.years_experience != null && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 bg-zinc-800 px-2.5 sm:px-3 py-1 rounded-lg border border-zinc-700">
              {expert.years_experience} yrs exp
            </span>
          )}
          {expert.availability && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-bold border",
                expert.availability === "available"
                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  : "text-amber-400 bg-amber-500/10 border-amber-500/20"
              )}
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full animate-pulse-soft",
                  expert.availability === "available" ? "bg-emerald-400" : "bg-amber-400"
                )}
              />
              {expert.availability}
            </span>
          )}
        </div>

        {expert.topics && expert.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-3 sm:mt-4">
            {expert.topics.slice(0, expanded ? undefined : 4).map((topic) => (
              <span
                key={topic}
                className="px-2 sm:px-2.5 py-0.5 sm:py-1 bg-red-500/10 text-red-300 rounded-lg text-xs font-medium border border-red-500/20 hover:bg-red-500/20 transition-colors"
              >
                {topic}
              </span>
            ))}
            {!expanded && expert.topics.length > 4 && (
              <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-zinc-400 font-semibold text-xs bg-zinc-800 rounded-lg border border-zinc-700">
                +{expert.topics.length - 4} more
              </span>
            )}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-3">
            {expert.publications && expert.publications.length > 0 && expert.publications[0].startsWith('http') ? (
              <a
                href={expert.publications[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] font-semibold transition-all bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-5 py-2 rounded-full shadow-lg shadow-red-500/20"
                onClick={(e) => e.stopPropagation()}
              >
                View Research
              </a>
            ) : (
              <button
                className="text-[13px] font-semibold transition-all bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-5 py-2 rounded-full shadow-lg shadow-red-500/20"
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
                  expanded
                    ? "bg-red-500/10 text-red-300 border-red-500/20"
                    : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-600"
                )}
                id={`reasoning-toggle-${expert.id}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
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
              <div className="p-3 sm:p-4 bg-red-500/5 rounded-xl border border-red-500/10">
                <p className="text-sm text-zinc-300 font-medium leading-relaxed break-words">
                  {expert.ai_reasoning}
                </p>
              </div>
            </div>
          )}
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-zinc-800 animate-fade-in">
            {expert.bio && (
              <>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  Biography
                </h4>
                <p className="text-sm text-zinc-300 font-medium leading-relaxed mb-4 break-words">
                  {expert.bio}
                </p>
              </>
            )}

            {expert.publications && expert.publications.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  Key Publications
                </h4>
                <div className="bg-zinc-800 border border-zinc-700 rounded-xl p-3">
                  <ul className="space-y-2">
                    {expert.publications.map((pub, i) => (
                      <li key={i} className="text-sm text-zinc-300 font-medium pl-3 border-l-2 border-red-500/30 break-words">
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
