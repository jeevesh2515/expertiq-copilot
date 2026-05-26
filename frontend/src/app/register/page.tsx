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
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{
        background: `
          radial-gradient(ellipse at 50% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 50%),
          radial-gradient(ellipse at 20% 70%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
          #0A0A0F
        `,
      }}
    >
      <div className="absolute inset-0 dot-grid opacity-30" />

      <div className="relative w-full max-w-md animate-scale-in">
        <div className="rounded-2xl border border-[#1E1E2E] bg-[#12121A] shadow-2xl overflow-hidden">
          <div className="h-[2px] bg-gradient-to-r from-indigo-500 via-violet-500 to-cyan-500" />

          <div className="p-6 sm:p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                  <Brain className="w-6 h-6 text-indigo-400" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gradient-animated mb-1">🧠 ExpertIQ Copilot</h1>
              <p className="text-sm text-[#94A3B8]">AI-Powered Expert Discovery Platform</p>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <UserPlus className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#F1F5F9] tracking-tight">Create Account</h2>
                <p className="text-sm text-[#94A3B8]">Join ExpertIQ to get started</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5 uppercase tracking-wide">Full Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-[#1A1A2E] border border-[#1E1E2E] rounded-xl px-4 py-3.5 text-sm text-[#F1F5F9] placeholder-[#475569] outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30 transition-all" placeholder="John Doe" required id="register-fullname" autoFocus />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5 uppercase tracking-wide">Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#1A1A2E] border border-[#1E1E2E] rounded-xl px-4 py-3.5 text-sm text-[#F1F5F9] placeholder-[#475569] outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30 transition-all" placeholder="you@company.com" required id="register-email" />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#94A3B8] mb-1.5 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#1A1A2E] border border-[#1E1E2E] rounded-xl px-4 py-3.5 pr-12 text-sm text-[#F1F5F9] placeholder-[#475569] outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30 transition-all" placeholder="Min 8 characters" minLength={8} required id="register-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#94A3B8] p-1">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-400 flex items-center gap-2">
                  <Shield className="w-4 h-4 flex-shrink-0" />{error}
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full py-3.5 !mt-6 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 transition-all duration-200 shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2" id="register-submit">
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
              <Link href="/login" className="text-sm font-medium text-[#94A3B8] hover:text-indigo-400 transition-colors">
                Already have an account? Sign in
              </Link>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link href="/" className="text-sm font-medium text-[#475569] hover:text-white transition-colors">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
