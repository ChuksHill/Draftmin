'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/shared/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

function initialsFromEmail(email: string) {
  return email.charAt(0).toUpperCase();
}

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoadingUser(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/');
  }

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="font-bold text-white text-xl">D</span>
            </div>
            <span className="text-slate-900 font-bold text-xl hidden sm:block">Draftmin</span>
          </Link>

          <nav className="hidden md:flex gap-8">
            <a href="/#features" className="text-slate-600 hover:text-slate-900 transition text-sm font-medium">Features</a>
            <a href="/#pricing"  className="text-slate-600 hover:text-slate-900 transition text-sm font-medium">Pricing</a>
            <a href="/#about"    className="text-slate-600 hover:text-slate-900 transition text-sm font-medium">About</a>
          </nav>

          <div className="flex items-center gap-3">
            {loadingUser ? (
              <div className="h-9 w-24 rounded-xl bg-slate-100 animate-pulse" />
            ) : user ? (
              <>
                <Link
                  href="/meeting"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition"
                >
                  My Meetings
                </Link>
                <div className="relative group">
                  <button
                    type="button"
                    className="h-9 w-9 rounded-xl bg-indigo-600 text-white text-sm font-semibold flex items-center justify-center hover:bg-indigo-700 transition"
                  >
                    {initialsFromEmail(user.email ?? 'U')}
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-lg py-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-900 truncate">{user.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 transition border border-slate-200 font-semibold text-sm"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/signup"
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition"
                >
                  Get started
                </Link>
              </>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}