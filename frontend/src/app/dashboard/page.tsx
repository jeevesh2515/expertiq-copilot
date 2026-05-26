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
  FinTech: { color: "bg-emerald-500", gradient: "from-emerald-500 to-emerald-600" },
  HealthTech: { color: "bg-rose-500", gradient: "from-rose-500 to-rose-600" },
  "Climate Tech": { color: "bg-cyan-500", gradient: "from-cyan-500 to-cyan-600" },
  EdTech: { color: "bg-amber-500", gradient: "from-amber-500 to-amber-600" },
  RegTech: { color: "bg-teal-500", gradient: "from-teal-500 to-teal-600" },
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
                color: INDUSTRY_COLORS[name]?.color || "bg-[#1A1A1A]0",
                gradient: INDUSTRY_COLORS[name]?.gradient || "from-gray-500 to-gray-600",
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
    <div className="min-h-screen font-sans relative noise">
      {/* Floating Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="orb orb-1" style={{ top: "-15%", left: "5%" }} />
        <div className="orb orb-2" style={{ top: "50%", right: "-10%" }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 glass border-b border-[#2A2A2A]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-medium border border-[#2A2A2A] bg-[#1A1A1A] px-3 py-1.5 rounded-lg hover:bg-[#222222]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Search</span>
            </Link>
          </div>
          <div className="flex items-center gap-6">
            {/* Tabs */}
            <nav className="flex items-center p-1 bg-[#1A1A1A] rounded-xl border border-[#2A2A2A] min-w-[420px]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-[#222222] text-white shadow-sm border border-[#2A2A2A]"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <tab.icon
                    className={`w-3.5 h-3.5 ${
                      activeTab === tab.id ? "text-emerald-400" : ""
                    }`}
                  />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white leading-none">Dashboard</h1>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                {tabs.find((t) => t.id === activeTab)?.label}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        {activeTab === "overview" && (
          <div className="animate-fade-in space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">
              {[
                {
                  icon: Users,
                  label: "Expert Profiles",
                  value: loading ? "..." : expertCount.toString(),
                  sub: "Across 5 industries",
                  color: "indigo",
                  iconBg: "bg-emerald-500/10 border-emerald-500/20",
                  iconColor: "text-emerald-400",
                },
                {
                  icon: Database,
                  label: "Local Index",
                  value: loading ? "..." : expertCount.toString(),
                  sub: "Prebuilt lightweight search",
                  color: "violet",
                  iconBg: "bg-teal-500/10 border-teal-500/20",
                  iconColor: "text-teal-400",
                },
                {
                  icon: Network,
                  label: "Graph Nodes",
                  value: loading ? "..." : `${expertCount * 4}+`,
                  sub: "Expert · Company · Industry · Topic",
                  color: "cyan",
                  iconBg: "bg-cyan-500/10 border-cyan-500/20",
                  iconColor: "text-cyan-400",
                },
                {
                  icon: Activity,
                  label: "API Status",
                  value: health?.status === "healthy" ? "Healthy" : loading ? "..." : "Offline",
                  sub: health ? `v${health.version}` : "Checking...",
                  color: health?.status === "healthy" ? "emerald" : "rose",
                  iconBg: health?.status === "healthy"
                    ? "bg-emerald-500/10 border-emerald-500/20"
                    : "bg-rose-500/10 border-rose-500/20",
                  iconColor: health?.status === "healthy" ? "text-emerald-400" : "text-rose-400",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="glass-card p-5 rounded-2xl hover:border-gray-300 transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2 rounded-lg border ${stat.iconBg}`}>
                      <stat.icon className={`w-4 h-4 ${stat.iconColor}`} />
                    </div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      {stat.label}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-white tracking-tight font-[family-name:var(--font-mono)]">
                    {stat.value}
                  </div>
                  <div className="text-xs font-medium text-gray-500 mt-1">{stat.sub}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up" style={{ animationDelay: "0.1s" }}>
              {/* Industry Distribution */}
              <div className="glass-card p-7 rounded-3xl">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-1.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    Data Density by Industry
                  </h3>
                </div>

                <div className="space-y-4">
                  {industries.map((ind) => {
                    const pct = expertCount > 0 ? (ind.count / expertCount) * 100 : 0;
                    return (
                      <div key={ind.name} className="group">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-gray-700">
                            {ind.name}
                          </span>
                          <span className="text-xs font-semibold text-gray-500 font-[family-name:var(--font-mono)]">
                            {ind.count} experts ({Math.round(pct)}%)
                          </span>
                        </div>
                        <div className="h-2.5 bg-[#1A1A1A] rounded-full overflow-hidden border border-[#2A2A2A]">
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

              {/* System Info */}
              <div className="glass-card p-7 rounded-3xl">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                    <Layers className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-bold text-white">
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
                      className="flex items-center justify-between py-3 border-b border-[#222222] last:border-0 hover:bg-[#1A1A1A] px-2 -mx-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-400">
                          {item.label}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-gray-700 font-[family-name:var(--font-mono)] tracking-tight bg-[#1A1A1A] px-2.5 py-1 rounded-md border border-[#222222]">
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
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Personal Library
                </h2>
                <p className="text-sm text-gray-400">
                  Your curated collection of research experts.
                </p>
              </div>
              <div className="px-4 py-2 glass rounded-2xl text-xs font-bold text-gray-700">
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
              <div className="py-20 text-center glass-card rounded-3xl animate-slide-up">
                <div className="inline-flex p-4 bg-[#1A1A1A] rounded-2xl mb-4 border border-[#2A2A2A]">
                  <BookmarkIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">
                  No bookmarks yet
                </h3>
                <p className="text-sm text-gray-400 max-w-xs mx-auto">
                  Click the heart icon on any expert profile during search to save
                  them here.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-teal-600 text-white rounded-xl text-sm font-bold hover:from-emerald-500 hover:to-teal-500/100 transition-all duration-300 shadow-lg shadow-emerald-500/100/20"
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
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Discovery History
                </h2>
                <p className="text-sm text-gray-400">
                  A timeline of your recent research intelligence efforts.
                </p>
              </div>
            </div>

            <div className="glass-card rounded-3xl overflow-hidden animate-slide-up">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#2A2A2A]">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Date
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Query
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Results
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      Performance
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {history.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-[#1A1A1A] transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-gray-400 font-medium font-[family-name:var(--font-mono)]">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-700 group-hover:text-emerald-400 transition-colors">
                          {item.query}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 rounded-lg text-[10px] font-bold border border-emerald-500/20">
                          {item.result_count} experts
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs font-[family-name:var(--font-mono)] text-gray-500 font-bold">
                          {item.processing_time_ms.toFixed(0)}ms
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            window.location.href = `/?q=${encodeURIComponent(item.query)}`;
                          }}
                          className="p-2 text-gray-500 hover:text-emerald-400 hover:bg-[#222222] rounded-lg transition-all"
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
                  <div className="inline-flex p-4 bg-[#1A1A1A] rounded-2xl mb-4 border border-[#2A2A2A]">
                    <History className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    History is empty
                  </h3>
                  <p className="text-sm text-gray-400 max-w-xs mx-auto">
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
