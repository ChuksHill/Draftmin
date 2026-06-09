"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/shared/lib/supabase/client";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type Transcript = {
  id: string;
  meeting_id: string;
  speaker_name: string;
  transcript_text: string;
  created_at: string;
  meetings: { id: string; room_name: string; title: string } | null;
};

type GroupedMeeting = {
  meetingId: string;
  roomName: string;
  title: string;
  transcripts: Transcript[];
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */
function groupByMeeting(transcripts: Transcript[]): GroupedMeeting[] {
  const map = new Map<string, GroupedMeeting>();
  for (const t of transcripts) {
    const m = map.get(t.meeting_id) ?? {
      meetingId: t.meeting_id,
      roomName: t.meetings?.room_name ?? "Unknown",
      title: t.meetings?.title ?? "Untitled",
      transcripts: [],
    };
    m.transcripts.push(t);
    map.set(t.meeting_id, m);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.transcripts[0]?.created_at ?? 0).getTime() - new Date(a.transcripts[0]?.created_at ?? 0).getTime()
  );
}

function displayDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/* ─── Component ─────────────────────────────────────────────────────────── */
export function RecordingsView() {
  const [groups, setGroups] = useState<GroupedMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("transcripts")
          .select(`id, meeting_id, speaker_name, transcript_text, created_at,
            meetings(id, room_name, title)`)
          .order("created_at", { ascending: false })
          .limit(200);
        if (data) setGroups(groupByMeeting(data as unknown as Transcript[]));
      } catch { /* ignore */ } finally { setLoading(false); }
    }
    void load();
  }, []);

  const copyMeetingTranscript = (g: GroupedMeeting) => {
    const text = g.transcripts
      .slice()
      .reverse()
      .map((t) => `${t.speaker_name}: ${t.transcript_text}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    setCopied(g.meetingId);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Meeting Recordings</h1>
          <p className="text-sm text-slate-500 mt-0.5">Raw transcripts from your meetings.</p>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Meeting Recordings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Raw transcripts from your meetings.</p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <p className="text-sm font-medium text-slate-500">No recordings yet</p>
          <p className="text-xs text-slate-400 mt-1">Transcripts appear here automatically as meetings are held.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.meetingId} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(expanded === g.meetingId ? null : g.meetingId)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition"
              >
                <div className="text-left min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">{g.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-slate-400">{g.roomName}</span>
                    <span className="text-[11px] text-slate-300">·</span>
                    <span className="text-[11px] text-slate-400">{g.transcripts.length} lines</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); copyMeetingTranscript(g); }}
                    className={`h-7 rounded-lg border px-2.5 text-[10px] font-medium transition ${
                      copied === g.meetingId
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {copied === g.meetingId ? "✓ Copied" : "Copy all"}
                  </button>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    className={`h-4 w-4 text-slate-400 transition-transform ${expanded === g.meetingId ? "rotate-180" : ""}`}
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </button>

              {expanded === g.meetingId && (
                <div className="border-t border-slate-100 px-5 py-4 space-y-2 max-h-96 overflow-y-auto">
                  {g.transcripts
                    .slice()
                    .reverse()
                    .map((t) => (
                      <div key={t.id} className="flex gap-3 text-sm">
                        <span className="text-blue-600 font-medium shrink-0">{t.speaker_name}:</span>
                        <span className="text-slate-600">{t.transcript_text}</span>
                        <span className="text-[10px] text-slate-300 shrink-0 ml-auto">{displayDate(t.created_at)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}