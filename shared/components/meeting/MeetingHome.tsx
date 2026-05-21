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

/** Generates a random, readable room name like "swift-river-4821" */
function generateRoomName(): string {
  const adjectives = ["swift", "bright", "calm", "deep", "bold", "clear", "sharp", "steady", "grand", "silent"];
  const nouns = ["river", "summit", "valley", "forest", "harbor", "bridge", "canyon", "meadow", "peak", "lake"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${adj}-${noun}-${num}`;
}

type RecentMeeting = {
  id: string;
  room_name: string;
  title: string;
  created_at: string;
};

function MeetingHomeInner() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [recentMeetings, setRecentMeetings] = useState<RecentMeeting[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const avatar = useMemo(() => initialsFromName(displayName || "Guest"), [displayName]);

  // ── Auth + user info ────────────────────────────────────────────────────
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

  // ── Load real recent meetings ───────────────────────────────────────────
  useEffect(() => {
    async function loadRecent() {
      try {
        const { data, error } = await supabase
          .from("meetings")
          .select("id, room_name, title, created_at")
          .order("created_at", { ascending: false })
          .limit(5);

        if (!error && data) setRecentMeetings(data);
      } catch {
        // silently ignore — table may not exist yet
      } finally {
        setLoadingRecent(false);
      }
    }
    void loadRecent();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  const goToPrejoin = (room: string) => {
    const target = room.trim() || generateRoomName();
    router.push(`/meeting/${encodeURIComponent(target)}/prejoin`);
  };

  const startNewMeeting = () => {
    const room = generateRoomName();
    router.push(`/meeting/${encodeURIComponent(room)}/prejoin`);
  };

  return (
    <div className="min-h-screen bg-[#F4F6FB] text-slate-900">
      {/* ── Top nav ──────────────────────────────────────────────────────── */}
      <header className="h-14 border-b border-slate-200/80 bg-white/90 backdrop-blur sticky top-0 z-10 flex items-center justify-between px-5 gap-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 grid place-items-center text-white font-bold text-sm">D</div>
          <div className="text-sm font-semibold text-slate-800">Draftmin</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <button type="button" className="h-9 w-9 rounded-xl bg-indigo-600 text-white grid place-items-center text-sm font-semibold hover:bg-indigo-700 transition" title={displayName}>
              {avatar}
            </button>
            <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-all z-50">
              {user?.email && (
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900 truncate">{displayName}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
                </div>
              )}
              <button type="button" onClick={handleSignOut} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition rounded-b-2xl">
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-[240px] border-r border-slate-200/80 bg-white min-h-[calc(100vh-56px)] py-4 shrink-0">
          <nav className="px-3 space-y-0.5 text-sm">
            <div className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.18em]">Workspace</div>
            {[
              { label: "Home", active: true, icon: "⌂" },
              { label: "Meetings", icon: "◎" },
              { label: "Recordings", icon: "⏺" },
              { label: "Summaries", icon: "✦" },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                className={["flex items-center gap-2.5 w-full rounded-xl px-3 py-2 text-left transition", item.active ? "bg-blue-50 text-blue-700 font-medium" : "text-slate-600 hover:bg-slate-50"].join(" ")}
              >
                <span className="text-base leading-none opacity-70">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
          <div className="mt-auto px-3 pt-4 border-t border-slate-100">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700">{displayName || "Guest"}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{user?.email ?? "Not signed in"}</p>
            </div>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <main className="flex-1 px-4 py-8 md:px-6">
          <div className="mx-auto max-w-5xl grid gap-5 lg:grid-cols-[1fr_320px]">

            {/* Left column */}
            <section className="space-y-5">
              {/* Quick actions */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                <div className="text-sm font-semibold text-slate-900 mb-4">Start or join a meeting</div>
                <div className="flex gap-2">
                  <input
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && goToPrejoin(roomInput)}
                    placeholder="Enter room name…"
                    className="h-11 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
                  />
                  <button
                    type="button"
                    onClick={() => goToPrejoin(roomInput)}
                    className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition whitespace-nowrap"
                  >
                    Join
                  </button>
                </div>
                <p className="mt-2.5 text-xs text-slate-400">Enter a room name shared with you, or start a new one below.</p>
              </div>

              {/* Recent meetings */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-semibold text-slate-900">Recent meetings</div>
                </div>

                {loadingRecent ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
                    ))}
                  </div>
                ) : recentMeetings.length > 0 ? (
                  <div className="space-y-2">
                    {recentMeetings.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => goToPrejoin(m.room_name)}
                        className="w-full flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 px-4 py-3 text-left transition group"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-700 transition">
                            {m.title || m.room_name}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5 truncate">{m.room_name}</div>
                        </div>
                        <div className="text-xs text-slate-400 shrink-0">
                          {new Date(m.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
                    <div className="text-2xl mb-2 opacity-30">◎</div>
                    <div className="text-sm font-semibold text-slate-600">No recent meetings</div>
                    <div className="mt-1 text-xs text-slate-400">Meetings you join or host will appear here.</div>
                  </div>
                )}
              </div>
            </section>

            {/* Right column */}
            <aside className="space-y-4">
              {/* New meeting */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                <div className="text-sm font-semibold text-slate-900 mb-1">New meeting</div>
                <p className="text-xs text-slate-500 mb-4">Create a fresh room with a unique link to share.</p>
                <button
                  type="button"
                  onClick={startNewMeeting}
                  className="h-11 w-full rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition flex items-center justify-center gap-2"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Start new meeting
                </button>
              </div>

              {/* Profile card */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-indigo-600 text-white grid place-items-center text-lg font-semibold shrink-0">
                    {avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900 truncate">{displayName || "Guest"}</div>
                    <div className="text-xs text-slate-400 truncate mt-0.5">{user?.email ?? "Not signed in"}</div>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <div className="text-xs font-semibold text-blue-700 mb-2">💡 Tips</div>
                <ul className="space-y-1.5 text-xs text-blue-800/80 leading-relaxed">
                  <li>• Share the invite link from inside the meeting room.</li>
                  <li>• Each person gets a unique identity — no duplicates.</li>
                  <li>• Use a descriptive room name so others recognize it.</li>
                </ul>
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