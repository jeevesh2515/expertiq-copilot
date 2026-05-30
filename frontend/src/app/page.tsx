"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo } from "react";
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
import {
  searchExperts, isAuthenticated, logout, getApiErrorMessage, getProfile,
  type SearchResponse, type SearchFilters, type ApiErrorLike, type ExpertResult,
} from "@/lib/api";

type AuthMode = AuthPanelMode | null;
const ExecutiveSummary = dynamic(() => import("@/components/ExecutiveSummary"));
const Vector3DGraph = dynamic(() => import("@/components/Vector3DGraph"), { ssr: false });
const KnowledgeGraphViz = dynamic(() => import("@/components/KnowledgeGraphViz"), { ssr: false });

export default function HomePage() {

  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [authed, setAuthed] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedExpertId, setSelectedExpertId] = useState<string | null>(null);
  const [resultsTab, setResultsTab] = useState<"list" | "graph2d" | "graph3d">("list");

  useEffect(() => {
    let cancelled = false;

    async function verifySession() {
      if (!isAuthenticated()) {
        return;
      }

      try {
        await getProfile();
        if (!cancelled) setAuthed(true);
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
      const isExpert = searchResults?.results.some((e) => e.id === nodeId);
      if (isExpert) {
        setSelectedExpertId(nodeId);
        setTimeout(() => {
          const element = document.getElementById(`expert-card-${nodeId}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
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
          onClick={() => setSelectedExpertId(expert.id)}
          className={cn(
            "cursor-pointer rounded-xl transition-all duration-200",
            selectedExpertId === expert.id
              ? "ring-2 ring-red-500/50 shadow-lg shadow-red-500/10"
              : "hover:ring-1 hover:ring-zinc-700/70",
          )}
        >
          <ExpertCard expert={expert} rank={i + 1} />
        </div>
      )),
    [searchResults?.results, selectedExpertId]
  );

  const hasResults = searchResults || searchLoading;
  const hasGraphData = searchResults?.graph_data && searchResults.graph_data.nodes.length > 0;

  return (
    <div className="relative flex min-h-screen flex-col bg-[#08090b] font-sans text-zinc-100 overflow-x-hidden">
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
      <main className="flex-grow flex flex-col w-full items-center justify-start">
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
          <section className="max-w-[1400px] mx-auto px-4 pb-16 mt-4 relative z-10 w-full flex-grow flex flex-col items-center justify-start sm:px-6">
            <div className="grid w-full items-start gap-4 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_480px]">
              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-lg p-4 animate-pulse w-full">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 skeleton rounded-lg" />
                    <div className="h-3 w-48 skeleton rounded-lg" />
                  </div>
                  <div className="space-y-2 pl-4 border-l-2 border-red-500/20">
                    <div className="h-2.5 w-full skeleton rounded-lg" />
                    <div className="h-2.5 w-4/5 skeleton rounded-lg" />
                    <div className="h-2.5 w-3/4 skeleton rounded-lg" />
                  </div>
                </div>
                <SkeletonCards />
              </div>
              <div className="hidden lg:grid grid-rows-2 gap-3" style={{ height: "calc(100vh - 108px)" }}>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg skeleton" />
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg skeleton" />
              </div>
            </div>
          </section>
        )}

        {/* ─── Results: 2-Column Layout (List Left, Graphs Right) ─── */}
        {searchResults && (
          <section className="max-w-[1440px] mx-auto px-3 sm:px-4 pb-16 mt-2 animate-fade-in relative z-10 w-full flex-grow flex flex-col items-center justify-start">

            {/* Mobile Tab Switcher */}
            <div className="sticky top-[72px] z-20 flex lg:hidden w-full max-w-[560px] mx-auto mb-3 p-0.5 rounded-lg bg-zinc-950/95 border border-zinc-800 backdrop-blur-md shadow-xl shadow-black/30">
              <button
                onClick={() => setResultsTab("list")}
                className={cn(
                  "flex-1 py-1.5 text-[10px] sm:text-xs font-bold uppercase rounded-md transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5",
                  resultsTab === "list"
                    ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/15"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Search className="w-3 h-3" />
                List
              </button>
              <button
                onClick={() => setResultsTab("graph2d")}
                className={cn(
                  "flex-1 py-1.5 text-[10px] sm:text-xs font-bold uppercase rounded-md transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5",
                  resultsTab === "graph2d"
                    ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/15"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Network className="w-3 h-3" />
                2D
              </button>
              <button
                onClick={() => setResultsTab("graph3d")}
                className={cn(
                  "flex-1 py-1.5 text-[10px] sm:text-xs font-bold uppercase rounded-md transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5",
                  resultsTab === "graph3d"
                    ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/15"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Globe className="w-3 h-3" />
                3D
              </button>
            </div>

            <div className="grid w-full items-start gap-4 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_480px]">

              {/* ─── Left Column: Summary + Expert Cards ─── */}
              <div className={cn(
                "space-y-3 min-w-0 text-left flex flex-col items-start justify-start w-full",
                resultsTab === "list" ? "block" : "hidden lg:block"
              )}>
                {searchResults.executive_summary && (
                  <div className="animate-slide-up w-full" style={{ animationDelay: '80ms' }}>
                    <ExecutiveSummary
                      summary={searchResults.executive_summary}
                      queryAnalysis={searchResults.query_analysis}
                      processingTimeMs={searchResults.processing_time_ms}
                      onShowAll={() => setSelectedExpertId(null)}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2.5 w-full">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-bold text-zinc-100 tracking-tight">
                      Curated Pipeline
                    </h3>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 text-[9px] font-black uppercase tracking-widest border border-red-500/20">
                      <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                      {searchResults.total_results} Found
                    </div>
                  </div>
                  <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">
                    {searchResults.processing_time_ms}ms
                  </div>
                </div>

                <div className="grid gap-2.5 animate-stagger w-full">
                  {renderedResults}
                </div>
              </div>

              {/* ─── Right Column: Both Graphs Stacked (Desktop Sticky) ─── */}
              <div className="sticky top-[76px] z-20 hidden h-[calc(100vh-92px)] min-h-[480px] min-w-0 w-full grid-rows-2 gap-3 pb-3 lg:grid">
                {hasGraphData && (
                  <>
                    {/* 2D Knowledge Graph */}
                    <div className="relative z-10 flex min-h-0 flex-col overflow-hidden rounded-xl border border-amber-500/15 bg-zinc-950/90 shadow-2xl shadow-black/30 backdrop-blur-md transition-all duration-300 hover:border-amber-400/25">
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
                    <div className="relative z-10 flex min-h-0 flex-col overflow-hidden rounded-xl border border-red-500/15 bg-zinc-950/90 shadow-2xl shadow-black/30 backdrop-blur-md transition-all duration-300 hover:border-red-400/25">
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
                  </>
                )}
              </div>

              {/* Mobile Graph Panels */}
              <div className={cn(
                "w-full h-[calc(100vh-200px)] min-h-[400px] max-h-[680px] lg:hidden",
                resultsTab === "graph2d" ? "block" : "hidden"
              )}>
                {hasGraphData && (
                  <KnowledgeGraphViz data={searchResults.graph_data!} selectedId={selectedExpertId} onSelectNode={handleSelectNode} />
                )}
              </div>

              <div className={cn(
                "w-full h-[calc(100vh-200px)] min-h-[400px] max-h-[680px] lg:hidden",
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

      {/* Footer */}
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
    </div>
  );
}
