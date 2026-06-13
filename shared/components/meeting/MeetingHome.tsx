"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/shared/components/auth/AuthGuard";
import { supabase } from "@/shared/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return ((parts[0]?.[0] ?? "U") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toUpperCase();
}

function generateRoomName(): string {
  const adj = ["swift","bright","calm","deep","bold","clear","sharp","steady","grand","silent"];
  const noun = ["river","summit","valley","forest","harbor","bridge","canyon","meadow","peak","lake"];
  return `${adj[Math.floor(Math.random()*adj.length)]}-${noun[Math.floor(Math.random()*noun.length)]}-${Math.floor(1000+Math.random()*9000)}`;
}

function getGreeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return `${time}, ${name || "there"}`;
}

type RecentMeeting = { id: string; room_name: string; title: string; created_at: string };
type Metrics = { meetings: number; transcripts: number; summaries: number };

const CHECKLIST_KEY = "draftmin.onboarding";
type ChecklistItem = { id: string; label: string; detail: string };
const CHECKLIST: ChecklistItem[] = [
  { id: "first_meeting",   label: "Start your first meeting",       detail: "Click \"Start new meeting\" and invite a colleague." },
  { id: "enable_captions", label: "Enable live captions",          detail: "Open the Captions panel inside any meeting." },
  { id: "view_summary",    label: "Read your first AI summary",    detail: "End a meeting — your minutes are generated automatically." },
];

function OnboardingChecklist({ onDismiss }: { onDismiss: () => void }) {
  const [done, setDone] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? "[]"); } catch { return []; }
  });

  const toggle = (id: string) => {
    const next = done.includes(id) ? done.filter(x => x !== id) : [...done, id];
    setDone(next);
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
  };

  const allDone = CHECKLIST.every(c => done.includes(c.id));

  return (
    <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <div className="text-sm font-semibold text-slate-800">Getting started</div>
          <div className="text-xs text-slate-500 mt-0.5">{done.length} of {CHECKLIST.length} complete</div>
        </div>
        <button type="button" onClick={onDismiss}
          className="text-slate-400 hover:text-slate-600 transition text-xs underline shrink-0">
          Dismiss
        </button>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 w-full rounded-full bg-blue-100 mb-4 overflow-hidden">
        <div className="h-full rounded-full bg-blue-500 transition-all duration-500"
          style={{ width: `${(done.length / CHECKLIST.length) * 100}%` }} />
      </div>
      <div className="space-y-2.5">
        {CHECKLIST.map(item => {
          const checked = done.includes(item.id);
          return (
            <button key={item.id} type="button" onClick={() => toggle(item.id)}
              className="flex items-start gap-3 w-full text-left rounded-xl p-3 bg-white/70 hover:bg-white border border-white/80 hover:border-blue-200 transition group">
              <div className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${checked ? "border-blue-500 bg-blue-500" : "border-slate-300 group-hover:border-blue-300"}`}>
                {checked && <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 text-white" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>}
              </div>
              <div className="min-w-0">
                <div className={`text-sm font-medium ${checked ? "text-slate-400 line-through" : "text-slate-800"}`}>{item.label}</div>
                <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{item.detail}</div>
              </div>
            </button>
          );
        })}
      </div>
      {allDone && (
        <div className="mt-3 text-center text-xs text-emerald-600 font-medium bg-emerald-50 rounded-xl py-2 border border-emerald-100">
          🎉 You&apos;re all set! Draftmin is ready to use.
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, icon, loading }: { label: string; value: number; icon: React.ReactNode; loading: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <span className="text-slate-300">{icon}</span>
      </div>
      {loading
        ? <div className="h-7 w-12 rounded-lg bg-slate-100 animate-pulse" />
        : <div className="text-2xl font-bold text-slate-900">{value}</div>}
      <div className="text-[11px] text-slate-400 mt-0.5">this month</div>
    </div>
  );
}

function MeetingHomeInner() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [recentMeetings, setRecentMeetings] = useState<RecentMeeting[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [metrics, setMetrics] = useState<Metrics>({ meetings: 0, transcripts: 0, summaries: 0 });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [showChecklist, setShowChecklist] = useState(false);

  const avatar = useMemo(() => initialsFromName(displayName || "Guest"), [displayName]);

  useEffect(() => {
    // Only show checklist if user hasn't dismissed it
    const dismissed = localStorage.getItem("draftmin.onboarding.dismissed");
    if (!dismissed) setShowChecklist(true);
  }, []);

  const dismissChecklist = () => {
    localStorage.setItem("draftmin.onboarding.dismissed", "1");
    setShowChecklist(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      if (u) {
        const name = u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email?.split("@")[0] ?? "Guest";
        setDisplayName(name);
        window.localStorage.setItem("draftmin.displayName", name);
      } else {
        const saved = window.localStorage.getItem("draftmin.displayName");
        if (saved?.trim()) setDisplayName(saved);
      }
    });
  }, []);

  useEffect(() => {
    async function loadRecent() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoadingRecent(false); return; }

        const { data, error } = await supabase
          .from("meetings")
          .select("id, room_name, title, created_at, meeting_participants!inner(user_id)")
          .eq("meeting_participants.user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(6);
          
        if (!error && data) {
          // Map to remove the nested meeting_participants array from the type
          setRecentMeetings(data.map(m => ({
            id: m.id, room_name: m.room_name, title: m.title, created_at: m.created_at
          })));
        }
      } catch { /* ignore */ } finally { setLoadingRecent(false); }
    }
    void loadRecent();
  }, []);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoadingMetrics(false); return; }

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        
        // My meetings
        const { count: m } = await supabase
          .from("meeting_participants")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("joined_at", startOfMonth);

        // Summaries for my meetings
        const { count: s } = await supabase
          .from("meeting_summaries")
          .select("id, meetings!inner(meeting_participants!inner(user_id))", { count: "exact", head: true })
          .eq("meetings.meeting_participants.user_id", user.id)
          .gte("created_at", startOfMonth);

        setMetrics({ meetings: m ?? 0, transcripts: 0, summaries: s ?? 0 });
      } catch { /* ignore */ } finally { setLoadingMetrics(false); }
    }
    void loadMetrics();
  }, []);

  const goToPrejoin = useCallback((room: string) => {
    const target = room.trim() || generateRoomName();
    router.push(`/meeting/${encodeURIComponent(target)}/prejoin`);
  }, [router]);

  const startNewMeeting = useCallback(() => {
    const room = generateRoomName();
    router.push(`/meeting/${encodeURIComponent(room)}/prejoin?host=1`);
  }, [router]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ── Greeting ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{getGreeting(displayName)}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <button type="button" onClick={startNewMeeting}
          className="flex items-center justify-center gap-2 h-11 w-11 sm:w-auto rounded-xl bg-blue-600 sm:px-5 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition shrink-0">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          <span className="hidden sm:inline">New meeting</span>
        </button>
      </div>

      {/* ── Metrics ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <MetricCard label="Meetings" value={metrics.meetings} loading={loadingMetrics}
          icon={<svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" /><rect x="3" y="8" width="12" height="10" rx="2" /></svg>} />
        <MetricCard label="Transcripts" value={metrics.transcripts} loading={loadingMetrics}
          icon={<svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" /><path d="M19 10v1a7 7 0 01-14 0v-1" /></svg>} />
        <MetricCard label="AI Summaries" value={metrics.summaries} loading={loadingMetrics}
          icon={<svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* ── Left column ────────────────────────────────────────────────── */}
        <div className="space-y-5">
          {/* Join / Start */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
            <div className="text-sm font-semibold text-slate-900 mb-4">Start or join a meeting</div>
            <div className="flex gap-2">
              <input value={roomInput} onChange={e => setRoomInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && goToPrejoin(roomInput)}
                placeholder="Paste a room name or meeting link…"
                className="h-11 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100 transition min-w-0" />
              <button type="button" onClick={() => goToPrejoin(roomInput)}
                className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 active:scale-95 transition whitespace-nowrap shrink-0">
                Join
              </button>
            </div>
            <p className="mt-2.5 text-xs text-slate-400">Enter a room name someone shared, or create your own below.</p>
          </div>

          {/* Recent meetings */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
            <div className="text-sm font-semibold text-slate-900 mb-4">Recent meetings</div>
            {loadingRecent ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}
              </div>
            ) : recentMeetings.length > 0 ? (
              <div className="space-y-2">
                {recentMeetings.map(m => (
                  <button key={m.id} type="button" onClick={() => goToPrejoin(m.room_name)}
                    className="w-full flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 px-4 py-3 text-left transition group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 grid place-items-center shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-blue-600" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" /><rect x="3" y="8" width="12" height="10" rx="2" /></svg>
                      </div>
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
                <div className="h-10 w-10 rounded-xl bg-slate-100 grid place-items-center mx-auto mb-3">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-slate-400" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" /><rect x="3" y="8" width="12" height="10" rx="2" /></svg>
                </div>
                <div className="text-sm font-semibold text-slate-600">No recent meetings</div>
                <div className="mt-1 text-xs text-slate-400">Start a new meeting to see your history here.</div>
              </div>
            )}
          </div>
        </div>

        {/* ── Right column ───────────────────────────────────────────────── */}
        <div className="space-y-4">
          {/* New meeting CTA */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
            <div className="text-sm font-semibold text-slate-900 mb-1">New meeting</div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">Generate a unique room with a shareable invite link.</p>
            <button type="button" onClick={startNewMeeting}
              className="h-11 w-full rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition flex items-center justify-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              Start new meeting
            </button>
          </div>

          {/* Onboarding checklist (hidden after dismiss or all done) */}
          {showChecklist && <OnboardingChecklist onDismiss={dismissChecklist} />}

          {/* Profile card */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white grid place-items-center text-base font-semibold shrink-0">
                {avatar}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">{displayName || "Guest"}</div>
                <div className="text-xs text-slate-400 truncate mt-0.5">{user?.email ?? "Not signed in"}</div>
              </div>
            </div>
          </div>
        </div>
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
