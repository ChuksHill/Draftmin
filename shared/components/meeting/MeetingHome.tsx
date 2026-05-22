"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/shared/components/layout/DashboardShell";
import { supabase } from "@/shared/lib/supabase/client";

function generateRoomName(): string {
  const adjectives = ["swift","bright","calm","deep","bold","clear","sharp","steady","grand","silent"];
  const nouns = ["river","summit","valley","forest","harbor","bridge","canyon","meadow","peak","lake"];
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
  is_active: boolean;
};

export function MeetingHome() {
  const router = useRouter();
  const [roomInput, setRoomInput] = useState("");
  const [recentMeetings, setRecentMeetings] = useState<RecentMeeting[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  useEffect(() => {
    async function loadRecent() {
      try {
        const { data, error } = await supabase
          .from("meetings")
          .select("id, room_name, title, created_at, is_active")
          .order("created_at", { ascending: false })
          .limit(5);
        if (!error && data) setRecentMeetings(data);
      } catch { /* silently ignore */ }
      finally { setLoadingRecent(false); }
    }
    void loadRecent();
  }, []);

  const goToPrejoin = (room: string) => {
    const target = room.trim() || generateRoomName();
    router.push(`/meeting/${encodeURIComponent(target)}/prejoin`);
  };

  return (
    <DashboardShell>
      <div className="mx-auto max-w-5xl grid gap-5 xl:grid-cols-[1fr_300px]">
        {/* Left column */}
        <section className="space-y-5 min-w-0">
          {/* Quick actions */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
            <div className="text-sm font-semibold text-slate-900 mb-4">Start or join a meeting</div>
            <div className="flex gap-2">
              <input
                value={roomInput}
                onChange={(e) => setRoomInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && goToPrejoin(roomInput)}
                placeholder="Enter room name…"
                autoComplete="off"
                className="h-11 flex-1 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
              />
              <button
                type="button"
                onClick={() => goToPrejoin(roomInput)}
                className="h-11 rounded-xl bg-blue-600 px-4 sm:px-5 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition whitespace-nowrap shrink-0"
              >
                Join
              </button>
            </div>
            <p className="mt-2.5 text-xs text-slate-400">Enter a room name shared with you, or start a new one below.</p>
          </div>

          {/* Recent meetings */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
            <div className="text-sm font-semibold text-slate-900 mb-4">Recent meetings</div>
            {loadingRecent ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}
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
                    <div className="min-w-0 flex items-center gap-3">
                      {m.is_active && <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />}
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-700 transition">{m.title || m.room_name}</div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5 truncate">{m.room_name}</div>
                      </div>
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
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5">
            <div className="text-sm font-semibold text-slate-900 mb-1">New meeting</div>
            <p className="text-xs text-slate-500 mb-4">Create a fresh room with a unique link to share.</p>
            <button
              type="button"
              onClick={() => goToPrejoin(generateRoomName())}
              className="h-11 w-full rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              Start new meeting
            </button>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 sm:p-5">
            <div className="text-xs font-semibold text-blue-700 mb-2">💡 Tips</div>
            <ul className="space-y-1.5 text-xs text-blue-800/80 leading-relaxed">
              <li>• Share the invite link from inside the meeting room.</li>
              <li>• Each person gets a unique identity — no duplicates.</li>
              <li>• Use a descriptive room name so others recognize it.</li>
            </ul>
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}
