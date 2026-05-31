"use client";

import { memo, useEffect, useMemo, useState } from "react";
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
  onNotification?: (message: string, type: "success" | "error") => void;
  onBookmarkToggle?: (expertId: string, bookmarked: boolean) => void;
}

/* Radial score ring (tiny SVG donut) */
function ScoreRing({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const size = 36;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(value / max, 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex flex-col items-center gap-0.5 group/ring">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(63, 63, 70, 0.5)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
        />
      </svg>
      <span className="text-[9px] font-black uppercase tracking-wider text-zinc-500 group-hover/ring:text-zinc-300 transition-colors">{label}</span>
    </div>
  );
}

function getMatchTier(score: number): "high" | "mid" | "low" {
  if (score >= 80) return "high";
  if (score >= 60) return "mid";
  return "low";
}

const TIER_ACCENT = {
  high: "from-red-500 to-red-400",
  mid: "from-amber-500 to-amber-400",
  low: "from-zinc-600 to-zinc-500",
};

function ExpertCard({ expert, rank, initBookmarked, onNotification, onBookmarkToggle }: ExpertCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [bookmarked, setBookmarked] = useState(initBookmarked || false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);

  useEffect(() => {
    setBookmarked(initBookmarked || false);
  }, [initBookmarked]);

  const matchScore = typeof expert.match_score === "number" ? expert.match_score : null;
  const vectorScore = typeof expert.vector_score === "number" ? expert.vector_score : null;
  const llmScore = typeof expert.llm_score === "number" ? expert.llm_score : null;
  const tier = useMemo(() => matchScore !== null ? getMatchTier(matchScore) : "low", [matchScore]);

  const handleBookmark = async () => {
    setBookmarkLoading(true);
    try {
      if (bookmarked) {
        await removeBookmark(expert.id);
        setBookmarked(false);
        onBookmarkToggle?.(expert.id, false);
        onNotification?.("Expert removed from saved shortlists.", "success");
      } else {
        await addBookmark(expert.id);
        setBookmarked(true);
        onBookmarkToggle?.(expert.id, true);
        onNotification?.("Expert saved to shortlists successfully!", "success");
      }
    } catch (err: any) {
      console.error("Bookmark error:", err);
      onNotification?.(err.message || "Failed to save expert. Please check your connection.", "error");
    } finally {
      setBookmarkLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-zinc-800/85 bg-zinc-950/88 shadow-md backdrop-blur-sm overflow-hidden",
        "hover:border-red-500/30 hover:bg-zinc-950 hover:shadow-lg hover:shadow-red-500/5",
        "transition-all duration-300"
      )}
      id={`expert-card-${expert.id}`}
    >
      {/* Left accent bar — indicates match tier */}
      <div className={cn("absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b", TIER_ACCENT[tier])} />

      {/* Bookmark button */}
      <div className="absolute top-3 right-3 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleBookmark();
          }}
          disabled={bookmarkLoading}
          className={cn(
            "p-1.5 rounded-lg border transition-all duration-200",
            bookmarked
              ? "bg-red-500/10 border-red-500/20 text-red-400"
              : "bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10",
            bookmarkLoading ? "opacity-50 cursor-wait" : "cursor-pointer"
          )}
          title={bookmarked ? "Remove bookmark" : "Bookmark expert"}
          id={`bookmark-${expert.id}`}
        >
          <Heart className={cn("w-3.5 h-3.5", bookmarked && "fill-red-400")} />
        </button>
      </div>

      <div className="pl-4 pr-3 py-3 sm:pl-5 sm:pr-4 sm:py-4">
        {/* Top row: Rank + Score Rings */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {rank != null && (
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-900 px-1.5 py-0.5 rounded-md border border-zinc-700 shrink-0">
                #{rank}
              </span>
            )}
            <div className="min-w-0">
              <h3 className="text-sm sm:text-[15px] font-bold text-zinc-100 tracking-tight truncate group-hover:text-red-300 transition-colors leading-tight">
                {expert.name}
              </h3>
              <p className="text-xs text-zinc-400 flex items-center gap-1 mt-0.5 truncate">
                <GraduationCap className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                <span className="truncate">{expert.title}</span>
              </p>
            </div>
          </div>

          {/* Score rings cluster */}
          <div className="flex items-center gap-2 shrink-0 pr-6">
            {matchScore !== null && (
              <div className="relative">
                <ScoreRing value={matchScore} max={100} color="#EF4444" label="Match" />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-zinc-100 -mt-2">
                  {Math.round(matchScore)}
                </span>
              </div>
            )}
            {vectorScore !== null && (
              <div className="relative hidden sm:block">
                <ScoreRing value={vectorScore * 10} max={100} color="#F59E0B" label="Semantic" />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-zinc-100 -mt-2">
                  {vectorScore.toFixed(1)}
                </span>
              </div>
            )}
            {llmScore !== null && (
              <div className="relative hidden sm:block">
                <ScoreRing value={llmScore * 10} max={100} color="#A78BFA" label="AI" />
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-zinc-100 -mt-2">
                  {Math.round(llmScore)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Company + Industry */}
        <p className="text-xs text-zinc-400 flex items-center gap-1.5 flex-wrap">
          <Building2 className="w-3 h-3 text-zinc-500 flex-shrink-0" />
          <span className="text-zinc-100 font-semibold">{expert.company}</span>
          {expert.industry && (
            <>
              <span className="text-zinc-600">·</span>
              <span>{expert.industry}</span>
            </>
          )}
        </p>

        {/* Tags row: Seniority + Experience + Availability */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {expert.seniority && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-900 text-zinc-300 rounded-md text-[10px] font-bold border border-zinc-700">
              <Star className="w-3 h-3 text-red-400" />
              {expert.seniority}
            </span>
          )}
          {expert.years_experience != null && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-300 bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-700">
              {expert.years_experience} yrs
            </span>
          )}
          {expert.availability && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border",
                expert.availability === "available"
                  ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                  : "text-amber-400 bg-amber-500/10 border-amber-500/20"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full animate-pulse-soft",
                  expert.availability === "available" ? "bg-emerald-400" : "bg-amber-400"
                )}
              />
              {expert.availability}
            </span>
          )}
        </div>

        {/* Topics */}
        {expert.topics && expert.topics.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {expert.topics.slice(0, expanded ? undefined : 3).map((topic) => (
              <span
                key={topic}
                className="px-1.5 py-0.5 bg-red-500/8 text-red-300 rounded-md text-[10px] font-medium border border-red-500/15 hover:bg-red-500/15 transition-colors"
              >
                {topic}
              </span>
            ))}
            {!expanded && expert.topics.length > 3 && (
              <span className="px-1.5 py-0.5 text-zinc-400 font-semibold text-[10px] bg-zinc-900 rounded-md border border-zinc-700">
                +{expert.topics.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Actions row */}
        <div className="mt-3 pt-2.5 border-t border-zinc-800/60">
          <div className="flex items-center gap-2">
            {expert.publications && expert.publications.length > 0 && expert.publications[0].startsWith('http') ? (
              <a
                href={expert.publications[0]}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-semibold transition-all bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-3.5 py-1.5 rounded-full shadow-md shadow-red-500/15"
                onClick={(e) => e.stopPropagation()}
              >
                View Research
              </a>
            ) : (
              <button
                className="text-[11px] font-semibold transition-all bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white px-3.5 py-1.5 rounded-full shadow-md shadow-red-500/15"
                onClick={(e) => { e.stopPropagation(); window.location.href = `mailto:connect@expertiq.ai?subject=Connect with ${encodeURIComponent(expert.name)}` }}
              >
                Connect
              </button>
            )}
            {expert.ai_reasoning && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                className={cn(
                  "flex items-center gap-1 text-[11px] font-semibold transition-colors",
                  "px-3 py-1.5 rounded-full border",
                  expanded
                    ? "bg-red-500/10 text-red-300 border-red-500/20"
                    : "bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-600"
                )}
                id={`reasoning-toggle-${expert.id}`}
              >
                <Sparkles className="w-3 h-3 text-red-400" />
                {expanded ? (
                  <>
                    <span>Hide</span>
                    <ChevronUp className="w-3 h-3" />
                  </>
                ) : (
                  <>
                    <span>AI Reasoning</span>
                    <ChevronDown className="w-3 h-3" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Expandable AI Reasoning */}
          {expert.ai_reasoning && (
            <div
              className={cn(
                "overflow-hidden transition-all duration-300 ease-in-out",
                expanded ? "max-h-[500px] opacity-100 mt-2.5" : "max-h-0 opacity-0"
              )}
            >
              <div className="p-3 bg-red-500/5 rounded-lg border border-red-500/10">
                <p className="text-xs text-zinc-300 font-medium leading-relaxed break-words">
                  {expert.ai_reasoning}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Expanded details */}
        {expanded && (
          <div 
            className="mt-3 pt-3 border-t border-zinc-800 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {expert.bio && (
              <>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Biography
                </h4>
                <p className="text-xs text-zinc-300 font-medium leading-relaxed mb-3 break-words">
                  {expert.bio}
                </p>
              </>
            )}

            {expert.publications && expert.publications.length > 0 && (
              <div>
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">
                  Publications
                </h4>
                <div className="bg-zinc-900/80 border border-zinc-700 rounded-lg p-2.5">
                  <ul className="space-y-1.5">
                    {expert.publications.map((pub, i) => (
                      <li key={i} className="text-xs text-zinc-300 font-medium pl-2.5 border-l-2 border-red-500/30 break-words">
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
