"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Eye,
  EyeOff,
  Globe,
  Network,
  Search,
  Shield,
  Sparkles,
  X,
} from "@/components/icons";
import { cn } from "@/lib/utils";
import SearchBar from "@/components/SearchBar";
import DiscoveryHUD from "@/components/DiscoveryHUD";
import ExpertCard from "@/components/ExpertCard";

import SkeletonCards from "@/components/SkeletonCards";
import {
  searchExperts, login, register, isAuthenticated, logout, getApiErrorMessage,
  type SearchResponse, type SearchFilters, type ApiErrorLike, type ExpertResult,
} from "@/lib/api";

type AuthMode = "login" | "register" | null;
const ExecutiveSummary = dynamic(() => import("@/components/ExecutiveSummary"));
const Vector3DGraph = dynamic(() => import("@/components/Vector3DGraph"), { ssr: false });
const KnowledgeGraphViz = dynamic(() => import("@/components/KnowledgeGraphViz"), { ssr: false });

export default function HomePage() {

  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [authed, setAuthed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedExpertId, setSelectedExpertId] = useState<string | null>(null);
  const [resultsTab, setResultsTab] = useState<"list" | "graph2d" | "graph3d">("list");

  useEffect(() => { setAuthed(isAuthenticated()); }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      if (authMode === "login") {
        await login({ email, password });
      } else {
        await register({ email, password, full_name: fullName });
      }
      setAuthed(true);
      setAuthMode(null);
      setEmail("");
      setPassword("");
      setFullName("");
    } catch (err: unknown) {
      setAuthError(getApiErrorMessage(err, "Authentication failed. Please try again."));
    } finally {
      setAuthLoading(false);
    }
  };

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

  const renderedResults = useMemo(
    () =>
      (searchResults?.results ?? []).map((expert: ExpertResult, i: number) => (
        <div key={expert.id} onClick={() => setSelectedExpertId(expert.id)} className={`cursor-pointer transition-all duration-300 ${selectedExpertId === expert.id ? 'ring-2 ring-red-500/50 rounded-2xl scale-[1.02] shadow-xl shadow-red-500/10' : 'hover:scale-[1.01]'}`}>
          <ExpertCard expert={expert} rank={i + 1} />
        </div>
      )),
    [searchResults?.results, selectedExpertId]
  );

  return (
    <div className="min-h-screen font-sans relative flex flex-col">
      {/* Decorative Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="orb orb-1" style={{ top: "-10%", left: "10%" }} />
        <div className="orb orb-2" style={{ top: "40%", right: "-5%" }} />
        <div className="orb orb-3" style={{ bottom: "-5%", left: "30%" }} />
      </div>

      <div className="fixed inset-0 pointer-events-none z-0 dot-grid opacity-[0.03]" />

      {authMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="relative w-full max-w-md rounded-2xl shadow-2xl animate-scale-in overflow-hidden bg-zinc-900 border border-zinc-800">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />
            <button onClick={() => { setAuthMode(null); setAuthError(""); }} className="absolute top-5 right-5 p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-xl transition-all duration-200" id="auth-close">
              <X className="w-5 h-5" />
            </button>
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 mb-4">
                  <Brain className="w-7 h-7 text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
                  {authMode === "login" ? "Welcome Back" : "Create Account"}
                </h2>
                <p className="text-sm text-zinc-400 mt-1">
                  {authMode === "login" ? "Sign in to search for experts" : "Join ExpertIQ to get started"}
                </p>
              </div>
              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === "register" && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Full Name</label>
                    <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all shadow-sm" placeholder="John Doe" required id="auth-fullname" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all shadow-sm" placeholder="you@company.com" required id="auth-email" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Password</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3.5 pr-12 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all shadow-sm" placeholder="Min 8 characters" minLength={8} required id="auth-password" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                {authError && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-2">
                    <Shield className="w-4 h-4 flex-shrink-0" />{authError}
                  </div>
                )}
                <button type="submit" disabled={authLoading} className="w-full py-3.5 !mt-6 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-all duration-200 shadow-lg shadow-red-500/25 flex items-center justify-center gap-2" id="auth-submit">
                  {authLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                      Please wait...
                    </span>
                  ) : authMode === "login" ? (<>Sign In<ArrowRight className="w-4 h-4" /></>) : (<>Create Account<ArrowRight className="w-4 h-4" /></>)}
                </button>
              </form>
              <div className="mt-6 text-center">
                <button onClick={() => { setAuthMode(authMode === "login" ? "register" : "login"); setAuthError(""); }} className="text-sm font-medium text-zinc-400 hover:text-red-400 transition-colors">
                  {authMode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Glass Navbar (Floating on Hero, Solid Header on Results) */}
      <div className={cn(
        "w-full flex justify-center sticky z-40 transition-all duration-300",
        searchResults || searchLoading
          ? "top-0 px-0"
          : "top-4 px-4"
      )}>
        <header className={cn(
          "w-full flex items-center justify-between transition-all duration-300",
          searchResults || searchLoading
            ? "border-b border-zinc-900 bg-zinc-950/95 backdrop-blur-md px-6 sm:px-8 py-4 shadow-lg"
            : "max-w-[1200px] rounded-2xl border border-zinc-800/60 bg-zinc-950/70 backdrop-blur-xl px-6 py-3.5 shadow-2xl shadow-black/40"
        )}>
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-500 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[20px] font-bold tracking-tight text-zinc-100 leading-none">ExpertIQ</h1>
              <span className="text-[9px] font-bold text-zinc-500 tracking-widest mt-0.5">COPILOT</span>
            </div>
          </div>

          <nav className="flex items-center gap-8">
            {authed ? (
              <>
                <Link href="/dashboard" className="text-[14px] font-semibold text-zinc-400 hover:text-zinc-100 transition-colors">
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="text-[14px] font-semibold text-zinc-400 hover:text-red-400 transition-colors cursor-pointer">Sign Out</button>
              </>
            ) : (
              <>
                <button onClick={() => setAuthMode("login")} className="text-[14px] font-semibold text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer">Features</button>
                <button onClick={() => setAuthMode("login")} className="text-[14px] font-semibold text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer">Demo</button>
                <button onClick={() => setAuthMode("register")} className="px-5 py-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-full text-[14px] font-semibold transition-all duration-200 ml-4 shadow-lg shadow-red-500/20 cursor-pointer">Get Started</button>
              </>
            )}
          </nav>
        </header>
      </div>

      {/* Main Page Area */}
      <main className="flex-grow flex flex-col w-full items-center justify-start">
        {!searchResults && !searchLoading && (
          <section className="relative pt-36 pb-24 px-6 overflow-hidden w-full flex flex-col items-center justify-center text-center">
            <div className="max-w-[1200px] mx-auto text-center relative z-10 flex flex-col items-center justify-center w-full">
              <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-red-500/10 text-red-400 text-xs font-semibold mb-8 border border-red-500/20 shadow-sm backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 animate-pulse-soft" />
                AI-Powered Expert Discovery Platform
              </div>
              <h2 className="text-[56px] sm:text-[68px] lg:text-[80px] font-extrabold text-zinc-100 mb-6 tracking-tighter leading-[1.04] text-center">
                Find the <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-amber-400">perfect expert</span><br />
                for any research query
              </h2>
              <p className="text-[18px] sm:text-[20px] text-zinc-400 font-medium max-w-[720px] mx-auto mb-14 leading-relaxed text-center">
                Three-layer AI retrieval — semantic search, knowledge graph traversal, and LLM-powered re-ranking — to surface the most relevant experts, not just keyword matches.
              </p>
            </div>

            {/* Spacing alignment wrapper for Telemetry HUD and Search Bar to prevent overlaps */}
            <div className="relative z-20 max-w-[800px] mx-auto flex flex-col items-center gap-12 w-full px-4 justify-center">
              <DiscoveryHUD />
              <SearchBar onSearch={handleSearch} isLoading={searchLoading} />
            </div>
          </section>
        )}

        {(searchResults || searchLoading) && (
          <section className="px-4 sm:px-6 py-8 w-full flex flex-col items-center justify-center transition-all duration-300 relative overflow-hidden border-b border-zinc-900/60">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-950/10 via-transparent to-transparent opacity-60 pointer-events-none" />
            <div className="max-w-[800px] mx-auto w-full relative z-10">
              <SearchBar onSearch={handleSearch} isLoading={searchLoading} />
            </div>
          </section>
        )}

        {searchError && (
          <div className="max-w-[800px] mx-auto px-6 mt-6 relative z-10 w-full flex justify-center">
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-400 flex items-center gap-2 animate-fade-in shadow-md max-w-full">
              <Shield className="w-4 h-4 flex-shrink-0" />{searchError}
            </div>
          </div>
        )}

        {searchLoading && !searchResults && (
          <section className="max-w-[1200px] mx-auto px-6 pb-24 mt-12 relative z-10 w-full flex-grow flex flex-col items-center justify-start">
            <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-lg p-5 animate-pulse w-full max-w-[800px]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 skeleton rounded-xl" />
                <div className="h-4 w-48 skeleton rounded-lg" />
              </div>
              <div className="space-y-2 pl-5 border-l-2 border-red-500/20">
                <div className="h-3 w-full skeleton rounded-lg" />
                <div className="h-3 w-4/5 skeleton rounded-lg" />
                <div className="h-3 w-3/4 skeleton rounded-lg" />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_35%] gap-6 sm:gap-8 w-full">
              <SkeletonCards />
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg skeleton hidden lg:block" style={{ height: "400px" }} />
            </div>
          </section>
        )}

        {searchResults && (
          <section className="max-w-[1200px] mx-auto px-6 pb-24 mt-10 animate-fade-in relative z-10 w-full flex-grow flex flex-col items-center justify-start">
            
            {/* Mobile Tab Switcher - Sleek Segmented Control */}
            <div className="flex lg:hidden w-full max-w-[500px] mx-auto mb-8 p-1 rounded-xl bg-zinc-950/80 border border-zinc-800 backdrop-blur-md">
              <button
                onClick={() => setResultsTab("list")}
                className={cn(
                  "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2",
                  resultsTab === "list"
                    ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/15"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Search className="w-3.5 h-3.5" />
                List
              </button>
              <button
                onClick={() => setResultsTab("graph2d")}
                className={cn(
                  "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2",
                  resultsTab === "graph2d"
                    ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/15"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Network className="w-3.5 h-3.5" />
                2D Topology
              </button>
              <button
                onClick={() => setResultsTab("graph3d")}
                className={cn(
                  "flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2",
                  resultsTab === "graph3d"
                    ? "bg-gradient-to-r from-red-600 to-red-500 text-white shadow-lg shadow-red-500/15"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Globe className="w-3.5 h-3.5" />
                3D Space
              </button>
            </div>

            <div className="grid lg:grid-cols-[1fr_420px] gap-10 items-start w-full">
              
              {/* Left Column (List view) */}
              <div className={cn(
                "space-y-10 min-w-0 text-left flex flex-col items-start justify-start w-full",
                resultsTab === "list" ? "block" : "hidden lg:block"
              )}>
                {searchResults.executive_summary && (
                  <div className="animate-slide-up w-full" style={{ animationDelay: '100ms' }}>
                    <ExecutiveSummary
                      summary={searchResults.executive_summary}
                      queryAnalysis={searchResults.query_analysis}
                      processingTimeMs={searchResults.processing_time_ms}
                      onShowAll={() => setSelectedExpertId(null)}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between border-b border-zinc-800 pb-6 w-full">
                  <div className="flex items-center gap-4">
                    <h3 className="text-2xl font-bold text-zinc-100 tracking-tight flex items-center gap-3">
                      Curated Pipeline
                    </h3>
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] font-black uppercase tracking-widest border border-red-500/20">
                      <div className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                      {searchResults.total_results} Experts Found
                    </div>
                  </div>
                  <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-800 px-3 py-1 rounded-lg border border-zinc-700">
                    Latency: {searchResults.processing_time_ms}ms
                  </div>
                </div>

                <div className="grid gap-6 animate-stagger w-full">
                  {renderedResults}
                </div>
              </div>

              {/* Desktop Sticky Sidebar (Both 2D and 3D Graphs Stacked) */}
              <div className="min-w-0 hidden lg:block sticky top-[100px] flex flex-col gap-6 w-full pb-6 z-20">
                {searchResults.graph_data && searchResults.graph_data.nodes.length > 0 && (
                  <>
                    {/* 2D Knowledge Graph Card */}
                    <div className="flex flex-col h-[calc(50vh-90px)] rounded-2xl border border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md overflow-hidden shadow-2xl gold-glow relative z-10 transition-all hover:border-zinc-700/60 duration-300">
                      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 shrink-0 bg-zinc-900/80 backdrop-blur-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <Network className="w-4 h-4 text-amber-400" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-zinc-100">Knowledge Graph</div>
                            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
                              2D Topology Discovery
                            </div>
                          </div>
                        </div>
                        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                          {searchResults.graph_data.nodes.length} Nodes
                        </div>
                      </div>
                      <div className="flex-grow min-h-0 relative">
                        <div className="absolute inset-0 w-full h-full">
                          <KnowledgeGraphViz data={searchResults.graph_data} selectedId={selectedExpertId} hideHeader />
                        </div>
                      </div>
                    </div>

                    {/* 3D Semantic Vector Space Card */}
                    <div className="flex flex-col h-[calc(50vh-90px)] rounded-2xl border border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md overflow-hidden shadow-2xl red-glow relative z-10 transition-all hover:border-zinc-700/60 duration-300">
                      <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 shrink-0 bg-zinc-900/80 backdrop-blur-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                            <Globe className="w-4 h-4 text-red-400" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-zinc-100">3D Vector Space</div>
                            <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
                              Semantic Vector space
                            </div>
                          </div>
                        </div>
                        <div className="text-[10px] font-black text-zinc-400 uppercase tracking-widest bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700">
                          3D Space
                        </div>
                      </div>
                      <div className="flex-grow min-h-0 relative">
                        <div className="absolute inset-0 w-full h-full">
                          <Vector3DGraph data={searchResults.graph_data} selectedId={selectedExpertId} hideHeader />
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Mobile Graph Panels - shown only when that specific tab is active */}
              <div className={cn(
                "w-full h-[520px] lg:hidden",
                resultsTab === "graph2d" ? "block" : "hidden"
              )}>
                {searchResults.graph_data && searchResults.graph_data.nodes.length > 0 && (
                  <KnowledgeGraphViz data={searchResults.graph_data} selectedId={selectedExpertId} />
                )}
              </div>

              <div className={cn(
                "w-full h-[520px] lg:hidden",
                resultsTab === "graph3d" ? "block" : "hidden"
              )}>
                {searchResults.graph_data && searchResults.graph_data.nodes.length > 0 && (
                  <Vector3DGraph data={searchResults.graph_data} selectedId={selectedExpertId} />
                )}
              </div>

            </div>
          </section>
        )}

        {/* Feature Cards Section with generous margins and premium grid layout */}
        {!searchResults && !searchLoading && (
          <section className="max-w-[1200px] mx-auto px-6 pt-16 pb-28 relative z-10 w-full flex flex-col items-center justify-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
              {[
                { title: "Semantic Search", desc: "384-dimensional vector embeddings find experts by meaning, not keywords. Powered by sentence-transformers.", icon: Search },
                { title: "Knowledge Graph", desc: "Multi-hop graph traversal discovers contextually adjacent experts through company, industry, and topic relationships.", icon: Network },
                { title: "AI Re-ranking", desc: "LLM agent scores every candidate 1-10 with detailed reasoning and generates executive summaries.", icon: Brain },
              ].map((feature) => (
                <div key={feature.title} className="p-8 rounded-2xl glass-card hover:border-red-500/30 hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300 group cursor-pointer">
                  <div className="w-10 h-10 rounded-[14px] bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20 group-hover:bg-red-500/20 transition-all">
                    <feature.icon className="w-5 h-5 text-red-400" />
                  </div>
                  <h4 className="text-[17px] font-bold text-zinc-100 mb-2.5">{feature.title}</h4>
                  <p className="text-zinc-400 text-[14px] leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Footer fully aligned with the content grid */}
      <footer className="relative z-10 border-t border-zinc-800/60 py-12 px-6 bg-zinc-950/40 backdrop-blur-md mt-auto">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-[11px] font-bold text-zinc-500 uppercase tracking-widest w-full">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Brain className="w-4 h-4 text-red-400" />
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
