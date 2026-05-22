"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/shared/components/layout/DashboardShell";
import { supabase } from "@/shared/lib/supabase/client";

type Meeting = {
  id: string;
  room_name: string;
  title: string;
  created_at: string;
  is_active: boolean;
  host_id: string | null;
};

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
      Live
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-500">
      Ended
    </span>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-slate-100 last:border-0 animate-pulse">
      <div className="h-9 w-9 rounded-xl bg-slate-100 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2">
        <div className="h-3.5 bg-slate-100 rounded w-1/3" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
      </div>
      <div className="h-6 w-14 rounded-full bg-slate-100" />
    </div>
  );
}

export function MeetingsList() {
  const router = useRouter();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "live" | "ended">("all");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("meetings")
          .select("id, room_name, title, created_at, is_active, host_id")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setMeetings(data ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load meetings.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const filtered = meetings.filter((m) => {
    const matchSearch =
      !search ||
      m.title.toLowerCase().includes(search.toLowerCase()) ||
      m.room_name.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === "all" ||
      (filter === "live" && m.is_active) ||
      (filter === "ended" && !m.is_active);
    return matchSearch && matchFilter;
  });

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Meetings</h1>
            <p className="text-sm text-slate-500 mt-0.5">All past and active meetings.</p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/meeting")}
            className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 transition flex items-center gap-2 self-start sm:self-auto"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            New meeting
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col xs:flex-row gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or room…"
            autoComplete="off"
            className="h-10 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
          />
          <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden shrink-0">
            {(["all", "live", "ended"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={[
                  "flex-1 xs:flex-none px-3 h-10 text-sm font-medium transition capitalize",
                  filter === f
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Table card */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          {error ? (
            <div className="py-12 text-center">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : loading ? (
            <>
              {[1, 2, 3, 4].map((i) => <SkeletonRow key={i} />)}
            </>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="text-3xl mb-3 opacity-20">◎</div>
              <p className="text-sm font-semibold text-slate-600">{search ? "No matching meetings" : "No meetings yet"}</p>
              <p className="text-xs text-slate-400 mt-1">
                {search ? "Try a different search term." : "Start your first meeting from the Home tab."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtered.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 sm:gap-4 px-4 py-3.5 hover:bg-slate-50 transition group cursor-pointer"
                  onClick={() => router.push(`/meeting/${encodeURIComponent(m.room_name)}/prejoin`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && router.push(`/meeting/${encodeURIComponent(m.room_name)}/prejoin`)}
                >
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 border border-blue-200/60 grid place-items-center text-blue-600 shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <rect x="2" y="7" width="15" height="13" rx="2" />
                      <path d="M17 9.5l4-2.5v10l-4-2.5" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-700 transition">
                      {m.title || m.room_name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400 font-mono truncate">{m.room_name}</span>
                      <span className="text-slate-200">·</span>
                      <span className="text-xs text-slate-400 shrink-0">
                        {new Date(m.created_at).toLocaleDateString(undefined, {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge active={m.is_active} />
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-slate-300 group-hover:text-blue-400 transition" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {!loading && filtered.length > 0 && (
          <p className="text-xs text-slate-400 text-right">
            {filtered.length} {filtered.length === 1 ? "meeting" : "meetings"} shown
          </p>
        )}
      </div>
    </DashboardShell>
  );
}
