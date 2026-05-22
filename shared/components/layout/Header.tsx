'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.replace('/');
  }

  const navLinks = [
    { href: '/#features', label: 'Features' },
    { href: '/#pricing',  label: 'Pricing'  },
    { href: '/#about',    label: 'About'    },
  ];

  return (
    <>
      {/* Accessible live region for auth state changes */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
        {!loadingUser && (user ? `Signed in as ${user.email}` : "Signed out")}
      </div>

      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="font-bold text-white text-xl">D</span>
              </div>
              <span className="text-slate-900 font-bold text-xl hidden sm:block">Draftmin</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex gap-8">
              {navLinks.map(({ href, label }) => (
                <a key={label} href={href} className="text-slate-600 hover:text-slate-900 transition text-sm font-medium">
                  {label}
                </a>
              ))}
            </nav>

            {/* Desktop auth */}
            <div className="hidden md:flex items-center gap-3">
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

            {/* Hamburger (mobile only) */}
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-xl hover:bg-slate-100 transition gap-[5px]"
              aria-label="Toggle menu"
              aria-expanded={menuOpen}
            >
              <span className={`block h-0.5 w-6 bg-slate-700 rounded transition-all duration-300 origin-center ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
              <span className={`block h-0.5 w-6 bg-slate-700 rounded transition-all duration-300 ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
              <span className={`block h-0.5 w-6 bg-slate-700 rounded transition-all duration-300 origin-center ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
            </button>

          </div>
        </div>
      </header>

      {/* Mobile drawer overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
        </div>
      )}

      {/* Mobile drawer */}
      <div
        ref={menuRef}
        className={`fixed top-0 right-0 z-50 h-full w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out md:hidden ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white text-sm">D</span>
            </div>
            <span className="text-slate-900 font-bold">Draftmin</span>
          </div>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition text-slate-500"
            aria-label="Close menu"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navLinks.map(({ href, label }) => (
            <a
              key={label}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center h-12 px-4 rounded-xl text-slate-700 font-medium hover:bg-slate-50 hover:text-slate-900 transition text-sm"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Auth buttons */}
        <div className="px-4 pb-8 pt-4 border-t border-slate-100 space-y-3">
          {loadingUser ? (
            <div className="h-11 rounded-xl bg-slate-100 animate-pulse" />
          ) : user ? (
            <>
              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs text-slate-500 truncate">
                {user.email}
              </div>
              <Link
                href="/meeting"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center h-11 w-full rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition"
              >
                My Meetings
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center justify-center h-11 w-full rounded-xl border border-slate-200 text-red-600 font-semibold text-sm hover:bg-red-50 transition"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center h-11 w-full rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-center h-11 w-full rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
