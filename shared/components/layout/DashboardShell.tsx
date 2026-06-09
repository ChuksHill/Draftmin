"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthGuard } from "@/shared/components/auth/AuthGuard";
import { supabase } from "@/shared/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return ((parts[0]?.[0] ?? "U") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toUpperCase();
}

/* ── SVG Nav icons (no emoji) ────────────────────────────────────────────── */
function IcHome() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function IcMeetings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" /><rect x="3" y="8" width="12" height="10" rx="2" />
    </svg>
  );
}
function IcTranscripts() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" /><path d="M19 10v1a7 7 0 01-14 0v-1M12 19v3m-3 0h6" />
    </svg>
  );
}
function IcSummaries() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}
function IcSettings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

const NAV_ITEMS = [
  { label: "Home",        href: "/meeting",           Icon: IcHome,        exact: true },
  { label: "Meetings",    href: "/meeting/list",       Icon: IcMeetings,    exact: false },
  { label: "Transcripts", href: "/meeting/recordings", Icon: IcTranscripts, exact: false },
  { label: "Summaries",   href: "/meeting/summaries",  Icon: IcSummaries,   exact: false },
];

function NavLink({ item, onClose }: { item: typeof NAV_ITEMS[number]; onClose?: () => void }) {
  const pathname = usePathname();
  const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={[
        "flex items-center gap-3 w-full rounded-xl px-3 py-2.5 transition-all text-sm font-medium",
        active
          ? "bg-blue-50 text-blue-700"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
      ].join(" ")}
    >
      <span className={active ? "text-blue-600" : "text-slate-400"}><item.Icon /></span>
      {item.label}
      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500" />}
    </Link>
  );
}

interface DashboardShellProps { children: React.ReactNode; }

function DashboardShellInner({ children }: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const avatar = initialsFromName(displayName || "Guest");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) {
        const name = u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email?.split("@")[0] ?? "Guest";
        setDisplayName(name);
      } else {
        const saved = window.localStorage.getItem("draftmin.displayName");
        if (saved?.trim()) setDisplayName(saved);
      }
    });
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) setSidebarOpen(false);
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-900">
      {/* ── Top header ──────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-slate-200/80 bg-white/90 backdrop-blur sticky top-0 z-20 flex items-center justify-between px-4 sm:px-5 gap-3">
        <div className="flex items-center gap-2">
          {/* Mobile hamburger */}
          <button type="button" onClick={() => setSidebarOpen(true)} className="lg:hidden flex flex-col justify-center items-center w-9 h-9 rounded-lg hover:bg-slate-100 transition gap-[5px] mr-1" aria-label="Open navigation">
            <span className="block h-0.5 w-5 bg-slate-600 rounded" />
            <span className="block h-0.5 w-5 bg-slate-600 rounded" />
            <span className="block h-0.5 w-5 bg-slate-600 rounded" />
          </button>
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 grid place-items-center text-white font-bold text-sm shrink-0">D</div>
          <span className="text-sm font-semibold text-slate-800 hidden sm:inline">Draftmin</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <button type="button" className="h-9 w-9 rounded-xl border border-slate-200 bg-white grid place-items-center text-slate-400 hover:text-slate-600 hover:border-slate-300 transition relative" aria-label="Notifications">
            <svg viewBox="0 0 24 24" fill="none" className="h-4.5 w-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
            </svg>
          </button>

          {/* Account dropdown */}
          <div className="relative" ref={accountRef}>
            <button type="button" onClick={() => setAccountOpen(v => !v)} className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center text-sm font-semibold hover:opacity-90 transition ring-2 ring-white" aria-label="Account menu">
              {avatar}
            </button>
            {accountOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50">
                {user?.email && (
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900 truncate">{displayName}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{user.email}</p>
                  </div>
                )}
                <div className="py-1">
                  <Link href="/meeting/settings" onClick={() => setAccountOpen(false)} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">
                    <IcSettings /><span>Settings</span>
                  </Link>
                </div>
                <div className="border-t border-slate-100 py-1">
                  <button type="button" onClick={handleSignOut} className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile sidebar overlay ───────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* ── Mobile sidebar drawer ────────────────────────────────────────── */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 z-40 h-full w-[260px] bg-white border-r border-slate-200/80 flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 grid place-items-center text-white font-bold text-xs">D</div>
            <span className="text-sm font-semibold text-slate-800">Draftmin</span>
          </div>
          <button type="button" onClick={() => setSidebarOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition text-slate-400" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-0.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em] px-3 mb-2">Workspace</p>
          {NAV_ITEMS.map(item => <NavLink key={item.label} item={item} onClose={() => setSidebarOpen(false)} />)}
        </nav>
        {/* Expanded user card */}
        <div className="px-3 py-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center text-sm font-semibold shrink-0">{avatar}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">{displayName || "Guest"}</p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email ?? "Not signed in"}</p>
            </div>
          </div>
          <Link href="/meeting/settings" onClick={() => setSidebarOpen(false)} className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition">
            <IcSettings /><span>Settings</span>
          </Link>
          <button type="button" onClick={handleSignOut} className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* ── Layout ───────────────────────────────────────────────────────── */}
      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-[240px] border-r border-slate-200/80 bg-white min-h-[calc(100vh-56px)] py-4 shrink-0 sticky top-14 self-start h-[calc(100vh-56px)]">
          <nav className="flex-1 px-3 space-y-0.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.15em] px-3 mb-2">Workspace</p>
            {NAV_ITEMS.map(item => <NavLink key={item.label} item={item} />)}
          </nav>
          {/* Expanded user card */}
          <div className="px-3 pt-4 border-t border-slate-100 space-y-1">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-100 px-3 py-3 mb-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center text-sm font-semibold shrink-0">{avatar}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{displayName || "Guest"}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email ?? "Not signed in"}</p>
              </div>
            </div>
            <Link href="/meeting/settings" className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 transition">
              <IcSettings /><span>Settings</span>
            </Link>
            <button type="button" onClick={handleSignOut} className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></svg>
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* Page content — add bottom padding on mobile for the bottom nav */}
        <main className="flex-1 px-4 py-6 sm:py-8 sm:px-6 min-w-0 pb-24 lg:pb-8">{children}</main>
      </div>

      {/* ── Mobile bottom navigation (replaces hamburger for primary nav) ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 lg:hidden bg-white border-t border-slate-200 flex" aria-label="Primary navigation">
        {NAV_ITEMS.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.label} href={item.href} className={`flex-1 flex flex-col items-center gap-1 py-3 px-1 text-[10px] font-medium transition ${active ? "text-blue-600" : "text-slate-400 hover:text-slate-600"}`}>
              <span className={active ? "text-blue-600" : "text-slate-400"}><item.Icon /></span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <AuthGuard>
      <DashboardShellInner>{children}</DashboardShellInner>
    </AuthGuard>
  );
}
