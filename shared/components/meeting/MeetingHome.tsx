"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/shared/components/auth/AuthGuard";
import { supabase } from "@/shared/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  const first = parts[0]?.[0] ?? "U";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

function MeetingHomeInner() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("Guest");
  const [roomName, setRoomName] = useState("draftmin-product-review");

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
        window.localStorage.setItem("draftmin.displayName", name);
      } else {
        const saved = window.localStorage.getItem("draftmin.displayName");
        if (saved && saved.trim().length > 0) setDisplayName(saved);
      }
    });
  }, []);

  const avatar = useMemo(() => initialsFromName(displayName), [displayName]);

  const personalMeetingId = useMemo(() => {
    const base = displayName.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    const numeric = Array.from(base).reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) % 1_000_000_000, 7);
    const id = String(numeric).padStart(9, "0");
    return `${id.slice(0, 3)} ${id.slice(3, 6)} ${id.slice(6, 9)}`;
  }, [displayName]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-slate-900">
      <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 grid place-items-center text-white font-bold text-sm">D</div>
            <div className="text-sm font-semibold">Draftmin</div>
          </div>
          <div className="hidden md:flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 h-9 text-sm text-slate-500">Search</div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="hidden sm:inline-flex h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
            Support
          </button>
          <div className="relative group">
            <button type="button" className="h-9 w-9 rounded-xl bg-indigo-600 text-white grid place-items-center text-sm font-semibold hover:bg-indigo-700 transition">
              {avatar}
            </button>
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-lg py-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-50">
              {user?.email && (
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900 truncate">{user.email}</p>
                </div>
              )}
              <button type="button" onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className="hidden lg:block w-[260px] border-r border-slate-200 bg-white min-h-[calc(100vh-56px)]">
          <div className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Home</div>
          <nav className="px-2 space-y-1 text-sm">
            {[
              { label: "Home", active: true },
              { label: "Meetings" },
              { label: "Recordings" },
              { label: "Summaries" },
              { label: "Whiteboards" },
              { label: "Notes" },
              { label: "Docs" },
              { label: "Tasks" },
            ].map((item) => (
              <a key={item.label} href="#" className={["flex items-center gap-2 rounded-xl px-3 py-2 transition", item.active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50"].join(" ")}>
                <span className={["h-2 w-2 rounded-full", item.active ? "bg-blue-600" : "bg-slate-300"].join(" ")} />
                {item.label}
              </a>
            ))}
          </nav>
          <div className="mt-6 px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-[0.18em]">Account</div>
          <nav className="px-2 space-y-1 text-sm">
            {["My account", "Admin", "Support"].map((label) => (
              <a key={label} href="#" className="flex items-center gap-2 rounded-xl px-3 py-2 text-slate-700 hover:bg-slate-50 transition">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                {label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="flex-1 px-5 py-8">
          <div className="mx-auto max-w-6xl grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
            <section className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-indigo-600 text-white grid place-items-center text-2xl font-semibold">{avatar}</div>
                <div className="min-w-0">
                  <div className="text-lg font-semibold text-slate-900 truncate">{displayName}</div>
                  <div className="mt-1 text-sm text-slate-500">{user?.email ?? "Workspace Basic"}</div>
                </div>
                <div className="ml-auto">
                  <button type="button" className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Manage plan</button>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
                <div className="text-sm font-semibold text-slate-900">Quick join</div>
                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <input
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Room name"
                    className="h-11 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-300 focus:ring-2 focus:ring-blue-50 transition"
                  />
                  <button
                    type="button"
                    onClick={() => router.push(`/meeting/${encodeURIComponent(roomName.trim() || "draftmin-product-review")}/prejoin`)}
                    className="h-11 rounded-2xl bg-blue-600 px-6 text-sm font-semibold text-white hover:bg-blue-700 transition"
                  >
                    Join
                  </button>
                </div>
                <div className="mt-3 text-xs text-slate-500">Use any room name to start a shared meeting space.</div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
                <div className="text-lg font-semibold text-slate-900">Recent activity</div>
                <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                  <div className="text-sm font-semibold text-slate-700">No recent activity</div>
                  <div className="mt-2 text-sm text-slate-500">Your meetings and recordings will show up here.</div>
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Schedule", action: () => {} },
                  { label: "Join",     action: () => router.push(`/meeting/${encodeURIComponent(roomName.trim() || "draftmin-product-review")}/prejoin`) },
                  { label: "Host",     action: () => router.push(`/meeting/${encodeURIComponent(roomName.trim() || "draftmin-product-review")}/prejoin`) },
                ].map((item) => (
                  <button key={item.label} type="button" onClick={item.action} className="rounded-3xl border border-slate-200 bg-white shadow-sm p-4 hover:bg-slate-50 transition text-center">
                    <div className="mx-auto h-12 w-12 rounded-2xl bg-blue-600 text-white grid place-items-center text-sm font-semibold">{item.label.slice(0, 1)}</div>
                    <div className="mt-3 text-sm font-semibold text-slate-900">{item.label}</div>
                  </button>
                ))}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
                <div className="text-sm font-semibold text-slate-900">Personal meeting ID</div>
                <div className="mt-3 text-xl font-semibold text-slate-900">{personalMeetingId}</div>
                <div className="mt-1 text-sm text-slate-500">Share this ID to invite others.</div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">Meetings</div>
                  <a href="#" className="text-sm text-blue-600 hover:text-blue-700 transition">Visit meetings</a>
                </div>
                <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-900">No upcoming meetings</div>
                  <button type="button" className="mt-3 h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                    Test audio and video
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}

export function MeetingHome() {
  return (
    <AuthGuard>
      <MeetingHomeInner />
    </AuthGuard>
  );
}