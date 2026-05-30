"use client";

import { useEffect, useState } from "react";
import { Brain, Database, Cpu, Layers } from "@/components/icons";


export default function DiscoveryHUD() {
  const [activeTab, setActiveTab] = useState<"system" | "performance">("system");
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const nodes = [
    { name: "QueryAnalyser", time: 12, pct: 10, color: "bg-red-500" },
    { name: "VectorSearcher", time: 45, pct: 25, color: "bg-amber-500" },
    { name: "GraphExpander", time: 110, pct: 60, color: "bg-purple-500" },
    { name: "Reranker", time: 160, pct: 90, color: "bg-rose-500" },
    { name: "Summariser", time: 20, pct: 15, color: "bg-emerald-500" },
    { name: "ResponseBuilder", time: 3, pct: 5, color: "bg-cyan-500" },
  ];

  return (
    <div className="w-full max-w-[800px] mx-auto rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-xl shadow-xl overflow-hidden animate-fade-in hover:border-zinc-700/60 transition-all duration-300">
      <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/40">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
            <Cpu className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Telemetry & Performance HUD</h3>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">ExpertIQ Node Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-[11px] font-semibold">
          <button
            onClick={() => setActiveTab("system")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === "system"
                ? "bg-zinc-800 text-zinc-100 shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            System Status
          </button>
          <button
            onClick={() => setActiveTab("performance")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === "performance"
                ? "bg-zinc-800 text-zinc-100 shadow"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Node Latencies
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === "system" ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 flex items-center justify-between hover:border-emerald-500/20 hover:bg-zinc-950/60 hover:scale-[1.01] transition-all duration-300 cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20 transition-all">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-500">PostgreSQL Pool</div>
                  <div className="text-sm font-bold text-zinc-200">Active / Connected</div>
                </div>
              </div>
              <span className={`w-2 h-2 rounded-full bg-emerald-500 transition-all ${pulse ? "opacity-100 scale-110 shadow-[0_0_12px_rgba(16,185,129,0.6)]" : "opacity-60 scale-100"}`} />
            </div>

            <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 flex items-center justify-between hover:border-amber-500/20 hover:bg-zinc-950/60 hover:scale-[1.01] transition-all duration-300 cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20 transition-all">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-500">ChromaDB Vectors</div>
                  <div className="text-sm font-bold text-zinc-200">50 Expert Profiles</div>
                </div>
              </div>
              <span className={`w-2 h-2 rounded-full bg-emerald-500 transition-all ${pulse ? "opacity-100 scale-110 shadow-[0_0_12px_rgba(16,185,129,0.6)]" : "opacity-60 scale-100"}`} />
            </div>

            <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/40 flex items-center justify-between hover:border-red-500/20 hover:bg-zinc-950/60 hover:scale-[1.01] transition-all duration-300 cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-400 group-hover:bg-red-500/20 transition-all">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-500">LangSmith tracing</div>
                  <div className="text-sm font-bold text-zinc-200">Active (Endpoint ok)</div>
                </div>
              </div>
              <span className={`w-2 h-2 rounded-full bg-emerald-500 transition-all ${pulse ? "opacity-100 scale-110 shadow-[0_0_12px_rgba(16,185,129,0.6)]" : "opacity-60 scale-100"}`} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold px-1">
              <span>Pipeline Stage / Spans</span>
              <span>Avg Latency (Total: ~350ms)</span>
            </div>
            <div className="space-y-3">
              {nodes.map((node) => (
                <div key={node.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-300">{node.name}</span>
                    <span className="font-bold text-zinc-200 font-mono">{node.time}ms</span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800/50">
                    <div
                      className={`h-full rounded-full ${node.color} transition-all duration-1000 ease-out`}
                      style={{ width: `${node.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
