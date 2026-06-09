"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/shared/lib/supabase/client";

type Meeting = {
  id: string; room_name: string; title: string;
  created_at: string; is_active: boolean;
  _summary_count?: number; _transcript_count?: number;
};

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-100 animate-pulse">
      <div className="h-10 w-10 rounded-xl bg-slate-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-36 bg-slate-200 rounded" />
        <div className="h-2.5 w-24 bg-slate-200 rounded" />
      </div>
      <div className="h-6 w-16 bg-slate-200 rounded-full" />
    </div>
  );
}

export function MeetingsList() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "with_summary">("all");

  useEffect(() => {
    async function load() {
      try {
        const { data: meetingsData, error } = await supabase
          .from("meetings")
          .select("id, room_name, title, created_at, is_active")
          .order("created_at", { ascending: false })
          .limit(50);

        if (error || !meetingsData) return;

        // Enrich with summary and transcript counts
        const enriched = await Promise.all(
          meetingsData.map(async m => {
            const [{ count: sc }, { count: tc }] = await Promise.all([
              supabase.from("meeting_summaries").select("*", { count: "exact", head: true }).eq("meeting_id", m.id),
              supabase.from("transcripts").select("*", { count: "exact", head: true }).eq("meeting_id", m.id),
            ]);
            return { ...m, _summary_count: sc ?? 0, _transcript_count: tc ?? 0 };
          })
        );

        setMeetings(enriched);
      } catch { /* ignore */ } finally { setLoading(false); }
    }
    void load();
  }, []);

  const filtered = meetings.filter(m => {
    const matchSearch = !search.trim() ||
      m.title?.toLowerCase().includes(search.toLowerCase()) ||
      m.room_name?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || (filter === "with_summary" && (m._summary_count ?? 0) > 0);
    return matchSearch && matchFilter;
  });

  const grouped = filtered.reduce<Record<string, Meeting[]>>((acc, m) => {
    const key = new Date(m.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Meetings</h1>
        <p className="text-sm text-slate-500 mt-0.5">All your past and upcoming meeting sessions.</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <svg viewBox="0 0 24 24" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search meetings…"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition" />
        </div>
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1">
          {(["all", "with_summary"] as const).map(f => (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition whitespace-nowrap ${filter === f ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-700"}`}>
              {f === "all" ? "All meetings" : "Has summary"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 grid place-items-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6 text-slate-400" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" />
              <rect x="3" y="8" width="12" height="10" rx="2" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-slate-600">{search ? "No meetings found" : "No meetings yet"}</p>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
            {search ? "Try different keywords." : "Start a meeting from the home screen — it will appear here automatically."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([month, items]) => (
            <div key={month}>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 px-1">{month}</h2>
              <div className="space-y-2">
                {items.map(m => (
                  <button key={m.id} type="button"
                    onClick={() => router.push(`/meeting/${encodeURIComponent(m.room_name)}/prejoin`)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/40 transition group text-left">
                    {/* Icon */}
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 grid place-items-center shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-blue-600" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" />
                        <rect x="3" y="8" width="12" height="10" rx="2" />
                      </svg>
                    </div>

                    {/* Title + meta */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700 transition">
                        {m.title || m.room_name}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-400 font-mono">{m.room_name}</span>
                        <span className="text-xs text-slate-400">
                          {new Date(m.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      {(m._transcript_count ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-100 rounded-full px-2 py-0.5">
                          <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                            <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
                          </svg>
                          Transcript
                        </span>
                      )}
                      {(m._summary_count ?? 0) > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                          <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                          Summary
                        </span>
                      )}
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-slate-300 group-hover:text-blue-400 transition ml-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
