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
  FinTech: "bg-violet-500",
  HealthTech: "bg-emerald-500",
  "Climate Tech": "bg-cyan-500",
  EdTech: "bg-amber-500",
  RegTech: "bg-rose-500",
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
                color: INDUSTRY_COLORS[name] || "bg-gray-500",
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#07060d]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="flex items-center gap-2 text-white/40 hover:text-white/60 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Back to Search</span>
            </a>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-gradient-to-br from-violet-500 to-blue-600 rounded-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Dashboard</h1>
              <p className="text-[10px] text-white/30 -mt-0.5">
                System Overview
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              icon: Users,
              label: "Expert Profiles",
              value: loading ? "..." : expertCount.toString(),
              sub: "Across 5 industries",
              color: "violet",
            },
            {
              icon: Database,
              label: "Vector Embeddings",
              value: loading ? "..." : expertCount.toString(),
              sub: "384-dim per profile",
              color: "blue",
            },
            {
              icon: Network,
              label: "Graph Nodes",
              value: loading ? "..." : `${expertCount * 4}+`,
              sub: "Expert · Company · Industry · Topic",
              color: "emerald",
            },
            {
              icon: Activity,
              label: "API Status",
              value: health?.status === "healthy" ? "Healthy" : loading ? "..." : "Offline",
              sub: health ? `v${health.version}` : "Checking...",
              color: health?.status === "healthy" ? "emerald" : "amber",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-5 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.05] transition-all duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <stat.icon
                  className={`w-5 h-5 ${
                    stat.color === "violet"
                      ? "text-violet-400"
                      : stat.color === "blue"
                      ? "text-blue-400"
                      : stat.color === "emerald"
                      ? "text-emerald-400"
                      : "text-amber-400"
                  }`}
                />
                <span className="text-[10px] text-white/20 uppercase tracking-wider">
                  {stat.label}
                </span>
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-white/30 mt-0.5">{stat.sub}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Industry Distribution */}
          <div className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <div className="flex items-center gap-2 mb-5">
              <BarChart3 className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-semibold text-white">
                Expert Distribution by Industry
              </h3>
            </div>

            <div className="space-y-3">
              {industries.map((ind) => {
                const pct = expertCount > 0 ? (ind.count / expertCount) * 100 : 0;
                return (
                  <div key={ind.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-white/60">{ind.name}</span>
                      <span className="text-xs text-white/30">
                        {ind.count} experts ({Math.round(pct)}%)
                      </span>
                    </div>
                    <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${ind.color} transition-all duration-700`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {industries.length === 0 && !loading && (
                <p className="text-sm text-white/20">
                  {authed
                    ? "No expert data available."
                    : "Sign in to view expert analytics."}
                </p>
              )}
            </div>
          </div>

          {/* System Info */}
          <div className="p-6 bg-white/[0.03] border border-white/[0.06] rounded-xl">
            <div className="flex items-center gap-2 mb-5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">
                System Architecture
              </h3>
            </div>

            <div className="space-y-3">
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
                  className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <item.icon className="w-3.5 h-3.5 text-white/20" />
                    <span className="text-sm text-white/40">{item.label}</span>
                  </div>
                  <span className="text-sm text-white/60 font-mono">
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
