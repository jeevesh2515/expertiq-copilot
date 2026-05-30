"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthPanel, { type AuthPanelMode } from "@/components/AuthPanel";
import { ArrowLeft, Brain } from "@/components/icons";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthPanelMode>("login");

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-48px)] w-full max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
              <Brain className="h-5 w-5 text-red-300" />
            </span>
            <span>
              <span className="block text-sm font-bold text-zinc-100">ExpertIQ</span>
              <span className="block text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Copilot</span>
            </span>
          </Link>
          <Link href="/" className="flex items-center gap-2 rounded-full border border-zinc-800 px-4 py-2 text-sm font-semibold text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-100">
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </header>

        <div className="grid flex-1 place-items-center py-10">
          <AuthPanel
            mode={mode}
            onModeChange={setMode}
            onSuccess={() => router.push("/")}
          />
        </div>
      </div>
    </main>
  );
}
