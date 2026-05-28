"use client";

/**
 * Skeleton loading cards displayed while search is in progress.
 * Shows 3 animated pulse cards matching ExpertCard dimensions.
 */
export default function SkeletonCards() {
  return (
    <div className="space-y-4 animate-stagger">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6 animate-pulse"
        >
          {/* Score badges row skeleton */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-16 h-16 rounded-full skeleton" />
            <div className="h-8 w-24 skeleton rounded-xl" />
            <div className="h-8 w-24 skeleton rounded-xl" />
          </div>

          {/* Name skeleton */}
          <div className="h-5 w-48 skeleton rounded-lg mb-3" />

          {/* Title skeleton */}
          <div className="h-4 w-64 skeleton rounded-lg mb-2" />

          {/* Company skeleton */}
          <div className="h-4 w-40 skeleton rounded-lg mb-4" />

          {/* Meta row skeleton */}
          <div className="flex gap-2 mb-4">
            <div className="h-7 w-20 skeleton rounded-lg" />
            <div className="h-7 w-24 skeleton rounded-lg" />
            <div className="h-7 w-20 skeleton rounded-lg" />
          </div>

          {/* Topics skeleton */}
          <div className="flex gap-2">
            <div className="h-6 w-24 skeleton rounded-lg" />
            <div className="h-6 w-20 skeleton rounded-lg" />
            <div className="h-6 w-28 skeleton rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
