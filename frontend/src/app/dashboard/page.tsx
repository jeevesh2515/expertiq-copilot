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
} from "lucide-react";
import { checkHealth, listExperts, isAuthenticated, type HealthResponse } from "@/lib/api";

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
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    setAuthed(isAuthenticated());

    async function loadData() {
      try {
        const [healthData, expertsData] = await Promise.all([
          checkHealth().catch(() => null),
          isAuthenticated()
            ? listExperts({ page_size: 100 }).catch(() => null)
            : Promise.resolve(null),
        ]);

        if (healthData) setHealth(healthData);

        if (expertsData) {
          setExpertCount(expertsData.total);

          // Count by industry
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
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100 shadow-sm">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-stone-900 leading-none">Dashboard</h1>
              <p className="text-[10px] text-stone-400 font-semibold tracking-wider uppercase mt-0.5">
                System Overview
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-up">
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
              {industries.length === 0 && !loading && (
                <div className="py-8 text-center text-sm font-medium text-stone-400 bg-stone-50 border border-stone-100 rounded-2xl">
                  {authed
                    ? "No expert data available."
                    : "Sign in to view expert analytics."}
                </div>
              )}
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
                {
                  label: "Embedding Model",
                  value: health?.features?.embedding_model || "all-MiniLM-L6-v2",
                  icon: Database,
                },
                {
                  label: "LLM Available",
                  value: health?.features?.llm_available ? "Yes (Groq)" : "No",
                  icon: Sparkles,
                },
                {
                  label: "Vector Database",
                  value: "ChromaDB (Persistent)",
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
                  icon: Activity,
                },
                {
                  label: "API Framework",
                  value: "FastAPI + Uvicorn",
                  icon: Globe,
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0 hover:bg-stone-50 px-2 -mx-2 rounded-lg transition-colors"
                >
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
      </main>
    </div>
  );
}
