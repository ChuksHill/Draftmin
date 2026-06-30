"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/shared/components/auth/AuthGuard";
import { supabase } from "@/shared/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return (
    (parts[0]?.[0] ?? "U") +
    (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")
  ).toUpperCase();
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 48) || "my-meeting"
  );
}

function getGreeting(name: string) {
  const h = new Date().getHours();
  const time = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return { time, name: name || "there" };
}

const MEETING_TYPES = [
  { value: "general", label: "📝 General" },
  { value: "board", label: "🏛️ Board" },
  { value: "standup", label: "⚡ Stand-up" },
  { value: "retro", label: "🔄 Retrospective" },
  { value: "workshop", label: "🛠️ Workshop" },
  { value: "client", label: "🤝 Client" },
] as const;
type MeetingTypeValue = (typeof MEETING_TYPES)[number]["value"];

type RecentMeeting = {
  id: string;
  room_name: string;
  title: string;
  created_at: string;
  _has_summary?: boolean;
};
type Metrics = { meetings: number; transcripts: number; summaries: number };

const CHECKLIST_KEY = "draftmin.onboarding";
type ChecklistItem = { id: string; label: string; detail: string };
const CHECKLIST: ChecklistItem[] = [
  {
    id: "first_meeting",
    label: "Start your first meeting",
    detail: 'Click "New meeting" and give it a name.',
  },
  {
    id: "enable_captions",
    label: "Enable live captions",
    detail: "Open the Captions panel inside any meeting.",
  },
  {
    id: "view_summary",
    label: "Read your first AI summary",
    detail: "End a meeting — your minutes are generated automatically.",
  },
];


/* ── New Meeting Modal ──────────────────────────────────────────────────── */
function NewMeetingModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [meetingTitle, setMeetingTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [meetingType, setMeetingType] = useState<MeetingTypeValue>("general");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const slug = slugify(meetingTitle || "");

  const handleCreate = async () => {
    const title = meetingTitle.trim();
    if (!title) {
      setError("Please enter a meeting name.");
      return;
    }
    if (creating) return;
    setCreating(true);
    window.localStorage.setItem("draftmin.meetingType", meetingType);
    window.localStorage.setItem("draftmin.meetingAgenda", agenda.trim());

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const settings = {
        meeting_type: meetingType,
        mute_on_entry: false,
        screen_share_disabled: false,
      };
      const { data: existing } = await supabase
        .from("meetings")
        .select("id")
        .eq("room_name", slug)
        .maybeSingle();

      let meetingId = existing?.id as string | undefined;
      if (meetingId) {
        await supabase
          .from("meetings")
          .update({ title, settings })
          .eq("id", meetingId);
        await supabase
          .from("meeting_agenda_items")
          .delete()
          .eq("meeting_id", meetingId);
      } else {
        const { data: created, error: createError } = await supabase
          .from("meetings")
          .insert({
            room_name: slug,
            title,
            host_id: user?.id ?? null,
            is_active: false,
            settings,
          })
          .select("id")
          .single();
        if (createError) throw createError;
        meetingId = created?.id;
      }

      const agendaItems = agenda
        .split(/\r?\n/)
        .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
        .filter(Boolean)
        .map((item, index) => ({
          meeting_id: meetingId,
          title: item,
          position: index + 1,
        }));

      if (meetingId && agendaItems.length) {
        const { error: agendaError } = await supabase
          .from("meeting_agenda_items")
          .insert(agendaItems);
        if (agendaError) console.warn("Agenda save error:", agendaError);
      }
    } catch (e) {
      console.warn("Meeting pre-create failed:", e);
    } finally {
      setCreating(false);
    }

    const savedName = window.localStorage.getItem("draftmin.displayName") || "Guest";
    const params = new URLSearchParams({ name: savedName, mic: "1", cam: "1", host: "1", title, type: meetingType });
    if (agenda.trim()) params.set("agenda", agenda.trim());
    router.push(`/meeting/${encodeURIComponent(slug)}?${params.toString()}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-5 bg-stone-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-6 sm:p-7 space-y-5 shadow-xl max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle on mobile */}
        <div className="mx-auto w-10 h-1 rounded-full bg-stone-200 sm:hidden -mt-1 mb-1" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium text-stone-900">New meeting</h2>
            <p className="text-sm text-stone-400 mt-0.5">
              Give your meeting a name and choose a type.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-stone-100 grid place-items-center text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition shrink-0"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {/* Meeting name */}
        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
            Meeting name <span className="text-red-400">*</span>
          </label>
          <input
            autoFocus
            value={meetingTitle}
            onChange={(e) => {
              setMeetingTitle(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="e.g. Q3 Planning, Team Standup…"
            className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 text-sm text-stone-900 placeholder:text-stone-300 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
          />
          {meetingTitle && (
            <p className="text-[11px] text-stone-400 mt-2 font-mono">
              Room: <span className="text-stone-600">{slug}</span>
            </p>
          )}
          {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>

        {/* Meeting type */}
        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
            Type
          </label>
          <div className="relative">
            <select
              value={meetingType}
              onChange={(e) =>
                setMeetingType(e.target.value as MeetingTypeValue)
              }
              className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 pr-10 text-sm text-stone-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition appearance-none cursor-pointer"
            >
              {MEETING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>

        {/* Agenda */}
        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
            Agenda
          </label>
          <textarea
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            placeholder={
              "One agenda item per line...\nBudget approval\nHiring plan\nProduct launch risks"
            }
            rows={4}
            className="w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 placeholder:text-stone-300 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
          />
          <p className="mt-2 text-[11px] text-stone-400">
            People joining before the host can read this agenda.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1 pb-safe">
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-full bg-stone-100 text-sm font-medium text-stone-600 hover:bg-stone-200 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="h-12 flex-1 rounded-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 text-sm font-medium text-white transition flex items-center justify-center gap-2"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-4 w-4"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            {creating ? "Creating..." : "Create meeting"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Onboarding Checklist ───────────────────────────────────────────────── */
function OnboardingChecklist({ onDismiss }: { onDismiss: () => void }) {
  const [done, setDone] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(CHECKLIST_KEY) ?? "[]");
    } catch {
      return [];
    }
  });

  const toggle = (id: string) => {
    const next = done.includes(id)
      ? done.filter((x) => x !== id)
      : [...done, id];
    setDone(next);
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(next));
  };

  const allDone = CHECKLIST.every((c) => done.includes(c.id));
  const pct = Math.round((done.length / CHECKLIST.length) * 100);

  return (
    <div className="rounded-2xl bg-stone-100 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-sm font-medium text-stone-800">
            Getting started
          </div>
          <div className="text-xs text-stone-400 mt-0.5">
            {done.length} of {CHECKLIST.length} done
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-stone-400 hover:text-stone-600 underline shrink-0 transition"
        >
          Dismiss
        </button>
      </div>

      <div className="h-1 w-full rounded-full bg-stone-200 mb-4 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-2">
        {CHECKLIST.map((item) => {
          const checked = done.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              className="flex items-start gap-3 w-full text-left rounded-xl p-3 bg-white hover:border-blue-200 border border-transparent transition group"
            >
              <div
                className={`mt-0.5 h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition ${
                  checked
                    ? "border-blue-600 bg-blue-600"
                    : "border-stone-300 group-hover:border-blue-300"
                }`}
              >
                {checked && (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-3 w-3 text-white"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <div className="min-w-0">
                <div
                  className={`text-sm font-medium ${
                    checked
                      ? "text-stone-400 line-through"
                      : "text-stone-800"
                  }`}
                >
                  {item.label}
                </div>
                <div className="text-xs text-stone-400 mt-0.5 leading-relaxed">
                  {item.detail}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {allDone && (
        <div className="mt-3 text-center text-xs text-emerald-700 font-medium bg-emerald-50 rounded-xl py-2 border border-emerald-100">
          🎉 You&apos;re all set! Draftmin is ready to use.
        </div>
      )}
    </div>
  );
}

/* ── Metric Card ────────────────────────────────────────────────────────── */
function MetricCard({
  label,
  value,
  loading,
  href,
}: {
  label: string;
  value: number;
  loading: boolean;
  href?: string;
}) {
  const router = useRouter();
  const base =
    "rounded-2xl bg-white border border-stone-100 px-5 py-4 sm:px-6 sm:py-5 text-left w-full group";

  const inner = (
    <>
      {loading ? (
        <div className="h-8 w-12 rounded-xl bg-stone-100 animate-pulse mb-2" />
      ) : (
        <div className="text-2xl sm:text-3xl font-medium text-stone-900 tracking-tight leading-none mb-2">
          {value}
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0" />
        <span className="text-xs sm:text-sm text-stone-400">
          {label} this month
        </span>
      </div>
    </>
  );

  if (href) {
    return (
      <button
        type="button"
        onClick={() => router.push(href)}
        className={`${base} hover:-translate-y-0.5 hover:border-blue-100 transition-transform duration-150`}
      >
        {inner}
      </button>
    );
  }
  return <div className={base}>{inner}</div>;
}

/* ── Nav Link Row ───────────────────────────────────────────────────────── */
const NAV_LINKS = [
  {
    label: "All meetings",
    href: "/meeting/list",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-4 w-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" />
        <rect x="3" y="8" width="12" height="10" rx="2" />
      </svg>
    ),
  },
  {
    label: "AI Summaries",
    href: "/meeting/summaries",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-4 w-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    label: "Recordings",
    href: "/meeting/recordings",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-4 w-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14" />
      </svg>
    ),
  },
];

/* ── Main Inner Component ───────────────────────────────────────────────── */
function MeetingHomeInner() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [recentMeetings, setRecentMeetings] = useState<RecentMeeting[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [metrics, setMetrics] = useState<Metrics>({
    meetings: 0,
    transcripts: 0,
    summaries: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);

  // Mobile: which panel is active — "home" | "nav-page"
  const [mobilePanel, setMobilePanel] = useState<"home" | string>("home");

  const avatar = useMemo(
    () => initialsFromName(displayName || "Guest"),
    [displayName]
  );
  const greeting = useMemo(() => getGreeting(displayName), [displayName]);

  useEffect(() => {
    const dismissed = localStorage.getItem("draftmin.onboarding.dismissed");
    if (!dismissed) setTimeout(() => setShowChecklist(true), 0);
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
        const name =
          u.user_metadata?.full_name ??
          u.user_metadata?.name ??
          u.email?.split("@")[0] ??
          "Guest";
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
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoadingRecent(false);
          return;
        }

        const { data, error } = await supabase
          .from("meetings")
          .select(
            "id, room_name, title, created_at, meeting_participants!inner(user_id)"
          )
          .eq("meeting_participants.user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(6);

        if (!error && data) {
          const enriched = await Promise.all(
            data.map(async (m) => {
              const { count } = await supabase
                .from("meeting_summaries")
                .select("*", { count: "exact", head: true })
                .eq("meeting_id", m.id);
              return {
                id: m.id,
                room_name: m.room_name,
                title: m.title,
                created_at: m.created_at,
                _has_summary: (count ?? 0) > 0,
              };
            })
          );
          setRecentMeetings(enriched);
        }
      } catch {
        /* ignore */
      } finally {
        setLoadingRecent(false);
      }
    }
    void loadRecent();
  }, []);

  useEffect(() => {
    async function loadMetrics() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setLoadingMetrics(false);
          return;
        }

        const now = new Date();
        const startOfMonth = new Date(
          now.getFullYear(),
          now.getMonth(),
          1
        ).toISOString();

        const { count: m } = await supabase
          .from("meeting_participants")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("joined_at", startOfMonth);

        const { count: s } = await supabase
          .from("meeting_summaries")
          .select(
            "id, meetings!inner(meeting_participants!inner(user_id))",
            { count: "exact", head: true }
          )
          .eq("meetings.meeting_participants.user_id", user.id)
          .gte("created_at", startOfMonth);

        setMetrics({ meetings: m ?? 0, transcripts: 0, summaries: s ?? 0 });
      } catch {
        /* ignore */
      } finally {
        setLoadingMetrics(false);
      }
    }
    void loadMetrics();
  }, []);

  const goToPrejoin = useCallback(
    (room: string) => {
      if (!room.trim()) return;
      const savedName = window.localStorage.getItem("draftmin.displayName") || displayName || "Guest";
      const savedType = window.localStorage.getItem("draftmin.meetingType") || "general";
      const params = new URLSearchParams({ name: savedName, mic: "1", cam: "1", type: savedType });
      router.push(`/meeting/${encodeURIComponent(room.trim())}?${params.toString()}`);
    },
    [router, displayName]
  );

  // On mobile, nav links open a sub-panel instead of routing directly.
  // On desktop (lg+), they always route.
  const handleNavLink = (href: string) => {
    // Use router on desktop — detect via window width isn't ideal in SSR,
    // so we just always route; the back button on sub-pages handles mobile.
    router.push(href);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="space-y-4 sm:space-y-6 lg:space-y-7">

          {/* ── Greeting ── */}
          <div className="flex items-start justify-between gap-3 pt-1">
            <div>
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-medium text-stone-900 tracking-tight leading-tight">
                {greeting.time},{" "}
                <span className="text-blue-600">{greeting.name}</span>{" "}
                <span aria-hidden="true">👋</span>
              </h1>
              <p className="text-xs sm:text-sm text-stone-400 mt-1">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowNewMeetingModal(true)}
              className="flex items-center gap-1.5 sm:gap-2 h-9 sm:h-11 rounded-full bg-blue-600 px-3 sm:px-5 text-xs sm:text-sm font-medium text-white hover:bg-blue-700 active:scale-95 transition shrink-0"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span className="hidden xs:inline">New meeting</span>
              <span className="xs:hidden">New</span>
            </button>
          </div>

          {/* ── Metrics ── */}
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            <MetricCard
              label="Meetings"
              value={metrics.meetings}
              loading={loadingMetrics}
              href="/meeting/list"
            />
            <MetricCard
              label="Transcripts"
              value={metrics.transcripts}
              loading={loadingMetrics}
            />
            <MetricCard
              label="Summaries"
              value={metrics.summaries}
              loading={loadingMetrics}
              href="/meeting/summaries"
            />
          </div>

          {/* ── Main layout ── */}
          <div className="grid gap-4 sm:gap-5 lg:grid-cols-[1fr_300px]">

            {/* ── Left column ── */}
            <div className="space-y-4 sm:space-y-5">

              {/* Join meeting */}
              <div className="rounded-2xl bg-white border border-stone-100 p-4 sm:p-6">
                <div className="text-sm sm:text-base font-medium text-stone-900 mb-1">
                  Join a meeting
                </div>
                <p className="text-xs sm:text-sm text-stone-400 mb-3 sm:mb-5 leading-relaxed">
                  Paste a room name or link shared by your host.
                </p>
                <div className="flex gap-2">
                  <input
                    value={roomInput}
                    onChange={(e) => setRoomInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && goToPrejoin(roomInput)
                    }
                    placeholder="Room name or link…"
                    className="h-10 sm:h-12 flex-1 rounded-full border border-stone-200 bg-stone-50 px-4 sm:px-5 text-sm text-stone-900 placeholder:text-stone-300 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition min-w-0"
                  />
                  <button
                    type="button"
                    onClick={() => goToPrejoin(roomInput)}
                    disabled={!roomInput.trim()}
                    className="h-10 sm:h-12 rounded-full bg-blue-600 px-4 sm:px-6 text-sm font-medium text-white hover:bg-blue-700 active:scale-95 disabled:opacity-35 transition whitespace-nowrap shrink-0"
                  >
                    Join →
                  </button>
                </div>
              </div>

              {/* Recent meetings */}
              <div className="rounded-2xl bg-white border border-stone-100 p-4 sm:p-6">
                <div className="flex items-center justify-between mb-3 sm:mb-5">
                  <div className="text-sm sm:text-base font-medium text-stone-900">
                    Recent meetings
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/meeting/list")}
                    className="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-700 transition"
                  >
                    View all →
                  </button>
                </div>

                {loadingRecent ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-14 rounded-xl bg-stone-100 animate-pulse"
                      />
                    ))}
                  </div>
                ) : recentMeetings.length > 0 ? (
                  <div className="space-y-2">
                    {recentMeetings.map((m) => (
                      <div key={m.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => goToPrejoin(m.room_name)}
                          className="flex-1 flex items-center gap-2 sm:gap-3 rounded-xl border border-stone-100 bg-stone-50 hover:bg-blue-50 hover:border-blue-100 px-3 sm:px-4 py-2.5 sm:py-3 text-left transition group min-w-0"
                        >
                          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-blue-50 border border-blue-100 grid place-items-center shrink-0">
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            >
                              <path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" />
                              <rect x="3" y="8" width="12" height="10" rx="2" />
                            </svg>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs sm:text-sm font-medium text-stone-800 truncate group-hover:text-blue-700 transition">
                              {m.title || m.room_name}
                            </div>
                            <div className="text-[10px] sm:text-xs text-stone-400 font-mono mt-0.5 truncate">
                              {m.room_name}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {m._has_summary && (
                              <span className="text-[9px] sm:text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5 hidden xs:inline-flex">
                                Summary
                              </span>
                            )}
                            <span className="text-[10px] sm:text-xs text-stone-400">
                              {new Date(m.created_at).toLocaleDateString(
                                undefined,
                                { month: "short", day: "numeric" }
                              )}
                            </span>
                          </div>
                        </button>
                        {m._has_summary && (
                          <button
                            type="button"
                            onClick={() =>
                              router.push("/meeting/summaries")
                            }
                            title="View AI minutes"
                            className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-blue-100 bg-blue-50 grid place-items-center text-blue-600 hover:bg-blue-100 transition shrink-0"
                          >
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                              <polyline points="14 2 14 8 20 8" />
                              <line x1="16" y1="13" x2="8" y2="13" />
                            </svg>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 py-8 sm:py-12 text-center">
                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-stone-100 grid place-items-center mx-auto mb-2 sm:mb-3">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        className="h-4 w-4 sm:h-5 sm:w-5 text-stone-300"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      >
                        <path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" />
                        <rect x="3" y="8" width="12" height="10" rx="2" />
                      </svg>
                    </div>
                    <div className="text-sm font-medium text-stone-500">
                      No meetings yet
                    </div>
                    <div className="mt-1 text-xs text-stone-400">
                      Start one above and it&apos;ll show up here.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Right column ── */}
            <div className="space-y-3 sm:space-y-4">

              {/* Start meeting CTA */}
              <div className="rounded-2xl bg-blue-600 p-4 sm:p-6">
                <div className="text-sm sm:text-base font-medium text-white mb-1">
                  Start a meeting
                </div>
                <p className="text-xs sm:text-sm text-blue-200 mb-4 leading-relaxed">
                  Create a named room and share the link with your team.
                </p>
                <button
                  type="button"
                  onClick={() => setShowNewMeetingModal(true)}
                  className="h-10 sm:h-11 w-full rounded-full bg-white text-blue-600 text-sm font-medium hover:bg-blue-50 active:scale-[0.98] transition flex items-center justify-center gap-2"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  New meeting
                </button>
              </div>

              {/* Quick nav */}
              <div className="rounded-2xl bg-white border border-stone-100 p-4 sm:p-5">
                <div className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-3">
                  Navigate
                </div>
                {NAV_LINKS.map((link) => (
                  <button
                    key={link.href}
                    type="button"
                    onClick={() => handleNavLink(link.href)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-500 hover:bg-blue-50 hover:text-blue-700 transition group"
                  >
                    <span className="text-stone-300 group-hover:text-blue-500 transition">
                      {link.icon}
                    </span>
                    {link.label}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-3.5 w-3.5 ml-auto text-stone-300 group-hover:text-blue-400 transition"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                ))}
              </div>

              {/* Onboarding checklist */}
              {showChecklist && (
                <OnboardingChecklist onDismiss={dismissChecklist} />
              )}

              {/* Profile card */}
              <div className="rounded-2xl bg-white border border-stone-100 p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 grid place-items-center text-xs sm:text-sm font-medium shrink-0">
                    {avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-stone-900 truncate">
                      {displayName || "Guest"}
                    </div>
                    <div className="text-xs text-stone-400 truncate mt-0.5">
                      {user?.email ?? "Not signed in"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New meeting modal */}
      {showNewMeetingModal && (
        <NewMeetingModal onClose={() => setShowNewMeetingModal(false)} />
      )}
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