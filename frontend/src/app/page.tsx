"use client";

import dynamic from "next/dynamic";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brain,
  ChevronRight,
  Cpu,
  Database,
  Eye,
  EyeOff,
  Globe,
  Layers,
  Lock,
  LogIn,
  Network,
  Search,
  Shield,
  Sparkles,
  UserPlus,
  X,
  Zap,
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
const Vector3DGraph = dynamic(() => import("@/components/Vector3DGraph"));
const KnowledgeGraphViz = dynamic(() => import("@/components/KnowledgeGraphViz"));

export default function HomePage() {
  const docsHref = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/docs`;
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
    <div className="min-h-screen font-sans relative">
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

      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800 px-8 py-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-500 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-[22px] font-bold tracking-tight text-zinc-100 leading-none">ExpertIQ</h1>
              <span className="text-[10px] font-semibold text-zinc-500 tracking-widest mt-0.5">COPILOT</span>
            </div>
          </div>

          <nav className="flex items-center gap-8">
            {authed ? (
              <>
                <Link href="/dashboard" className="text-[15px] font-medium text-zinc-400 hover:text-zinc-100 transition-colors">
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="text-[15px] font-medium text-zinc-400 hover:text-red-400 transition-colors">Sign Out</button>
              </>
            ) : (
              <>
                <button onClick={() => setAuthMode("login")} className="text-[15px] font-medium text-zinc-400 hover:text-zinc-100 transition-colors">Features</button>
                <button onClick={() => setAuthMode("login")} className="text-[15px] font-medium text-zinc-400 hover:text-zinc-100 transition-colors">Demo</button>
                <button onClick={() => setAuthMode("register")} className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-full text-[15px] font-medium transition-all duration-200 ml-4 shadow-lg shadow-red-500/20">Get Started</button>
              </>
            )}
          </nav>
        </div>
      </header>

      {!searchResults && !searchLoading && (
        <section className="relative pt-24 pb-12 px-6 overflow-hidden">
          <div className="max-w-[1000px] mx-auto text-center relative z-10">
            <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-red-500/10 text-red-400 text-xs font-semibold mb-8 border border-red-500/20">
              <Sparkles className="w-3 h-3 mr-1.5" />
              AI-Powered Expert Discovery Platform
            </div>
            <h2 className="text-[64px] sm:text-[76px] lg:text-[88px] font-extrabold text-zinc-100 mb-6 tracking-tighter leading-[1.02]">
              Find the <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-amber-400">perfect expert</span><br />
              for any research query
            </h2>
            <p className="text-[20px] text-zinc-400 font-medium max-w-[760px] mx-auto mb-12 leading-relaxed">
              Three-layer AI retrieval — semantic search, knowledge graph traversal, and LLM-powered re-ranking — to surface the most relevant experts, not just keyword matches.
            </p>
          </div>

          <div className="relative z-20 max-w-[900px] mx-auto">
            <DiscoveryHUD />
            <SearchBar onSearch={handleSearch} isLoading={searchLoading} />
          </div>
        </section>
      )}

      {(searchResults || searchLoading) && (
        <section className="px-4 sm:px-6 pt-6 sm:pt-8 relative z-20 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800">
          <div className="max-w-[900px] mx-auto">
            <SearchBar onSearch={handleSearch} isLoading={searchLoading} />
          </div>
        </section>
      )}

      {searchError && (
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 mt-6 relative z-10">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-sm text-red-400 flex items-center gap-2 animate-fade-in">
            <Shield className="w-4 h-4 flex-shrink-0" />{searchError}
          </div>
        </div>
      )}

      {searchLoading && !searchResults && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-24 mt-8 sm:mt-10 relative z-10">
          <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-lg p-5 animate-pulse">
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
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_35%] gap-6 sm:gap-8">
            <SkeletonCards />
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 shadow-lg skeleton hidden lg:block" style={{ height: "400px" }} />
          </div>
        </section>
      )}

      {searchResults && (
        <section className="max-w-[1400px] mx-auto px-8 pb-24 mt-10 animate-fade-in relative z-10">
          <div className="grid lg:grid-cols-[1fr_420px] gap-10 items-start">
            <div className="space-y-10 min-w-0">
              {searchResults.executive_summary && (
                <div className="animate-slide-up" style={{ animationDelay: '100ms' }}>
                  <ExecutiveSummary
                    summary={searchResults.executive_summary}
                    queryAnalysis={searchResults.query_analysis}
                    processingTimeMs={searchResults.processing_time_ms}
                  />
                </div>
              )}

              <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
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

              <div className="grid gap-6 animate-stagger">
                {renderedResults}
              </div>
            </div>

            <div className="min-w-0 hidden lg:block sticky top-[100px] space-y-6">
              {searchResults.graph_data && searchResults.graph_data.nodes.length > 0 && (
                <>
                  <div className="h-[400px]">
                    <KnowledgeGraphViz data={searchResults.graph_data} selectedId={selectedExpertId} />
                  </div>

                  <div className="h-[500px]">
                    <Vector3DGraph data={searchResults.graph_data} selectedId={selectedExpertId} />
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {!searchResults && !searchLoading && (
        <section className="max-w-[1000px] mx-auto px-6 pb-24 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Semantic Search", desc: "384-dimensional vector embeddings find experts by meaning, not keywords. Powered by sentence-transformers.", icon: Search },
              { title: "Knowledge Graph", desc: "Multi-hop graph traversal discovers contextually adjacent experts through company, industry, and topic relationships.", icon: Network },
              { title: "AI Re-ranking", desc: "LLM agent scores every candidate 1-10 with detailed reasoning and generates executive summaries.", icon: Brain },
            ].map((feature) => (
              <div key={feature.title} className="p-7 rounded-[24px] bg-zinc-900/80 border border-zinc-800 shadow-lg hover:border-red-500/30 hover:shadow-xl hover:shadow-red-500/5 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-[14px] bg-red-500/10 flex items-center justify-center mb-5 border border-red-500/20 group-hover:bg-red-500/20 transition-all">
                  <feature.icon className="w-5 h-5 text-red-400" />
                </div>
                <h4 className="text-[17px] font-bold text-zinc-100 mb-2">{feature.title}</h4>
                <p className="text-zinc-400 text-[14px] leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="relative z-10 border-t border-zinc-800 py-12 px-6 mt-auto">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-8 text-sm font-bold text-zinc-500 uppercase tracking-widest">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center">
              <Brain className="w-4 h-4 text-red-400" />
            </div>
            <span>© 2026 ExpertIQ Copilot</span>
          </div>
          <div className="flex items-center gap-10">
            <a href={docsHref} className="hover:text-zinc-100 transition-colors">API Documentation</a>
            <a href="https://github.com" className="hover:text-zinc-100 transition-colors">GitHub</a>
            <a href="#" className="hover:text-zinc-100 transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
