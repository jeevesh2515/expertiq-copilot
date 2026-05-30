"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Loader2,
  Search,
  SlidersHorizontal,
  X,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import type { SearchFilters } from "@/lib/api";

interface SearchBarProps {
  onSearch: (query: string, filters?: SearchFilters) => void;
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
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim() || query.trim().length < 3) return;

      const filters: SearchFilters = {};
      if (industry) filters.industry = industry;
      if (seniority) filters.seniority = seniority;
      if (availability) filters.availability = availability;

      onSearch(query.trim(), Object.keys(filters).length > 0 ? filters : undefined);
    },
    [query, industry, seniority, availability, onSearch]
  );

  const clearFilters = () => {
    setIndustry("");
    setSeniority("");
    setAvailability("");
  };

  const activeFilterCount = [industry, seniority, availability].filter(Boolean).length;

  return (
    <div className="w-full max-w-[800px] mx-auto relative z-20 flex flex-col items-center justify-center" id="search-bar">
      <form role="search" onSubmit={handleSubmit} className="relative w-full flex flex-col items-center justify-center">
        <div className="relative group max-w-[850px] mx-auto w-full">
          <div
            className={cn(
              "relative flex items-center rounded-[32px] transition-all duration-300",
              "bg-zinc-900 border",
              isFocused
                ? "border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.1)]"
                : "border-zinc-800 shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
            )}
          >
            <div className="pl-6 pr-3 flex-shrink-0">
              <Search
                className={cn(
                  "w-5 h-5 transition-colors duration-300",
                  isFocused ? "text-red-400" : "text-zinc-500"
                )}
              />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="Find experts in semiconductor supply chain with buy-side banking experience..."
              className="flex-1 min-w-0 bg-transparent text-zinc-100 placeholder-zinc-600 py-4 sm:py-5 text-[15px] outline-none"
              disabled={isLoading}
              maxLength={500}
              id="search-input"
              aria-label="Search experts"
            />

            <div className="flex items-center gap-2 pr-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                aria-expanded={showFilters}
                aria-label="Toggle search filters"
                className={cn(
                  "relative p-2.5 rounded-xl transition-all duration-200",
                  showFilters || activeFilterCount > 0
                    ? "bg-red-500/10 text-red-400"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                )}
                id="filter-toggle"
              >
                <SlidersHorizontal className="w-5 h-5" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold tracking-tight border-2 border-zinc-900">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <div className="relative pr-1">
                <button
                  type="submit"
                  disabled={isLoading || !query.trim() || query.trim().length < 3}
                  aria-label="Search"
                  className={cn(
                    "relative flex items-center justify-center min-w-[110px] h-[48px] rounded-full font-semibold text-[15px]",
                    "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400",
                    "text-white disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-all duration-200 shadow-lg shadow-red-500/20"
                  )}
                  id="search-submit"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span>Search</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mr-1">Try:</span>
          {["AI ethics in healthcare", "renewable energy financing", "semiconductor supply chain"].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setQuery(suggestion);
                onSearch(suggestion);
              }}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-zinc-900/40 border border-zinc-800/80 text-zinc-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="absolute top-full left-0 right-0 z-30 p-5 mt-3 bg-zinc-900 rounded-2xl shadow-xl border border-zinc-800 animate-fade-in">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-800">
              <span className="text-sm font-bold text-zinc-100 uppercase tracking-wider">
                Search Filters
              </span>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-500/10 px-2.5 py-1 rounded-md transition-colors border border-red-500/20"
                >
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wide">
                  Industry
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  aria-label="Filter by Industry"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-medium text-zinc-100 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all appearance-none cursor-pointer"
                  id="filter-industry"
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
                <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wide">
                  Seniority
                </label>
                <select
                  value={seniority}
                  onChange={(e) => setSeniority(e.target.value)}
                  aria-label="Filter by Seniority"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-medium text-zinc-100 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all appearance-none cursor-pointer"
                  id="filter-seniority"
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
                <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wide">
                  Availability
                </label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  aria-label="Filter by Availability"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-sm font-medium text-zinc-100 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all appearance-none cursor-pointer"
                  id="filter-availability"
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
