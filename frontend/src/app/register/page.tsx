"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Brain, Eye, EyeOff, Shield, UserPlus } from "@/components/icons";
import { getApiErrorMessage, register } from "@/lib/api";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register({ email, password, full_name: fullName });
      window.location.href = "/";
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Registration failed. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-zinc-950">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="orb orb-1" style={{ top: "20%", left: "30%" }} />
        <div className="orb orb-2" style={{ top: "60%", right: "20%" }} />
      </div>
      <div className="fixed inset-0 pointer-events-none dot-grid opacity-[0.03]" />

      <div className="relative w-full max-w-md animate-scale-in">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-red-600 via-amber-500 to-red-600" />

          <div className="p-6 sm:p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 mb-4">
                <Brain className="w-7 h-7 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-zinc-100 mb-1">ExpertIQ Copilot</h1>
              <p className="text-sm text-zinc-400">AI-Powered Expert Discovery Platform</p>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <UserPlus className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Create Account</h2>
                <p className="text-sm text-zinc-400">Join ExpertIQ to get started</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Full Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all" placeholder="John Doe" required id="register-fullname" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all" placeholder="you@company.com" required id="register-email" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3.5 pr-12 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20 transition-all" placeholder="Min 8 characters" minLength={8} required id="register-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 p-1">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-center gap-2">
                  <Shield className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full py-3.5 !mt-6 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-all duration-200 shadow-lg shadow-red-500/25 flex items-center justify-center gap-2" id="register-submit">
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Creating account...
                  </span>
                ) : (
                  <>Create Account<ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-red-400 transition-colors">
                Already have an account? Sign in
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-sm font-medium text-zinc-500 hover:text-zinc-100 transition-colors">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
