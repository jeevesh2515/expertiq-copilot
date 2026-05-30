"use client";

import { useId, useState } from "react";
import {
  ArrowRight,
  Brain,
  Eye,
  EyeOff,
  Loader2,
  Shield,
} from "@/components/icons";
import {
  getApiErrorMessage,
  login,
  register,
  type TokenResponse,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export type AuthPanelMode = "login" | "register";

interface AuthPanelProps {
  mode: AuthPanelMode;
  onModeChange: (mode: AuthPanelMode) => void;
  onSuccess?: (tokens: TokenResponse) => void;
  compact?: boolean;
  className?: string;
}

export default function AuthPanel({
  mode,
  onModeChange,
  onSuccess,
  compact = false,
  className,
}: AuthPanelProps) {
  const id = useId();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isRegister = mode === "register";

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const tokens = isRegister
        ? await register({ email, password, full_name: fullName })
        : await login({ email, password });
      onSuccess?.(tokens);
    } catch (err: unknown) {
      setError(
        getApiErrorMessage(
          err,
          isRegister
            ? "Could not create the account. Please try again."
            : "Could not sign in. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[24px] border border-zinc-800/80 bg-zinc-950 shadow-2xl shadow-black/40",
        compact ? "w-full" : "w-full max-w-[960px]",
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/80 to-transparent" />

      <div className={cn("grid", compact ? "grid-cols-1" : "lg:grid-cols-[0.95fr_1.05fr]")}>
        {!compact && (
          <aside className="hidden border-r border-zinc-800/80 bg-zinc-900/45 p-8 lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
                <Brain className="h-6 w-6 text-red-300" />
              </div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-red-300">
                ExpertIQ Access
              </p>
              <h2 className="max-w-sm text-3xl font-semibold leading-tight text-zinc-50">
                One secure account for search, graph context, and saved experts.
              </h2>
            </div>

            <div className="mt-10 space-y-3 text-sm text-zinc-400">
              {[
                "JWT sessions with refresh-token recovery",
                "Protected expert search and bookmark flows",
                "Clear production errors when the backend needs attention",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </aside>
        )}

        <div className={cn("p-6 sm:p-8", compact ? "sm:p-7" : "lg:p-10")}>
          <div className="mb-8">
            <div className="mb-6 inline-flex rounded-full border border-zinc-800 bg-zinc-900 p-1">
              {(["login", "register"] as const).map((panelMode) => (
                <button
                  key={panelMode}
                  type="button"
                  onClick={() => {
                    onModeChange(panelMode);
                    setError("");
                  }}
                  className={cn(
                    "h-9 rounded-full px-4 text-sm font-semibold transition",
                    mode === panelMode
                      ? "bg-zinc-100 text-zinc-950"
                      : "text-zinc-400 hover:text-zinc-100"
                  )}
                >
                  {panelMode === "login" ? "Sign in" : "Sign up"}
                </button>
              ))}
            </div>

            <h1 className="text-2xl font-semibold text-zinc-50 sm:text-3xl">
              {isRegister ? "Create your workspace account" : "Welcome back"}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
              {isRegister
                ? "Create an account to run authenticated searches, inspect graph evidence, and save expert shortlists."
                : "Sign in to continue your expert discovery workflow with saved sessions and protected search access."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div>
                <label htmlFor={`${id}-name`} className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  Full name
                </label>
                <input
                  id={`${id}-name`}
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-red-400/70 focus:ring-4 focus:ring-red-500/10"
                  placeholder="Jane Morgan"
                  autoComplete="name"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor={`${id}-email`} className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                Email
              </label>
              <input
                id={`${id}-email`}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-red-400/70 focus:ring-4 focus:ring-red-500/10"
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label htmlFor={`${id}-password`} className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                Password
              </label>
              <div className="relative">
                <input
                  id={`${id}-password`}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 pr-12 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-red-400/70 focus:ring-4 focus:ring-red-500/10"
                  placeholder="Minimum 8 characters"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex gap-3 rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm leading-6 text-red-200">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-5 text-sm font-bold text-white shadow-lg shadow-red-950/30 transition hover:bg-red-400 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isRegister ? "Creating account" : "Signing in"}
                </>
              ) : (
                <>
                  {isRegister ? "Create account" : "Sign in"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-zinc-500">
            {isRegister ? "Already have an account?" : "New to ExpertIQ?"}{" "}
            <button
              type="button"
              onClick={() => onModeChange(isRegister ? "login" : "register")}
              className="font-semibold text-zinc-200 transition hover:text-red-300"
            >
              {isRegister ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </div>
    </section>
  );
}
