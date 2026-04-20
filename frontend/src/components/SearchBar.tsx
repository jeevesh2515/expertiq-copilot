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
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        {/* Main Search Input */}
        <div className="relative group z-20">
          <div className="relative flex items-center bg-white border border-stone-200 rounded-full shadow-lg shadow-stone-200/50 hover:shadow-xl transition-all duration-300">
            <div className="pl-6 pr-3">
              <Search className="w-5 h-5 text-stone-400" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find experts in semiconductor supply chain with buy-side experience..."
              className="flex-1 bg-transparent text-stone-800 placeholder-stone-400 py-5 text-base font-medium outline-none"
              disabled={isLoading}
              maxLength={500}
            />
            <div className="flex items-center gap-2 pr-3">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`relative p-2.5 rounded-full transition-all duration-200 ${
                  showFilters || activeFilterCount > 0
                    ? "bg-stone-100 text-stone-800"
                    : "text-stone-400 hover:text-stone-700 hover:bg-stone-50"
                }`}
              >
                <SlidersHorizontal className="w-5 h-5" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-stone-800 rounded-full text-[10px] flex items-center justify-center text-white font-bold tracking-tight border-2 border-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button
                type="submit"
                disabled={isLoading || !query.trim() || query.trim().length < 3}
                className="flex items-center gap-2 px-6 py-3 ml-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-600/20"
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
          <div className="absolute top-16 left-0 right-0 z-10 p-5 mt-2 bg-white border border-stone-200 shadow-xl shadow-stone-200/50 rounded-3xl animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-stone-100">
              <span className="text-sm font-bold text-stone-800 uppercase tracking-wider">Search Filters</span>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-1 rounded-md transition-colors"
                >
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wide">Industry</label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-medium text-stone-800 outline-none focus:border-stone-400 focus:bg-white transition-colors appearance-none shadow-sm cursor-pointer"
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
                <label className="block text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wide">Seniority</label>
                <select
                  value={seniority}
                  onChange={(e) => setSeniority(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-medium text-stone-800 outline-none focus:border-stone-400 focus:bg-white transition-colors appearance-none shadow-sm cursor-pointer"
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
                <label className="block text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wide">Availability</label>
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-sm font-medium text-stone-800 outline-none focus:border-stone-400 focus:bg-white transition-colors appearance-none shadow-sm cursor-pointer"
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
