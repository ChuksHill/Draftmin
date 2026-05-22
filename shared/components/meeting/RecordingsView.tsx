"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/shared/components/layout/DashboardShell";
import { supabase } from "@/shared/lib/supabase/client";

type TranscriptRow = {
  id: number;
  created_at: string;
  speaker_name: string;
  transcript_text: string;
  meeting_id: string;
};

type MeetingInfo = {
  id: string;
  title: string;
  room_name: string;
  created_at: string;
};

type GroupedMeeting = MeetingInfo & { transcripts: TranscriptRow[] };

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 animate-pulse space-y-3">
      <div className="h-4 bg-slate-100 rounded w-1/3" />
      <div className="h-3 bg-slate-100 rounded w-1/2" />
      <div className="space-y-2 pt-2">
        <div className="h-3 bg-slate-100 rounded w-full" />
        <div className="h-3 bg-slate-100 rounded w-4/5" />
        <div className="h-3 bg-slate-100 rounded w-3/4" />
      </div>
    </div>
  );
}

function TranscriptBlock({ speaker, text }: { speaker: string; text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 280;
  const display = !expanded && isLong ? text.slice(0, 280) + "…" : text;

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 grid place-items-center text-[10px] font-bold shrink-0">
          {speaker.charAt(0).toUpperCase()}
        </div>
        <span className="text-xs font-semibold text-slate-700">{speaker}</span>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed pl-8">{display}</p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="pl-8 text-xs text-blue-600 hover:underline"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

export function RecordingsView() {
  const [groups, setGroups] = useState<GroupedMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Load transcripts joined with meetings
        const { data: transcripts, error: tErr } = await supabase
          .from("transcripts")
          .select("id, created_at, speaker_name, transcript_text, meeting_id")
          .order("created_at", { ascending: true });
        if (tErr) throw tErr;

        if (!transcripts || transcripts.length === 0) {
          setGroups([]);
          return;
        }

        // Get unique meeting IDs
        const meetingIds = [...new Set(transcripts.map((t) => t.meeting_id))];

        const { data: meetings, error: mErr } = await supabase
          .from("meetings")
          .select("id, title, room_name, created_at")
          .in("id", meetingIds)
          .order("created_at", { ascending: false });
        if (mErr) throw mErr;

        const meetingMap = new Map((meetings ?? []).map((m) => [m.id, m]));

        const grouped: GroupedMeeting[] = meetingIds.map((mid) => {
          const meeting = meetingMap.get(mid) ?? {
            id: mid, title: "Unknown Meeting", room_name: mid, created_at: new Date().toISOString(),
          };
          return {
            ...meeting,
            transcripts: transcripts.filter((t) => t.meeting_id === mid),
          };
        });

        // Sort by meeting created_at desc
        grouped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        setGroups(grouped);

        // Auto-expand the first group
        if (grouped.length > 0 && grouped[0]) setExpandedMeeting(grouped[0].id);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load recordings.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = groups.filter((g) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      g.title.toLowerCase().includes(q) ||
      g.room_name.toLowerCase().includes(q) ||
      g.transcripts.some(
        (t) =>
          t.speaker_name.toLowerCase().includes(q) ||
          t.transcript_text.toLowerCase().includes(q)
      )
    );
  });

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Recordings</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Speech-to-text transcripts from your meetings.
          </p>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transcripts, speakers, or meetings…"
          autoComplete="off"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
        />

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">{[1, 2, 3].map((i) => <SkeletonCard key={i} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <div className="text-3xl mb-3 opacity-20">⏺</div>
            <p className="text-sm font-semibold text-slate-600">
              {search ? "No matching transcripts" : "No recordings yet"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {search
                ? "Try a different search."
                : "Transcripts are saved automatically when captions are enabled in a meeting."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((g) => {
              const isOpen = expandedMeeting === g.id;
              const speakerCount = new Set(g.transcripts.map((t) => t.speaker_name)).size;
              return (
                <div key={g.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  {/* Meeting header row */}
                  <button
                    type="button"
                    onClick={() => setExpandedMeeting(isOpen ? null : g.id)}
                    className="w-full flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition text-left"
                    aria-expanded={isOpen}
                  >
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-100 to-indigo-100 border border-violet-200/60 grid place-items-center text-violet-600 shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                        <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
                        <path d="M19 10v1a7 7 0 01-14 0v-1M12 19v3m-3 0h6" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-slate-900 truncate">{g.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-slate-400 font-mono truncate">{g.room_name}</span>
                        <span className="text-slate-200">·</span>
                        <span className="text-xs text-slate-400 shrink-0">
                          {new Date(g.created_at).toLocaleDateString(undefined, {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </span>
                        <span className="text-slate-200">·</span>
                        <span className="text-xs text-slate-400 shrink-0">
                          {g.transcripts.length} segments · {speakerCount} speaker{speakerCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <svg
                      viewBox="0 0 24 24" fill="none" className={`h-4 w-4 text-slate-400 transition-transform shrink-0 ${isOpen ? "rotate-180" : ""}`}
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>

                  {/* Transcript body */}
                  {isOpen && (
                    <div className="px-5 pb-5 space-y-2 border-t border-slate-100 pt-4">
                      {g.transcripts.map((t) => (
                        <TranscriptBlock key={t.id} speaker={t.speaker_name} text={t.transcript_text} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
