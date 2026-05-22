'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthSidebar } from '@/shared/components/layout/AuthSidebar';
import { supabase } from '@/shared/lib/supabase/client';

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function Divider() {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-200" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-[#F6F8FC] px-3 text-xs text-slate-400 font-medium">or continue with email</span>
      </div>
    </div>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/meeting';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}${redirect}` },
      });
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!password) { setError('Please enter your password.'); return; }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      router.replace(redirect);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed.';
      if (msg.toLowerCase().includes('invalid login credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        setError('Please verify your email before signing in.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSidebar>
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-500">Sign in to your Draftmin account to continue.</p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading || loading}
          className="mt-8 w-full h-12 flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          {googleLoading ? (
            <span className="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />
          ) : (
            <GoogleLogo />
          )}
          Continue with Google
        </button>

        <Divider />

        {error && (
          <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            disabled={loading || googleLoading}
            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition disabled:opacity-60"
          />
          <div className="space-y-1">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            autoComplete="current-password"
              disabled={loading || googleLoading}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition disabled:opacity-60"
            />
            <div className="flex justify-end">
              <a href="#" className="text-xs text-blue-600 hover:underline">Forgot password?</a>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading || googleLoading}
            className="h-12 w-full rounded-2xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Signing in…
              </span>
            ) : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="font-semibold text-blue-600 hover:underline">
            Sign up free
          </Link>
        </p>
      </div>
    </AuthSidebar>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
