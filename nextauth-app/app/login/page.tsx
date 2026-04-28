"use client";

import { useState } from "react";

import Link from "next/link";
import { signInWithCredentials } from "@/app/actions/auth";
import { OAuthButtons } from "@/components/OAuthButtons";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields.");
      setLoading(false);
      return;
    }

    try {
      const result = await signInWithCredentials({ email, password });
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      // Redirect happens via NextAuth — this catch handles NEXT_REDIRECT
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg px-4 font-sans">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/4 -translate-x-1/2 h-[500px] w-[600px] rounded-full bg-gradient-to-b from-amber-500/10 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link href="/" className="mb-6 inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
              <svg className="h-6 w-6 text-accent" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
          </Link>
          <h1 className="text-3xl font-bold text-text-primary font-heading">Welcome back</h1>
          <p className="mt-2 text-sm text-text-muted">
            Sign in to your account to continue
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-bg-surface p-8 shadow-2xl shadow-black/50 backdrop-blur-sm">
          {/* OAuth */}
          <OAuthButtons />

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-text-muted">or continue with email</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg border border-like-red/20 bg-like-red/10 px-4 py-3 text-sm text-like-red">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-primary">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-border bg-bg/50 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-accent/50 focus:ring-1 focus:ring-accent/50"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-primary">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-bg/50 px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-colors focus:border-accent/50 focus:ring-1 focus:ring-accent/50"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-bg shadow-lg shadow-amber-900/20 transition-all hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-text-muted">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-accent transition-colors hover:text-accent/80"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
