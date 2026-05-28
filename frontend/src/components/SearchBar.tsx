"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Command,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
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

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ⌘K keyboard shortcut
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
    <div className="w-full max-w-[800px] mx-auto relative z-20" id="search-bar">
      <form onSubmit={handleSubmit} className="relative">
        {/* Main Search Input */}
        <div className="relative group max-w-[850px] mx-auto">
          <div
            className={cn(
              "relative flex items-center rounded-[32px] transition-all duration-300",
              "bg-white",
              isFocused ? "shadow-[0_8px_30px_rgb(0,0,0,0.08)]" : "shadow-[0_4px_20px_rgb(0,0,0,0.04)]"
            )}
          >
            <div className="pl-6 pr-3 flex-shrink-0">
              <Search
                className={cn(
                  "w-5 h-5 transition-colors duration-300",
                  isFocused ? "text-emerald-600" : "text-gray-400"
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
                className="flex-1 min-w-0 bg-transparent text-gray-900 placeholder-gray-400 py-4 sm:py-5 text-[15px] outline-none"
                disabled={isLoading}
                maxLength={500}
                id="search-input"
              />

            <div className="flex items-center gap-2 pr-2 flex-shrink-0">
              {/* Filters toggle */}
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={cn(
                  "relative p-2.5 rounded-xl transition-all duration-200",
                  showFilters || activeFilterCount > 0
                    ? "bg-emerald-50 text-emerald-600"
                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                )}
                id="filter-toggle"
              >
                <SlidersHorizontal className="w-5 h-5" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-600 rounded-full text-[10px] flex items-center justify-center text-white font-bold tracking-tight border-2 border-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Search button */}
              <div className="relative pr-1">
                <button
                  type="submit"
                  disabled={isLoading || !query.trim() || query.trim().length < 3}
                  className={cn(
                    "relative flex items-center justify-center min-w-[110px] h-[48px] rounded-full font-semibold text-[15px]",
                    "bg-[#70CBA0] hover:bg-[#5CB98E]",
                    "text-white disabled:opacity-60 disabled:cursor-not-allowed",
                    "transition-all duration-200"
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

        {/* Try suggestions */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-[13px]">
          <span className="text-gray-400">Try:</span>
          {["AI ethics in healthcare", "renewable energy financing", "semiconductor supply chain"].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                setQuery(suggestion);
                onSearch(suggestion);
              }}
              className="text-[#059669] hover:text-[#047857] hover:underline"
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="absolute top-full left-0 right-0 z-30 p-5 mt-3 bg-white rounded-2xl shadow-xl border border-gray-100 animate-fade-in">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <span className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Search Filters
              </span>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 bg-rose-50 px-2.5 py-1 rounded-md transition-colors border border-rose-100"
                >
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                  Industry
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer"
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
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                  Seniority
                </label>
                <select
                  value={seniority}
                  onChange={(e) => setSeniority(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer"
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
                <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                  Availability
                </label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer"
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
