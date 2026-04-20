"use client";

import { useEffect, useState } from "react";
import {
  Brain,
  Users,
  Database,
  Network,
  Activity,
  ArrowLeft,
  BarChart3,
  Globe,
  Shield,
  Sparkles,
  Bookmark as BookmarkIcon,
  Clock,
  History,
  LayoutDashboard,
  Search,
} from "lucide-react";
import { 
  checkHealth, 
  listExperts, 
  isAuthenticated, 
  listBookmarks, 
  listHistory,
  type HealthResponse,
  type ExpertResult,
  type HistoryEntry
} from "@/lib/api";
import ExpertCard from "@/components/ExpertCard";

interface IndustryCount {
  name: string;
  count: number;
  color: string;
}

const INDUSTRY_COLORS: Record<string, string> = {
  FinTech: "bg-emerald-500",
  HealthTech: "bg-rose-400",
  "Climate Tech": "bg-teal-500",
  EdTech: "bg-amber-400",
  RegTech: "bg-stone-500",
};

export default function DashboardPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [expertCount, setExpertCount] = useState(0);
  const [industries, setIndustries] = useState<IndustryCount[]>([]);
  const [bookmarks, setBookmarks] = useState<ExpertResult[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "bookmarks" | "history">("overview");

  useEffect(() => {
    const isAuthed = isAuthenticated();
    setAuthed(isAuthed);

    async function loadData() {
      try {
        const [healthData, expertsData, bookmarkData, historyData] = await Promise.all([
          checkHealth().catch(() => null),
          isAuthed ? listExperts({ page_size: 100 }).catch(() => null) : Promise.resolve(null),
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
                color: INDUSTRY_COLORS[name] || "bg-stone-300",
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
    <div className="min-h-screen text-stone-900 font-sans bg-[#FAF9F6]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-[#FAF9F6]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors font-medium border border-stone-200 bg-white shadow-sm px-3 py-1.5 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Search</span>
            </a>
          </div>
          <div className="flex items-center gap-6">
            {/* Tabs */}
            <nav className="flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200 min-w-[400px]">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-bold transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-900/5"
                      : "text-stone-500 hover:text-stone-700"
                  }`}
                >
                  <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? "text-emerald-500" : ""}`} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-sm">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-stone-900 leading-none">Dashboard</h1>
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mt-0.5">
                {tabs.find(t => t.id === activeTab)?.label}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
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
                  color: "emerald",
                },
                {
                  icon: Database,
                  label: "Vector Embeddings",
                  value: loading ? "..." : expertCount.toString(),
                  sub: "384-dim per profile",
                  color: "teal",
                },
                {
                  icon: Network,
                  label: "Graph Nodes",
                  value: loading ? "..." : `${expertCount * 4}+`,
                  sub: "Expert · Company · Industry · Topic",
                  color: "amber",
                },
                {
                  icon: Activity,
                  label: "API Status",
                  value: health?.status === "healthy" ? "Healthy" : loading ? "..." : "Offline",
                  sub: health ? `v${health.version}` : "Checking...",
                  color: health?.status === "healthy" ? "emerald" : "rose",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-5 bg-white border border-stone-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300"
                >
                  <div className="flex items-center justify-between mb-3">
                    <stat.icon
                      className={`w-5 h-5 ${
                        stat.color === "emerald"
                          ? "text-emerald-500"
                          : stat.color === "teal"
                          ? "text-teal-500"
                          : stat.color === "amber"
                          ? "text-amber-500"
                          : "text-rose-500"
                      }`}
                    />
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                      {stat.label}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-stone-800 tracking-tight">{stat.value}</div>
                  <div className="text-xs font-medium text-stone-500 mt-1">{stat.sub}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
              {/* Industry Distribution */}
              <div className="p-7 bg-white border border-stone-200 rounded-3xl shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-1.5 bg-amber-50 rounded-lg">
                    <BarChart3 className="w-4 h-4 text-amber-500" />
                  </div>
                  <h3 className="text-sm font-bold text-stone-800">
                    Data Density by Industry
                  </h3>
                </div>

                <div className="space-y-4">
                  {industries.map((ind) => {
                    const pct = expertCount > 0 ? (ind.count / expertCount) * 100 : 0;
                    return (
                      <div key={ind.name} className="group">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-semibold text-stone-600">{ind.name}</span>
                          <span className="text-xs font-semibold text-stone-400">
                            {ind.count} experts ({Math.round(pct)}%)
                          </span>
                        </div>
                        <div className="h-2.5 bg-stone-100 rounded-full overflow-hidden shadow-inner">
                          <div
                            className={`h-full rounded-full ${ind.color} transition-all duration-1000 ease-out`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* System Info */}
              <div className="p-7 bg-white border border-stone-200 rounded-3xl shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-1.5 bg-emerald-50 rounded-lg">
                    <Shield className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h3 className="text-sm font-bold text-stone-800">
                    System Architecture
                  </h3>
                </div>

                <div className="space-y-1">
                  {[
                    { label: "Embedding Model", value: health?.features?.embedding_model || "all-MiniLM-L6-v2", icon: Database },
                    { label: "LLM Available", value: health?.features?.llm_available ? "Yes (Groq)" : "No", icon: Sparkles },
                    { label: "Vector Database", value: "ChromaDB (Persistent)", icon: Database },
                    { label: "Knowledge Graph", value: "NetworkX (In-Memory)", icon: Network },
                    { label: "Authentication", value: "JWT + bcrypt (12 rounds)", icon: Shield },
                    { label: "Rate Limiting", value: "10 req/min per user", icon: Activity },
                    { label: "API Framework", value: "FastAPI + Uvicorn", icon: Globe },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50 px-2 -mx-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-2.5">
                        <item.icon className="w-4 h-4 text-stone-400" />
                        <span className="text-sm font-medium text-stone-600">{item.label}</span>
                      </div>
                      <span className="text-xs font-semibold text-stone-500 font-mono tracking-tight bg-stone-100 px-2 py-1 rounded border border-stone-200">
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
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Personal Library</h2>
                <p className="text-sm text-stone-500">Your curated collection of research experts.</p>
              </div>
              <div className="px-4 py-2 bg-white border border-stone-200 rounded-2xl shadow-sm text-xs font-bold text-stone-600">
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
              <div className="py-20 text-center bg-white border border-stone-200 rounded-3xl shadow-sm animate-slide-up">
                <div className="inline-flex p-4 bg-stone-50 rounded-2xl mb-4">
                  <BookmarkIcon className="w-8 h-8 text-stone-300" />
                </div>
                <h3 className="text-lg font-bold text-stone-800 mb-1">No bookmarks yet</h3>
                <p className="text-sm text-stone-500 max-w-xs mx-auto">
                  Click the heart icon on any expert profile during search to save them here.
                </p>
                <a
                  href="/"
                  className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-stone-900 text-white rounded-xl text-sm font-bold hover:bg-stone-800 transition-colors shadow-sm"
                >
                  <Search className="w-4 h-4" />
                  Explore Experts
                </a>
              </div>
            )}
          </div>
        )}

        {activeTab === "history" && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Discovery History</h2>
                <p className="text-sm text-stone-500">A timeline of your recent research intelligence efforts.</p>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-3xl shadow-sm overflow-hidden animate-slide-up">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Query</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Results</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest">Performance</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-stone-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2 text-sm text-stone-500 font-medium font-mono">
                          <Clock className="w-3.5 h-3.5 text-stone-300" />
                          {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-stone-800 group-hover:text-emerald-600 transition-colors">
                          {item.query}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold border border-emerald-100 shadow-sm">
                          {item.result_count} experts
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs font-mono text-stone-400 font-bold">
                          {item.processing_time_ms.toFixed(0)}ms
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => {
                            window.location.href = `/?q=${encodeURIComponent(item.query)}`;
                          }}
                          className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-all"
                          title="Re-run search"
                        >
                          <ArrowLeft className="w-4 h-4 rotate-180" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {history.length === 0 && (
                <div className="py-20 text-center">
                  <div className="inline-flex p-4 bg-stone-50 rounded-2xl mb-4">
                    <History className="w-8 h-8 text-stone-300" />
                  </div>
                  <h3 className="text-lg font-bold text-stone-800 mb-1">History is empty</h3>
                  <p className="text-sm text-stone-500 max-w-xs mx-auto">
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
