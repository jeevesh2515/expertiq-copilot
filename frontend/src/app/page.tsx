"use client";

import { useState, useEffect } from "react";
import {
  Brain,
  Database,
  Network,
  Sparkles,
  Shield,
  Zap,
  LogIn,
  UserPlus,
  ArrowRight,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import SearchBar from "@/components/SearchBar";
import ExpertCard from "@/components/ExpertCard";
import ExecutiveSummary from "@/components/ExecutiveSummary";
import KnowledgeGraphViz from "@/components/KnowledgeGraphViz";
import {
  searchExperts,
  login,
  register,
  isAuthenticated,
  logout,
  type SearchResponse,
  type ExpertResult,
} from "@/lib/api";

type AuthMode = "login" | "register" | null;

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

  // Check auth on mount
  useEffect(() => {
    setAuthed(isAuthenticated());
  }, []);

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
    } catch (err: any) {
      setAuthError(
        err.response?.data?.detail || "Authentication failed. Please try again."
      );
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setAuthed(false);
    setSearchResults(null);
  };

  const handleSearch = async (
    query: string,
    filters?: Record<string, string>
  ) => {
    if (!authed) {
      setAuthMode("login");
      return;
    }
    setSearchLoading(true);
    setSearchError("");
    try {
      const response = await searchExperts({
        query,
        filters: filters as any,
        top_k: 10,
      });
      setSearchResults(response);
    } catch (err: any) {
      if (err.response?.status === 401) {
        setAuthed(false);
        setAuthMode("login");
        return;
      }
      setSearchError(
        err.response?.data?.detail || "Search failed. Please try again."
      );
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* ── Auth Modal ── */}
      {authMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-md mx-4 bg-[#0f0d1a] border border-white/[0.1] rounded-2xl shadow-2xl shadow-violet-500/10 animate-fade-in">
            <button
              onClick={() => {
                setAuthMode(null);
                setAuthError("");
              }}
              className="absolute top-4 right-4 p-1 text-white/30 hover:text-white/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8">
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-violet-500/20 rounded-lg">
                  {authMode === "login" ? (
                    <LogIn className="w-4 h-4 text-violet-400" />
                  ) : (
                    <UserPlus className="w-4 h-4 text-violet-400" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-white">
                  {authMode === "login" ? "Welcome Back" : "Create Account"}
                </h2>
              </div>
              <p className="text-sm text-white/40 mb-6">
                {authMode === "login"
                  ? "Sign in to search for experts"
                  : "Join ExpertIQ to get started"}
              </p>

              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === "register" && (
                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/50 transition-colors"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/50 transition-colors"
                    placeholder="you@company.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-white/40 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-4 py-3 pr-10 text-sm text-white placeholder-white/20 outline-none focus:border-violet-500/50 transition-colors"
                      placeholder="Min 8 characters"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {authError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white rounded-xl font-medium text-sm disabled:opacity-50 transition-all duration-200 shadow-lg shadow-violet-500/25"
                >
                  {authLoading
                    ? "Please wait..."
                    : authMode === "login"
                    ? "Sign In"
                    : "Create Account"}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setAuthMode(authMode === "login" ? "register" : "login");
                    setAuthError("");
                  }}
                  className="text-sm text-white/40 hover:text-violet-400 transition-colors"
                >
                  {authMode === "login"
                    ? "Don't have an account? Sign up"
                    : "Already have an account? Sign in"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07060d]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gradient-to-br from-violet-500 to-blue-600 rounded-lg shadow-lg shadow-violet-500/20">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white tracking-tight">
                ExpertIQ
              </h1>
              <p className="text-[10px] text-white/30 -mt-0.5 tracking-widest uppercase">
                Copilot
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {authed ? (
              <>
                <a
                  href="/dashboard"
                  className="text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  Dashboard
                </a>
                <button
                  onClick={handleLogout}
                  className="text-sm text-white/40 hover:text-white/70 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setAuthMode("login")}
                  className="text-sm text-white/50 hover:text-white/80 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setAuthMode("register")}
                  className="px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 rounded-lg text-sm font-medium border border-violet-500/20 transition-all"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero Section ── */}
      {!searchResults && (
        <section className="pt-20 pb-12 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full text-xs text-violet-400 font-medium mb-6 animate-fade-in">
              <Sparkles className="w-3 h-3" />
              AI-Powered Expert Discovery Platform
            </div>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4 animate-slide-up">
              Find the{" "}
              <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                perfect expert
              </span>
              <br />
              for any research query
            </h2>
            <p className="text-lg text-white/40 max-w-2xl mx-auto mb-10 animate-slide-up">
              Three-layer AI retrieval — semantic search, knowledge graph
              traversal, and LLM-powered re-ranking — to surface the most
              relevant experts, not just keyword matches.
            </p>
          </div>
        </section>
      )}

      {/* ── Search Bar ── */}
      <section className={`px-6 ${searchResults ? "pt-6" : ""}`}>
        <SearchBar onSearch={handleSearch} isLoading={searchLoading} />
      </section>

      {/* ── Search Error ── */}
      {searchError && (
        <div className="max-w-4xl mx-auto px-6 mt-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 animate-fade-in">
            {searchError}
          </div>
        </div>
      )}

      {/* ── Search Results ── */}
      {searchResults && (
        <section className="max-w-7xl mx-auto px-6 pb-20 mt-8 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Results */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white">
                  {searchResults.total_results} Expert
                  {searchResults.total_results !== 1 ? "s" : ""} Found
                </h3>
                {searchResults.processing_time_ms && (
                  <span className="text-xs text-white/20">
                    {(searchResults.processing_time_ms / 1000).toFixed(1)}s
                  </span>
                )}
              </div>

              <div className="space-y-3 animate-stagger">
                {searchResults.results.map(
                  (expert: ExpertResult, i: number) => (
                    <ExpertCard key={expert.id} expert={expert} rank={i + 1} />
                  )
                )}
              </div>

              {searchResults.results.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-white/30">
                    No experts matched your query. Try broadening your search.
                  </p>
                </div>
              )}
            </div>

            {/* Right: Summary + Graph */}
            <div className="space-y-4">
              {searchResults.executive_summary && (
                <ExecutiveSummary
                  summary={searchResults.executive_summary}
                  processingTimeMs={searchResults.processing_time_ms}
                  queryAnalysis={searchResults.query_analysis}
                />
              )}

              {searchResults.graph_data &&
                searchResults.graph_data.nodes.length > 0 && (
                  <KnowledgeGraphViz data={searchResults.graph_data} />
                )}
            </div>
          </div>
        </section>
      )}

      {/* ── Feature Cards (shown when no search results) ── */}
      {!searchResults && (
        <section className="max-w-6xl mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                icon: Database,
                title: "Semantic Search",
                desc: "384-dimensional vector embeddings find experts by meaning, not keywords. Powered by sentence-transformers.",
                color: "violet",
              },
              {
                icon: Network,
                title: "Knowledge Graph",
                desc: "Multi-hop graph traversal discovers contextually adjacent experts through company, industry, and topic relationships.",
                color: "blue",
              },
              {
                icon: Sparkles,
                title: "AI Re-ranking",
                desc: "LLM agent scores every candidate 1-10 with detailed reasoning and generates executive summaries.",
                color: "cyan",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
              >
                <div
                  className={`p-2 rounded-lg w-fit mb-3 ${
                    feature.color === "violet"
                      ? "bg-violet-500/10"
                      : feature.color === "blue"
                      ? "bg-blue-500/10"
                      : "bg-cyan-500/10"
                  }`}
                >
                  <feature.icon
                    className={`w-5 h-5 ${
                      feature.color === "violet"
                        ? "text-violet-400"
                        : feature.color === "blue"
                        ? "text-blue-400"
                        : "text-cyan-400"
                    }`}
                  />
                </div>
                <h3 className="text-base font-semibold text-white mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-sm text-white/40 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Security badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-12 text-white/20 text-xs">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              JWT Auth + bcrypt
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              Rate Limited
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Input Sanitised
            </div>
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              SQL Injection Safe
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-white/20">
          <span>© 2024 ExpertIQ Copilot. Built with FastAPI, LangGraph & Next.js.</span>
          <div className="flex items-center gap-4">
            <a href="/docs" className="hover:text-white/40 transition-colors">
              API Docs
            </a>
            <a href="https://github.com" className="hover:text-white/40 transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
