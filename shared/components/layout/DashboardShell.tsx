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

const NAV_ITEMS = [
  { label: "Home",       href: "/meeting",             icon: "⌂" },
  { label: "Meetings",   href: "/meeting/list",         icon: "◎" },
  { label: "Recordings", href: "/meeting/recordings",   icon: "⏺" },
  { label: "Summaries",  href: "/meeting/summaries",    icon: "✦" },
];

function SidebarNav({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  return (
    <>
      <nav className="px-3 space-y-0.5 text-sm flex-1">
        <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.18em]">
          Workspace
        </div>
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/meeting"
              ? pathname === "/meeting"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className={[
                "flex items-center gap-2.5 w-full rounded-xl px-3 py-2 transition text-sm",
                active
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-slate-600 hover:bg-slate-50",
              ].join(" ")}
            >
              <span className="text-base leading-none opacity-70">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

interface DashboardShellProps {
  children: React.ReactNode;
}

function DashboardShellInner({ children }: DashboardShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const avatar = initialsFromName(displayName || "Guest");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) {
        const name =
          u.user_metadata?.full_name ??
          u.user_metadata?.name ??
          u.email?.split("@")[0] ??
          "Guest";
        setDisplayName(name);
      } else {
        const saved = window.localStorage.getItem("draftmin.displayName");
        if (saved?.trim()) setDisplayName(saved);
      }
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node))
        setSidebarOpen(false);
    }
    if (sidebarOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sidebarOpen]);

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
      {/* Accessible live region for auth state */}
      <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
        {user ? `Signed in as ${user.email}` : ""}
      </div>

      {/* Top nav */}
      <header className="h-14 border-b border-slate-200/80 bg-white/90 backdrop-blur sticky top-0 z-20 flex items-center justify-between px-4 sm:px-5 gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden flex flex-col justify-center items-center w-9 h-9 rounded-lg hover:bg-slate-100 transition gap-[5px] mr-1"
            aria-label="Open navigation"
          >
            <span className="block h-0.5 w-5 bg-slate-600 rounded" />
            <span className="block h-0.5 w-5 bg-slate-600 rounded" />
            <span className="block h-0.5 w-5 bg-slate-600 rounded" />
          </button>
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 grid place-items-center text-white font-bold text-sm">
            D
          </div>
          <div className="text-sm font-semibold text-slate-800">Draftmin</div>
        </div>

        <div className="relative group">
          <button
            type="button"
            className="h-9 w-9 rounded-xl bg-indigo-600 text-white grid place-items-center text-sm font-semibold hover:bg-indigo-700 transition"
            title={displayName}
            aria-label="Account menu"
          >
            {avatar}
          </button>
          <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-50">
            {user?.email && (
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900 truncate">{displayName}</p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition rounded-b-2xl"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Mobile sidebar drawer */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 z-40 h-full w-[240px] bg-white border-r border-slate-200/80 flex flex-col py-4 transition-transform duration-300 ease-in-out lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-4 pb-4 mb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-gradient-to-br from-blue-600 to-indigo-600 grid place-items-center text-white font-bold text-xs">D</div>
            <span className="text-sm font-semibold text-slate-800">Draftmin</span>
          </div>
          <button type="button" onClick={() => setSidebarOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 transition text-slate-400" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <SidebarNav onClose={() => setSidebarOpen(false)} />
        <div className="px-3 pt-4 border-t border-slate-100">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700 truncate">{displayName || "Guest"}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{user?.email ?? "Not signed in"}</p>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-[240px] border-r border-slate-200/80 bg-white min-h-[calc(100vh-56px)] py-4 shrink-0 sticky top-14 self-start h-[calc(100vh-56px)]">
          <SidebarNav />
          <div className="mt-auto px-3 pt-4 border-t border-slate-100">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700 truncate">{displayName || "Guest"}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{user?.email ?? "Not signed in"}</p>
            </div>
          </div>
        </aside>

        {/* Page content */}
        <main className="flex-1 px-4 py-6 sm:py-8 sm:px-6 min-w-0">{children}</main>
      </div>
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
