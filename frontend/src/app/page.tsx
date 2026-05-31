"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import {
  Brain,
  Globe,
  Network,
  Search,
  Shield,
  X,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import SearchBar from "@/components/SearchBar";
import DiscoveryHUD from "@/components/DiscoveryHUD";
import ExpertCard from "@/components/ExpertCard";
import AuthPanel, { type AuthPanelMode } from "@/components/AuthPanel";

import SkeletonCards from "@/components/SkeletonCards";
import ExpertDetailDrawer from "@/components/ExpertDetailDrawer";
import {
  searchExperts, isAuthenticated, logout, getApiErrorMessage, getProfile, listBookmarks,
  type SearchResponse, type SearchFilters, type ApiErrorLike, type ExpertResult,
} from "@/lib/api";

type AuthMode = AuthPanelMode | null;

/* ─── Dynamic imports with chunk-error recovery ─── */
function ChunkErrorFallback({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full gap-3 p-6 text-center">
      <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
        <Network className="w-5 h-5 text-zinc-500" />
      </div>
      <p className="text-xs text-zinc-400">Failed to load {name}</p>
      <button
        onClick={() => window.location.reload()}
        className="text-[10px] font-bold text-red-400 border border-red-500/20 bg-red-500/5 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
      >
        Reload page
      </button>
    </div>
  );
}

function ChunkLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full w-full">
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-red-500 rounded-full animate-spin" />
        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Loading...</span>
      </div>
    </div>
  );
}

const ExecutiveSummary = dynamic(() => import("@/components/ExecutiveSummary"), {
  loading: () => <ChunkLoadingFallback />,
});
const Vector3DGraph = dynamic(() => import("@/components/Vector3DGraph").catch(() => {
  return { default: () => <ChunkErrorFallback name="3D Vector Space" /> };
}), { ssr: false, loading: () => <ChunkLoadingFallback /> });
const KnowledgeGraphViz = dynamic(() => import("@/components/KnowledgeGraphViz").catch(() => {
  return { default: () => <ChunkErrorFallback name="Knowledge Graph" /> };
}), { ssr: false, loading: () => <ChunkLoadingFallback /> });

export default function HomePage() {
  const leftScrollRef = useRef<HTMLDivElement>(null);

  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [authed, setAuthed] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedExpertId, setSelectedExpertId] = useState<string | null>(null);
  const [resultsTab, setResultsTab] = useState<"list" | "graph2d" | "graph3d">("list");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeExpert, setActiveExpert] = useState<ExpertResult | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Auto-dismiss toast notification after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      if (!isAuthenticated()) {
        return;
      }

      try {
        await getProfile();
        if (!cancelled) {
          setAuthed(true);
          try {
            const bookmarksRes = await listBookmarks();
            setBookmarkedIds(new Set(bookmarksRes.experts.map(e => e.id)));
          } catch (bErr) {
            console.warn("Could not load bookmarks:", bErr);
          }
        }
      } catch {
        logout();
        if (!cancelled) setAuthed(false);
      }
    }

    verifySession();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    logout();
    setAuthed(false);
    setSearchResults(null);
  };

  const handleSearch = async (query: string, filters?: SearchFilters) => {
    if (!authed) { setAuthMode("login"); return; }
    setSearchLoading(true);
    setSearchError("");
    setSearchResults(null);
    setSelectedExpertId(null);
    setResultsTab("list");
    try {
      const response = await searchExperts({ query, filters, top_k: 8, include_graph: true });
      setSearchResults(response);
    } catch (err: unknown) {
      const apiError = err as ApiErrorLike;
      if (apiError.response?.status === 401) { setAuthed(false); setAuthMode("login"); return; }
      setSearchError(getApiErrorMessage(err, "Search failed. Please try again."));
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectNode = (nodeId: string | null) => {
    if (nodeId) {
      const expert = searchResults?.results.find((e) => e.id === nodeId);
      if (expert) {
        setSelectedExpertId(nodeId);
        setActiveExpert(expert);
        setDrawerOpen(true);
        setTimeout(() => {
          const element = document.getElementById(`expert-card-${nodeId}`);
          if (element && leftScrollRef.current) {
            // Scroll within the left panel only, not the whole page
            const container = leftScrollRef.current;
            const elementTop = element.offsetTop - container.offsetTop;
            container.scrollTo({
              top: elementTop - container.clientHeight / 3,
              behavior: "smooth",
            });
          }
        }, 80);
      } else {
        setSelectedExpertId(nodeId);
      }
    } else {
      setSelectedExpertId(null);
    }
  };

  const renderedResults = useMemo(
    () =>
      (searchResults?.results ?? []).map((expert: ExpertResult, i: number) => (
        <div
          key={expert.id}
          id={`expert-card-${expert.id}`}
          onClick={() => {
            setSelectedExpertId(expert.id);
            setActiveExpert(expert);
            setDrawerOpen(true);
          }}
          className={cn(
            "cursor-pointer rounded-xl transition-all duration-200",
            selectedExpertId === expert.id
              ? "ring-2 ring-red-500/50 shadow-lg shadow-red-500/10"
              : "hover:ring-1 hover:ring-zinc-700/70",
          )}
        >
          <ExpertCard
            expert={expert}
            rank={i + 1}
            initBookmarked={bookmarkedIds.has(expert.id)}
            onNotification={(message, type) => setToast({ message, type })}
            onBookmarkToggle={(id, isBookmarked) => {
              setBookmarkedIds((prev) => {
                const next = new Set(prev);
                if (isBookmarked) next.add(id);
                else next.delete(id);
                return next;
              });
            }}
          />
        </div>
      )),
    [searchResults?.results, selectedExpertId, bookmarkedIds]
  );

  const hasResults = searchResults || searchLoading;
  const hasGraphData = searchResults?.graph_data && searchResults.graph_data.nodes.length > 0;

  return (
    <div className={cn(
      "relative flex flex-col bg-[#08090b] font-sans text-zinc-100 overflow-x-hidden",
      hasResults ? "h-screen overflow-hidden" : "min-h-screen"
    )}>
      {/* Decorative premium HSL ambient glow blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-red-950/8 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[20%] right-[-10%] w-[45%] h-[45%] rounded-full bg-amber-950/6 blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-[40%] right-[15%] w-[35%] h-[35%] rounded-full bg-purple-950/4 blur-[140px] pointer-events-none z-0" />

      <div className="fixed inset-0 pointer-events-none z-0 bg-[linear-gradient(to_bottom,#08090b_0%,#0d0e12_45%,#08090b_100%)]" />
      <div className="fixed inset-0 pointer-events-none z-0 dot-grid opacity-[0.025]" />

      {authMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-[980px] animate-scale-in">
            <button
              onClick={() => setAuthMode(null)}
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 text-zinc-500 transition hover:border-zinc-700 hover:text-zinc-100"
              id="auth-close"
              aria-label="Close authentication dialog"
            >
              <X className="h-5 w-5" />
            </button>
            <AuthPanel
              mode={authMode}
              onModeChange={setAuthMode}
              onSuccess={() => {
                setAuthed(true);
                setAuthMode(null);
              }}
            />
          </div>
        </div>
      )}

      {/* ─── Ultra-Compact Navbar ─── */}
      <div className={cn(
        "w-full flex justify-center sticky z-40 transition-all duration-300",
        hasResults
          ? "top-0 px-0"
          : "top-3 px-3 sm:px-6"
      )}>
        <header className={cn(
          "w-full flex items-center justify-between transition-all duration-300",
          hasResults
            ? "border-b border-zinc-900 bg-zinc-950/95 backdrop-blur-md px-4 py-2 shadow-lg sm:px-6"
            : "max-w-[1180px] rounded-2xl border border-zinc-800/70 bg-zinc-950/86 px-4 py-3 shadow-2xl shadow-black/30 backdrop-blur-xl sm:px-5"
        )}>
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => window.location.reload()}>
            <div className={cn(
              "rounded-lg bg-gradient-to-br from-red-600 to-red-500 flex items-center justify-center shadow-lg shadow-red-500/20",
              hasResults ? "w-7 h-7" : "w-9 h-9 rounded-xl"
            )}>
              <Brain className={cn(hasResults ? "w-4 h-4" : "w-5 h-5", "text-white")} />
            </div>
            <div className="flex flex-col">
              <h1 className={cn(
                "font-bold tracking-tight text-zinc-100 leading-none",
                hasResults ? "text-[16px]" : "text-[20px]"
              )}>ExpertIQ</h1>
              <span className={cn(
                "font-bold text-zinc-500 tracking-widest",
                hasResults ? "text-[7px] mt-0" : "text-[9px] mt-0.5"
              )}>COPILOT</span>
            </div>
          </div>

          <nav className="flex items-center gap-2 sm:gap-3">
            {authed ? (
              <>
                <Link href="/dashboard" className="hidden text-[13px] font-semibold text-zinc-400 transition-colors hover:text-zinc-100 sm:block">
                  Dashboard
                </Link>
                <button onClick={handleLogout} className={cn(
                  "rounded-full border border-zinc-800 font-semibold text-zinc-300 transition-colors hover:border-red-500/30 hover:text-red-300",
                  hasResults ? "px-3 py-1 text-[12px]" : "px-4 py-2 text-[14px]"
                )}>Sign out</button>
              </>
            ) : (
              <>
                <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="hidden text-[13px] font-semibold text-zinc-400 transition-colors hover:text-zinc-100 md:block">Features</button>
                <button onClick={() => setAuthMode("login")} className="text-[13px] font-semibold text-zinc-400 transition-colors hover:text-zinc-100">Sign in</button>
                <button
                  onClick={() => setAuthMode("register")}
                  className="rounded-full bg-zinc-100 px-4 py-2 text-[13px] font-bold text-zinc-950 transition hover:bg-white sm:px-5"
                >
                  Get started
                </button>
              </>
            )}
          </nav>
        </header>
      </div>

      {/* Main Page Area */}
      <main className="flex-grow flex flex-col w-full items-center justify-start min-h-0">
        {!searchResults && !searchLoading && (
          <section className="relative w-full px-4 pb-20 pt-24 sm:px-6 sm:pb-28 sm:pt-30">
            <div className="relative z-10 mx-auto grid w-full max-w-[1180px] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(420px,540px)]">
              <div className="text-left">
                <h2 className="max-w-3xl text-[38px] font-semibold leading-[1.05] tracking-[-0.015em] text-zinc-50 sm:text-[50px] lg:text-[58px]">
                  Expert discovery that feels built for serious research.
                </h2>
                <p className="mt-6 max-w-2xl text-[16px] leading-8 text-zinc-400 sm:text-[18px]">
                  Search the expert graph, inspect why each person matched, and move from broad research intent to a usable shortlist without losing context.
                </p>

                <div className="mt-8 max-w-[720px]">
                  <SearchBar onSearch={handleSearch} isLoading={searchLoading} />
                </div>
              </div>

              <div className="min-w-0">
                <DiscoveryHUD />
                <div className="mt-4 grid grid-cols-3 gap-3 text-left">
                  {[
                    ["50", "seed experts"],
                    ["3", "retrieval layers"],
                    ["JWT", "protected access"],
                  ].map(([value, label]) => (
                    <div key={label} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                      <div className="text-xl font-semibold text-zinc-50">{value}</div>
                      <div className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─── Compact Inline Search Bar (results mode) ─── */}
        {hasResults && (
          <section className="z-30 w-full border-b border-zinc-900/80 bg-zinc-950/78 px-3 py-1 backdrop-blur-xl transition-all duration-300 sm:px-4">
            <div className="max-w-[620px] mx-auto w-full relative z-10">
              <SearchBar onSearch={handleSearch} isLoading={searchLoading} variant="compact" />
            </div>
          </section>
        )}

        {searchError && (
          <div className="max-w-[800px] mx-auto px-6 mt-4 relative z-10 w-full flex justify-center">
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-400 flex items-center gap-2 animate-fade-in shadow-md max-w-full">
              <Shield className="w-4 h-4 flex-shrink-0" />{searchError}
            </div>
          </div>
        )}

        {/* ─── Loading Skeleton ─── */}
        {searchLoading && !searchResults && (
          <section className="results-viewport relative z-10 w-full flex-grow">
            <div className="results-container">
              {/* Left: skeleton */}
              <div className="results-left-scroll">
                <div className="space-y-4 p-4">
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-lg p-5 animate-pulse w-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 skeleton rounded-xl" />
                      <div className="space-y-2 flex-1">
                        <div className="h-3 w-48 skeleton rounded-lg" />
                        <div className="h-2 w-32 skeleton rounded-lg" />
                      </div>
                    </div>
                    <div className="space-y-2.5 pl-4 border-l-2 border-red-500/20">
                      <div className="h-2.5 w-full skeleton rounded-lg" />
                      <div className="h-2.5 w-4/5 skeleton rounded-lg" />
                      <div className="h-2.5 w-3/4 skeleton rounded-lg" />
                    </div>
                  </div>
                  <SkeletonCards />
                </div>
              </div>
              {/* Right: skeleton graphs */}
              <div className="results-right-fixed">
                <div className="flex flex-col gap-3 h-full p-1">
                  <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg skeleton" />
                  <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg skeleton" />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─── Results: Split Layout — Scrollable Left + Fixed Right Graphs ─── */}
        {searchResults && (
          <section className="results-viewport relative z-10 w-full flex-grow animate-fade-in">

            {/* Mobile Tab Switcher */}
            <div className="sticky top-0 z-30 flex lg:hidden w-full px-3 py-2 bg-zinc-950/95 border-b border-zinc-800/60 backdrop-blur-xl">
              <div className="flex w-full max-w-[560px] mx-auto p-0.5 rounded-xl bg-zinc-900/80 border border-zinc-800/60 shadow-xl shadow-black/20">
                <button
                  onClick={() => setResultsTab("list")}
                  className={cn(
                    "flex-1 py-2 text-[10px] sm:text-xs font-bold uppercase rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5",
                    resultsTab === "list"
                      ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/15"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <Search className="w-3 h-3" />
                  Results
                </button>
                <button
                  onClick={() => setResultsTab("graph2d")}
                  className={cn(
                    "flex-1 py-2 text-[10px] sm:text-xs font-bold uppercase rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5",
                    resultsTab === "graph2d"
                      ? "bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-lg shadow-amber-500/15"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <Network className="w-3 h-3" />
                  Graph
                </button>
                <button
                  onClick={() => setResultsTab("graph3d")}
                  className={cn(
                    "flex-1 py-2 text-[10px] sm:text-xs font-bold uppercase rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5",
                    resultsTab === "graph3d"
                      ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg shadow-purple-500/15"
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  <Globe className="w-3 h-3" />
                  3D
                </button>
              </div>
            </div>

            <div className="results-container">

              {/* ─── Left Column: Independently Scrollable Results ─── */}
              <div
                ref={leftScrollRef}
                className={cn(
                  "results-left-scroll",
                  resultsTab === "list" ? "block" : "hidden lg:block"
                )}
              >
                <div className="space-y-3 p-4 sm:p-5 text-left">
                  {/* Executive Summary */}
                  {searchResults.executive_summary && (
                    <div className="animate-slide-up" style={{ animationDelay: '80ms' }}>
                      <ExecutiveSummary
                        summary={searchResults.executive_summary}
                        queryAnalysis={searchResults.query_analysis}
                        processingTimeMs={searchResults.processing_time_ms}
                        onShowAll={() => setSelectedExpertId(null)}
                      />
                    </div>
                  )}

                  {/* Pipeline Header */}
                  <div className="flex items-center justify-between border-b border-zinc-800/40 pb-3 pt-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-zinc-100 tracking-tight">
                        Curated Pipeline
                      </h3>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/8 text-red-400 text-[9px] font-black uppercase tracking-widest border border-red-500/15">
                        <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                        {searchResults.total_results} Found
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900/80 px-2.5 py-1 rounded-lg border border-zinc-800/60">
                      {searchResults.processing_time_ms}ms
                    </div>
                  </div>

                  {/* Expert Cards */}
                  <div className="grid gap-3 animate-stagger w-full">
                    {renderedResults}
                  </div>

                  {/* Bottom padding so last card isn't cut off */}
                  <div className="h-8" />
                </div>
              </div>

              {/* ─── Right Column: Fixed Graphs (NEVER scrolls) ─── */}
              <div className="results-right-fixed">
                {hasGraphData ? (
                  <div className="flex flex-col gap-3 h-full p-1">
                    {/* 2D Knowledge Graph */}
                    <div className="relative z-10 flex flex-1 min-h-0 flex-col overflow-hidden rounded-xl border border-amber-500/15 bg-zinc-950/90 shadow-2xl shadow-black/30 backdrop-blur-md transition-all duration-300 hover:border-amber-400/25 hover:shadow-amber-500/5">
                      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800/80 bg-zinc-950/90 px-3 py-2 backdrop-blur-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-amber-400/20 bg-amber-400/10">
                            <Network className="w-3.5 h-3.5 text-amber-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-zinc-100">Knowledge Graph</div>
                            <div className="text-[8px] font-bold uppercase text-zinc-500 tracking-wider">
                              Relationship topology
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 rounded-md border border-zinc-700/80 bg-zinc-900 px-2 py-0.5 text-[9px] font-black uppercase text-zinc-300">
                          {searchResults.graph_data!.nodes.length} nodes
                        </div>
                      </div>
                      <div className="flex-grow min-h-0 relative">
                        <div className="absolute inset-0 w-full h-full">
                          <KnowledgeGraphViz data={searchResults.graph_data!} selectedId={selectedExpertId} onSelectNode={handleSelectNode} hideHeader />
                        </div>
                      </div>
                    </div>

                    {/* 3D Semantic Vector Space */}
                    <div className="relative z-10 flex flex-1 min-h-0 flex-col overflow-hidden rounded-xl border border-red-500/15 bg-zinc-950/90 shadow-2xl shadow-black/30 backdrop-blur-md transition-all duration-300 hover:border-red-400/25 hover:shadow-red-500/5">
                      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-zinc-800/80 bg-zinc-950/90 px-3 py-2 backdrop-blur-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-red-400/20 bg-red-400/10">
                            <Globe className="w-3.5 h-3.5 text-red-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-zinc-100">3D Vector Space</div>
                            <div className="text-[8px] font-bold uppercase text-zinc-500 tracking-wider">
                              Semantic clusters
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 rounded-md border border-zinc-700/80 bg-zinc-900 px-2 py-0.5 text-[9px] font-black uppercase text-zinc-300">
                          {searchResults.graph_data!.edges.length} links
                        </div>
                      </div>
                      <div className="flex-grow min-h-0 relative">
                        <div className="absolute inset-0 w-full h-full">
                          <Vector3DGraph data={searchResults.graph_data!} selectedId={selectedExpertId} hideHeader />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center p-6">
                      <div className="w-12 h-12 mx-auto rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3">
                        <Network className="w-6 h-6 text-zinc-600" />
                      </div>
                      <p className="text-xs text-zinc-500 font-medium">No graph data available</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Graph Panels */}
              <div className={cn(
                "w-full h-[calc(100vh-160px)] min-h-[400px] max-h-[680px] lg:hidden",
                resultsTab === "graph2d" ? "block" : "hidden"
              )}>
                {hasGraphData && (
                  <KnowledgeGraphViz data={searchResults.graph_data!} selectedId={selectedExpertId} onSelectNode={handleSelectNode} />
                )}
              </div>

              <div className={cn(
                "w-full h-[calc(100vh-160px)] min-h-[400px] max-h-[680px] lg:hidden",
                resultsTab === "graph3d" ? "block" : "hidden"
              )}>
                {hasGraphData && (
                  <Vector3DGraph data={searchResults.graph_data!} selectedId={selectedExpertId} />
                )}
              </div>

            </div>
          </section>
        )}

        {/* Feature Cards Section */}
        {!searchResults && !searchLoading && (
          <section id="features" className="relative z-10 mx-auto flex w-full max-w-[1180px] flex-col px-4 pb-28 pt-10 sm:px-6">
            <div className="mb-8 flex flex-col justify-between gap-4 border-t border-zinc-900 pt-10 sm:flex-row sm:items-end">
              <div>
                <h3 className="text-2xl font-semibold text-zinc-50">Built like a research console</h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
                  Every layer is visible enough to trust, but quiet enough to keep the workflow fast.
                </p>
              </div>
              <button
                onClick={() => setAuthMode("register")}
                className="w-fit rounded-full border border-zinc-800 px-5 py-2.5 text-sm font-bold text-zinc-200 transition hover:border-red-500/30 hover:text-red-300"
              >
                Start searching
              </button>
            </div>
            <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-3">
              {[
                { title: "Semantic Search", desc: "384-dimensional vector embeddings find experts by meaning, not keywords. Powered by sentence-transformers.", icon: Search },
                { title: "Knowledge Graph", desc: "Multi-hop graph traversal discovers contextually adjacent experts through company, industry, and topic relationships.", icon: Network },
                { title: "AI Re-ranking", desc: "LLM agent scores every candidate 1-10 with detailed reasoning and generates executive summaries.", icon: Brain },
              ].map((feature) => (
                <div key={feature.title} className="group rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition duration-300 hover:border-zinc-700">
                  <div className="mb-7 flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 transition group-hover:bg-red-500/15">
                    <feature.icon className="h-5 w-5 text-red-300" />
                  </div>
                  <h4 className="mb-2.5 text-[17px] font-semibold text-zinc-100">{feature.title}</h4>
                  <p className="text-[14px] leading-7 text-zinc-500">{feature.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer — only show when NOT in results mode (results mode fills viewport) */}
      {!hasResults && (
        <footer className="relative z-10 border-t border-zinc-800/60 py-10 px-6 bg-zinc-950/40 backdrop-blur-md mt-auto">
          <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-[11px] font-bold text-zinc-500 uppercase tracking-widest w-full">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-red-400" />
              </div>
              <span>© 2026 ExpertIQ Copilot</span>
            </div>
            <div className="flex items-center gap-10">
              <a href="https://github.com" className="hover:text-zinc-100 transition-colors">GitHub</a>
              <a href="#" className="hover:text-zinc-100 transition-colors">Privacy</a>
            </div>
          </div>
        </footer>
      )}

      <ExpertDetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        expert={activeExpert}
        query={searchResults?.query ?? ""}
        langsmithRunId={searchResults?.request_id}
        initBookmarked={activeExpert ? bookmarkedIds.has(activeExpert.id) : false}
        onNotification={(message, type) => setToast({ message, type })}
        onBookmarkToggle={(id, isBookmarked) => {
          setBookmarkedIds((prev) => {
            const next = new Set(prev);
            if (isBookmarked) next.add(id);
            else next.delete(id);
            return next;
          });
        }}
      />

      {/* Floating glassmorphic notification toast */}
      {toast && (
        <div
          onClick={() => setToast(null)}
          className={cn(
            "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4.5 py-3 rounded-2xl border shadow-xl backdrop-blur-xl cursor-pointer transition-all duration-300 animate-slide-up hover:scale-[1.02]",
            toast.type === "success"
              ? "bg-emerald-950/85 border-emerald-500/35 text-emerald-300 shadow-emerald-950/20"
              : "bg-red-950/85 border-red-500/35 text-red-300 shadow-red-950/20"
          )}
        >
          <span className={cn(
            "w-2 h-2 rounded-full",
            toast.type === "success" ? "bg-emerald-400 animate-pulse" : "bg-red-400 animate-pulse"
          )} />
          <span className="text-xs font-bold font-sans tracking-wide leading-none">{toast.message}</span>
        </div>
      )}
    </div>
  );
}
