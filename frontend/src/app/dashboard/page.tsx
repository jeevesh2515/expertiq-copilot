"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bookmark as BookmarkIcon,
  Brain,
  Clock,
  Cpu,
  Database,
  Globe,
  History,
  Layers,
  LayoutDashboard,
  Network,
  Search,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "@/components/icons";
import {
  checkHealth,
  listExperts,
  isAuthenticated,
  listBookmarks,
  listHistory,
  type HealthResponse,
  type ExpertResult,
  type HistoryEntry,
} from "@/lib/api";
import ExpertCard from "@/components/ExpertCard";

interface IndustryCount {
  name: string;
  count: number;
  color: string;
  gradient: string;
}

const INDUSTRY_COLORS: Record<string, { color: string; gradient: string }> = {
  FinTech: { color: "bg-red-500", gradient: "from-red-500 to-red-600" },
  HealthTech: { color: "bg-rose-500", gradient: "from-rose-500 to-rose-600" },
  "Climate Tech": { color: "bg-amber-500", gradient: "from-amber-500 to-amber-600" },
  EdTech: { color: "bg-emerald-500", gradient: "from-emerald-500 to-emerald-600" },
  RegTech: { color: "bg-violet-500", gradient: "from-violet-500 to-violet-600" },
};

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [expertCount, setExpertCount] = useState(0);
  const [industries, setIndustries] = useState<IndustryCount[]>([]);
  const [bookmarks, setBookmarks] = useState<ExpertResult[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "bookmarks" | "history">("overview");

  useEffect(() => {
    const isAuthed = isAuthenticated();

    async function loadData() {
      try {
        const [healthData, expertsData, bookmarkData, historyData] = await Promise.all([
          checkHealth().catch(() => null),
          isAuthed ? listExperts({ page_size: 50 }).catch(() => null) : Promise.resolve(null),
          isAuthed ? listBookmarks().catch(() => ({ experts: [] })) : Promise.resolve({ experts: [] }),
          isAuthed ? listHistory().catch(() => ({ history: [] })) : Promise.resolve({ history: [] }),
        ]);

        if (healthData) setHealth(healthData);
        if (bookmarkData) setBookmarks(bookmarkData.experts);
        if (historyData) setHistory(historyData.history);

        if (expertsData) {
          setExpertCount(expertsData.total);
          const counts: Record<string, number> = {};
          for (const expert of expertsData.experts) {
            counts[expert.industry] = (counts[expert.industry] || 0) + 1;
          }
          setIndustries(
            Object.entries(counts)
              .map(([name, count]) => ({
                name,
                count,
                color: INDUSTRY_COLORS[name]?.color || "bg-zinc-500",
                gradient: INDUSTRY_COLORS[name]?.gradient || "from-zinc-500 to-zinc-600",
              }))
              .sort((a, b) => b.count - a.count)
          );
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const tabs = [
    { id: "overview", label: "System Overview", icon: LayoutDashboard },
    { id: "bookmarks", label: "Bookmarked Experts", icon: BookmarkIcon },
    { id: "history", label: "Discovery History", icon: History },
  ] as const;

  return (
    <div className="min-h-screen font-sans relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="orb orb-1" style={{ top: "-15%", left: "5%" }} />
        <div className="orb orb-2" style={{ top: "50%", right: "-10%" }} />
      </div>

      <div className="fixed inset-0 pointer-events-none z-0 dot-grid opacity-[0.02]" />

      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 transition-colors font-medium border border-zinc-800 bg-zinc-900 px-3 py-1.5 rounded-lg hover:bg-zinc-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Search</span>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            <nav className="flex items-center p-1 bg-zinc-900 rounded-xl border border-zinc-800 min-w-[420px]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <tab.icon
                    className={`w-3.5 h-3.5 ${
                      activeTab === tab.id ? "text-red-400" : ""
                    }`}
                  />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20">
              <Brain className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-100 leading-none">Dashboard</h1>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">
                {tabs.find((t) => t.id === activeTab)?.label}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {activeTab === "overview" && (
          <div className="animate-fade-in space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
              {[
                {
                  icon: Users,
                  label: "Expert Profiles",
                  value: loading ? "..." : expertCount.toString(),
                  sub: "Across 5 industries",
                  iconBg: "bg-red-500/10 border-red-500/20",
                  iconColor: "text-red-400",
                },
                {
                  icon: Database,
                  label: "Local Index",
                  value: loading ? "..." : expertCount.toString(),
                  sub: "Prebuilt lightweight search",
                  iconBg: "bg-amber-500/10 border-amber-500/20",
                  iconColor: "text-amber-400",
                },
                {
                  icon: Network,
                  label: "Graph Nodes",
                  value: loading ? "..." : `${expertCount * 4}+`,
                  sub: "Expert · Company · Industry · Topic",
                  iconBg: "bg-violet-500/10 border-violet-500/20",
                  iconColor: "text-violet-400",
                },
                {
                  icon: Activity,
                  label: "API Status",
                  value: health?.status === "healthy" ? "Healthy" : loading ? "..." : "Offline",
                  sub: health ? `v${health.version}` : "Checking...",
                  iconBg: health?.status === "healthy"
                    ? "bg-emerald-500/10 border-emerald-500/20"
                    : "bg-red-500/10 border-red-500/20",
                  iconColor: health?.status === "healthy" ? "text-emerald-400" : "text-red-400",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-lg p-5 hover:border-zinc-700 transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg border ${stat.iconBg}`}>
                      <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                      {stat.label}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-zinc-100 tracking-tight font-[family-name:var(--font-mono)]">
                    {stat.value}
                  </div>
                  <div className="text-xs font-medium text-zinc-400 mt-1">{stat.sub}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 shadow-lg p-7">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-1.5 bg-violet-500/10 rounded-lg border border-violet-500/20">
                    <BarChart3 className="w-4 h-4 text-violet-400" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-100">
                    Data Density by Industry
                  </h3>
                </div>

                <div className="space-y-4">
                  {industries.map((ind) => {
                    const pct = expertCount > 0 ? (ind.count / expertCount) * 100 : 0;
                    return (
                      <div key={ind.name} className="group">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-zinc-300">
                            {ind.name}
                          </span>
                          <span className="text-xs font-semibold text-zinc-500 font-[family-name:var(--font-mono)]">
                            {ind.count} experts ({Math.round(pct)}%)
                          </span>
                        </div>
                        <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${ind.gradient} transition-all duration-1000 ease-out shadow-md`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 shadow-lg p-7">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
                    <Layers className="w-4 h-4 text-red-400" />
                  </div>
                  <h3 className="text-sm font-bold text-zinc-100">
                    System Architecture
                  </h3>
                </div>

                <div className="space-y-1">
                  {[
                    {
                      label: "Embedding Model",
                      value: typeof health?.features?.search_backend === "string" ? health.features.search_backend : "lite-local",
                      icon: Cpu,
                    },
                    {
                      label: "LLM Available",
                      value: health?.features?.llm_available ? "Yes (Groq)" : "No",
                      icon: Sparkles,
                    },
                    {
                      label: "Runtime Profile",
                      value: "Low memory / local-first",
                      icon: Database,
                    },
                    {
                      label: "Knowledge Graph",
                      value: "NetworkX (In-Memory)",
                      icon: Network,
                    },
                    {
                      label: "Authentication",
                      value: "JWT + bcrypt (12 rounds)",
                      icon: Shield,
                    },
                    {
                      label: "Rate Limiting",
                      value: "10 req/min per user",
                      icon: Zap,
                    },
                    {
                      label: "API Framework",
                      value: "FastAPI + Uvicorn",
                      icon: Globe,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 px-2 -mx-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon className="w-4 h-4 text-zinc-500" />
                        <span className="text-sm font-medium text-zinc-400">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-zinc-300 font-[family-name:var(--font-mono)] tracking-tight bg-zinc-800 px-2.5 py-1 rounded-md border border-zinc-700">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "bookmarks" && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
                  Personal Library
                </h2>
                <p className="text-sm text-zinc-400">
                  Your curated collection of research experts.
                </p>
              </div>
              <div className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-2xl text-xs font-bold text-zinc-300">
                {bookmarks.length} Profiles Saved
              </div>
            </div>

            {bookmarks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookmarks.map((expert) => (
                  <ExpertCard key={expert.id} expert={expert} />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center rounded-3xl border border-zinc-800 bg-zinc-900/50 animate-slide-up">
                <div className="inline-flex p-4 bg-zinc-800 rounded-2xl mb-4 border border-zinc-700">
                  <BookmarkIcon className="w-8 h-8 text-zinc-500" />
                </div>
                <h3 className="text-lg font-bold text-zinc-100 mb-1">
                  No bookmarks yet
                </h3>
                <p className="text-sm text-zinc-400 max-w-xs mx-auto">
                  Click the heart icon on any expert profile during search to save
                  them here.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-500 text-white rounded-xl text-sm font-bold hover:from-red-500 hover:to-red-400 transition-all duration-300 shadow-lg shadow-red-500/20"
                >
                  <Search className="w-4 h-4" />
                  Explore Experts
                </Link>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">
                  Discovery History
                </h2>
                <p className="text-sm text-zinc-400">
                  A timeline of your recent research intelligence efforts.
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 overflow-hidden animate-slide-up">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      Date
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      Query
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      Results
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      Performance
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {history.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-zinc-800/30 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-zinc-400 font-medium font-[family-name:var(--font-mono)]">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-zinc-300 group-hover:text-red-300 transition-colors">
                          {item.query}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-300 rounded-lg text-[10px] font-bold border border-red-500/20">
                          {item.result_count} experts
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs font-[family-name:var(--font-mono)] text-zinc-500 font-bold">
                          {item.processing_time_ms.toFixed(0)}ms
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            window.location.href = `/?q=${encodeURIComponent(item.query)}`;
                          }}
                          className="p-2 text-zinc-500 hover:text-red-400 hover:bg-zinc-800 rounded-lg transition-all"
                          title="Re-run search"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {history.length === 0 && (
                <div className="py-20 text-center">
                  <div className="inline-flex p-4 bg-zinc-800 rounded-2xl mb-4 border border-zinc-700">
                    <History className="w-8 h-8 text-zinc-500" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-100 mb-1">
                    History is empty
                  </h3>
                  <p className="text-sm text-zinc-400 max-w-xs mx-auto">
                    Your search activity will be archived here for quick retrieval.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
