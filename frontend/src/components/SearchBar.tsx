"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Sparkles, Loader2, SlidersHorizontal, X } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string, filters?: Record<string, string>) => void;
  isLoading?: boolean;
}

const INDUSTRIES = ["FinTech", "HealthTech", "Climate Tech", "EdTech", "RegTech"];
const SENIORITIES = ["C-Suite", "VP", "Director", "Partner", "Professor"];
const AVAILABILITIES = ["available", "limited"];

export default function SearchBar({ onSearch, isLoading = false }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [industry, setIndustry] = useState("");
  const [seniority, setSeniority] = useState("");
  const [availability, setAvailability] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || query.trim().length < 3) return;

    const filters: Record<string, string> = {};
    if (industry) filters.industry = industry;
    if (seniority) filters.seniority = seniority;
    if (availability) filters.availability = availability;

    onSearch(query.trim(), Object.keys(filters).length > 0 ? filters : undefined);
  };

  const clearFilters = () => {
    setIndustry("");
    setSeniority("");
    setAvailability("");
  };

  const activeFilterCount = [industry, seniority, availability].filter(Boolean).length;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        {/* Main Search Input */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-blue-600/20 to-cyan-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-60 group-hover:opacity-100" />
          <div className="relative flex items-center bg-white/[0.07] backdrop-blur-xl border border-white/[0.12] rounded-2xl shadow-2xl shadow-black/20 hover:border-white/[0.2] transition-all duration-300">
            <div className="pl-5 pr-2">
              <Search className="w-5 h-5 text-violet-400" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find experts in semiconductor supply chain with buy-side banking experience..."
              className="flex-1 bg-transparent text-white placeholder-white/30 py-4 px-2 text-base outline-none"
              disabled={isLoading}
              maxLength={500}
            />
            <div className="flex items-center gap-2 pr-3">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`relative p-2 rounded-xl transition-all duration-200 ${
                  showFilters || activeFilterCount > 0
                    ? "bg-violet-500/20 text-violet-400"
                    : "text-white/40 hover:text-white/70 hover:bg-white/[0.05]"
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-violet-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button
                type="submit"
                disabled={isLoading || !query.trim() || query.trim().length < 3}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white rounded-xl font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-violet-500/25"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-3 p-4 bg-white/[0.05] backdrop-blur-xl border border-white/[0.1] rounded-xl animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-white/60">Filters</span>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50 transition-colors appearance-none"
                >
                  <option value="">All Industries</option>
                  {INDUSTRIES.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Seniority</label>
                <select
                  value={seniority}
                  onChange={(e) => setSeniority(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50 transition-colors appearance-none"
                >
                  <option value="">All Levels</option>
                  {SENIORITIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-white/40 mb-1.5">Availability</label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50 transition-colors appearance-none"
                >
                  <option value="">Any</option>
                  {AVAILABILITIES.map((a) => (
                    <option key={a} value={a}>
                      {a.charAt(0).toUpperCase() + a.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
