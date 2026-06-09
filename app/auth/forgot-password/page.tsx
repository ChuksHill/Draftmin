'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { AuthSidebar } from '@/shared/components/layout/AuthSidebar';
import { supabase } from '@/shared/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSidebar>
      <div>
        {/* Back link */}
        <Link href="/auth/login" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition mb-8">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to sign in
        </Link>

        {sent ? (
          /* ── Success state ── */
          <div className="text-center py-4">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 border border-emerald-200 grid place-items-center mx-auto mb-5">
              <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-emerald-600" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your inbox</h1>
            <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto">
              We sent a password reset link to <span className="font-semibold text-slate-700">{email}</span>.
              The link expires in 1 hour.
            </p>
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 leading-relaxed text-left space-y-1.5">
              <p className="font-medium text-slate-700">Didn&apos;t receive it?</p>
              <p>• Check your spam or junk folder.</p>
              <p>• Make sure you used the email address linked to your account.</p>
              <p>• <button type="button" onClick={() => setSent(false)} className="text-blue-600 hover:underline">Try again</button> with a different address.</p>
            </div>
            <Link href="/auth/login" className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 transition">
              Return to sign in
            </Link>
          </div>
        ) : (
          /* ── Request form ── */
          <div>
            <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-200 grid place-items-center mb-6">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-blue-600" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Forgot password?</h1>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed">
              No problem. Enter your account email and we&apos;ll send you a secure reset link.
            </p>

            {error && (
              <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2.5">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-red-500 mt-0.5 shrink-0" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email address</label>
                <input
                  id="email" type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" autoComplete="email" disabled={loading}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition disabled:opacity-60"
                  autoFocus
                />
              </div>
              <button type="submit" disabled={loading}
                className="h-12 w-full rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed">
                {loading
                  ? <span className="flex items-center justify-center gap-2"><span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />Sending reset link…</span>
                  : 'Send reset link'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Remembered it?{' '}
              <Link href="/auth/login" className="font-semibold text-blue-600 hover:underline">Sign in</Link>
            </p>
          </div>
        )}
      </div>
    </AuthSidebar>
  );
}
