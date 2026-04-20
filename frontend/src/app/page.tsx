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
  Activity,
  Filter,
  Users,
  Search,
} from "lucide-react";
import SearchBar from "@/components/SearchBar";
import ExpertCard from "@/components/ExpertCard";
import ExecutiveSummary from "@/components/ExecutiveSummary";
import KnowledgeGraphViz from "@/components/KnowledgeGraphViz";
import {
  searchExperts,
  streamSearchExperts,
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
    setSearchResults(null);
    
    try {
      const generator = streamSearchExperts({
        query,
        filters: filters as any,
        top_k: 10,
      });

      for await (const payload of generator) {
        if (payload.type === "results") {
          setSearchResults(payload.data);
        } else if (payload.type === "chunk") {
          setSearchResults((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              executive_summary: (prev.executive_summary || "") + payload.text,
            };
          });
        } else if (payload.type === "done") {
          // Stream complete
        }
      }
    } catch (err: any) {
      if (err.response?.status === 401) {
        setAuthed(false);
        setAuthMode("login");
        return;
      }
      setSearchError(
        err.message || "Search failed. Please try again."
      );
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-stone-900 font-sans">
      {/* ── Auth Modal ── */}
      {authMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/20 backdrop-blur-sm">
          <div className="relative w-full max-w-md mx-4 bg-white border border-stone-200 rounded-3xl shadow-2xl animate-fade-in overflow-hidden">
            <button
              onClick={() => {
                setAuthMode(null);
                setAuthError("");
              }}
              className="absolute top-5 right-5 p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-emerald-50 rounded-xl">
                  {authMode === "login" ? (
                    <LogIn className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <UserPlus className="w-5 h-5 text-emerald-600" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-stone-800 tracking-tight">
                  {authMode === "login" ? "Welcome Back" : "Create Account"}
                </h2>
              </div>
              <p className="text-sm text-stone-500 mb-8">
                {authMode === "login"
                  ? "Sign in to search for experts"
                  : "Join ExpertIQ to get started"}
              </p>

              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === "register" && (
                  <div>
                    <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase tracking-wide">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5 text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase tracking-wide">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5 text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                    placeholder="you@company.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-500 mb-1.5 uppercase tracking-wide">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3.5 pr-12 text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-emerald-500 focus:bg-white transition-all shadow-sm"
                      placeholder="Min 8 characters"
                      minLength={8}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {authError && (
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-sm text-rose-600 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-3.5 !mt-6 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-all duration-200 shadow-md flex items-center justify-center gap-2"
                >
                  {authLoading ? (
                    "Please wait..."
                  ) : authMode === "login" ? (
                    "Sign In"
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setAuthMode(authMode === "login" ? "register" : "login");
                    setAuthError("");
                  }}
                  className="text-sm font-medium text-stone-500 hover:text-stone-800 transition-colors"
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
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-stone-900 tracking-tight">
                ExpertIQ
              </h1>
              <p className="text-[10px] font-semibold text-stone-400 -mt-0.5 tracking-wider uppercase">
                Copilot
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {authed ? (
              <>
                <a
                  href="/dashboard"
                  className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
                >
                  Dashboard
                </a>
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setAuthMode("login")}
                  className="text-sm font-medium text-stone-500 hover:text-stone-900 transition-colors px-2"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setAuthMode("register")}
                  className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-medium transition-all shadow-sm"
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
        <section className="pt-24 pb-16 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-stone-200 rounded-full text-xs text-stone-600 font-medium mb-8 animate-fade-in shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              Minimalist AI-Powered Expert Discovery
            </div>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-stone-900 leading-[1.1] mb-6 animate-slide-up tracking-tight">
              Find the{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">
                Perfect Expert
              </span>
              <br />
              instantly.
            </h2>
            <p className="text-lg md:text-xl text-stone-500 max-w-2xl mx-auto mb-12 animate-slide-up leading-relaxed">
              Experience the clarity of three-layer AI retrieval. We use pure semantic search, knowledge graphs, and precise LLM re-ranking to deliver the highest quality experts without the noise.
            </p>
          </div>
        </section>
      )}

      {/* ── Search Bar ── */}
      <section className={`px-6 ${searchResults ? "pt-8" : ""}`}>
        <SearchBar onSearch={handleSearch} isLoading={searchLoading} />
      </section>

      {/* ── Search Error ── */}
      {searchError && (
        <div className="max-w-4xl mx-auto px-6 mt-6">
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-sm text-rose-600 flex items-center gap-2 animate-fade-in">
            <Shield className="w-4 h-4 flex-shrink-0" />
            {searchError}
          </div>
        </div>
      )}

      {/* ── Search Results ── */}
      {searchResults && (
        <section className="max-w-7xl mx-auto px-6 pb-24 mt-10 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left: Results */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-end justify-between border-b border-stone-200 pb-3">
                <h3 className="text-xl font-bold text-stone-800 tracking-tight">
                  {searchResults.total_results} Expert
                  {searchResults.total_results !== 1 ? "s" : ""} Curated
                </h3>
                {searchResults.processing_time_ms && (
                  <span className="text-sm font-medium text-stone-400 pb-0.5">
                    Analyzed in {(searchResults.processing_time_ms / 1000).toFixed(2)}s
                  </span>
                )}
              </div>

              <div className="space-y-4 animate-stagger">
                {searchResults.results.map(
                  (expert: ExpertResult, i: number) => (
                    <ExpertCard key={expert.id} expert={expert} rank={i + 1} />
                  )
                )}
              </div>

              {searchResults.results.length === 0 && (
                <div className="text-center py-20 bg-white border border-stone-200 rounded-3xl">
                  <div className="w-16 h-16 bg-stone-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Search className="w-6 h-6 text-stone-300" />
                  </div>
                  <p className="text-stone-500 font-medium">
                    No experts found. Please try broadening your criteria.
                  </p>
                </div>
              )}
            </div>

            {/* Right: Summary + Graph */}
            <div className="space-y-6 pt-11">
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
        <section className="max-w-6xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Database,
                title: "Semantic Vector Search",
                desc: "384-dimensional vector embeddings match context and nuance, completely independent of keywords.",
                color: "emerald",
              },
              {
                icon: Network,
                title: "Knowledge Graph Engine",
                desc: "Traverses contextual adjacencies like companies, topics, and industries to surface hidden gems.",
                color: "amber",
              },
              {
                icon: Sparkles,
                title: "Agentic Re-ranking",
                desc: "A proprietary LLM agent evaluates each candidate across strict axes, generating an executive summary.",
                color: "rose",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group p-8 bg-white border border-stone-200 rounded-3xl hover:border-stone-300 hover:shadow-lg transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-5 transition-opacity">
                  <feature.icon className="w-32 h-32" />
                </div>
                <div
                  className={`p-3 rounded-2xl w-fit mb-6 ${
                    feature.color === "emerald"
                      ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      : feature.color === "amber"
                      ? "bg-amber-50 text-amber-600 border border-amber-100"
                      : "bg-rose-50 text-rose-600 border border-rose-100"
                  }`}
                >
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-3 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-base text-stone-500 leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Security badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-20 text-stone-400 text-sm font-medium">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-stone-300" />
              JWT Auth & bcrypt
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-stone-300" />
              Rate Limited
            </div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-stone-300" />
              SQL Injection Safe
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-stone-200 py-10 px-6 bg-stone-50/50 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium text-stone-400">
          <span>© 2024 ExpertIQ Copilot. Sophisticated intelligence, delivered.</span>
          <div className="flex items-center gap-6">
            <a href="/docs" className="hover:text-stone-900 transition-colors">
              API Docs
            </a>
            <a href="https://github.com" className="hover:text-stone-900 transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
