"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/shared/lib/supabase/client";
import { MarkdownRenderer } from "@/shared/components/ui/MarkdownRenderer";

type Meeting = { id: string; room_name: string; title: string; created_at: string };
type ActionItem = { id: string; task: string; assignee: string; priority: string; is_completed: boolean };
type Summary = {
  id: string; meeting_id: string; markdown_content: string;
  executive_summary: string; key_decisions: string[]; created_at: string;
  meetings?: Meeting | null; action_items?: ActionItem[];
};

function priorityColor(p: string) {
  const l = p.toLowerCase();
  if (l === "high") return "text-red-600 bg-red-50 border-red-200";
  if (l === "low") return "text-emerald-600 bg-emerald-50 border-emerald-200";
  return "text-amber-600 bg-amber-50 border-amber-200";
}

function SkeletonRow() {
  return <div className="h-16 rounded-xl bg-slate-100 animate-pulse" />;
}

export function SummariesView() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSummary, setActiveSummary] = useState<Summary | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Summary[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    async function loadSummaries() {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fetchError } = await supabase
          .from("meeting_summaries")
          .select(`id, meeting_id, markdown_content, executive_summary, key_decisions, created_at,
            meetings(id, room_name, title, created_at),
            action_items(id, task, assignee, priority, is_completed)`)
          .order("created_at", { ascending: false })
          .limit(30);
        if (fetchError) {
          setError(fetchError.message);
        } else if (data) {
          setSummaries(data as unknown as Summary[]);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load summaries");
      } finally { 
        setLoading(false); 
      }
    }
    void loadSummaries();
  }, []);

  useEffect(() => {
    if (!debouncedSearch.trim()) { setSearchResults(null); return; }
    async function runSearch() {
      setSearching(true);
      try {
        const { data } = await supabase
          .from("meeting_summaries")
          .select(`id, meeting_id, markdown_content, executive_summary, key_decisions, created_at,
            meetings(id, room_name, title, created_at),
            action_items(id, task, assignee, priority, is_completed)`)
          .ilike("markdown_content", `%${debouncedSearch}%`)
          .order("created_at", { ascending: false })
          .limit(20);
        setSearchResults((data as unknown as Summary[]) ?? []);
      } catch { /* ignore */ } finally { setSearching(false); }
    }
    void runSearch();
  }, [debouncedSearch]);

  const list = searchResults ?? summaries;

  const exportMarkdown = useCallback(() => {
    if (!activeSummary?.markdown_content) return;
    const slug = activeSummary.meetings?.room_name ?? activeSummary.id;
    const blob = new Blob([activeSummary.markdown_content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `minutes-${slug}.md`; a.click();
    URL.revokeObjectURL(url);
  }, [activeSummary]);

  const copyMarkdown = useCallback(() => {
    if (!activeSummary?.markdown_content) return;
    navigator.clipboard.writeText(activeSummary.markdown_content);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  }, [activeSummary]);

  const printSummary = () => window.print();

  const displayDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">AI Meeting Minutes</h1>
          <p className="text-sm text-slate-500 mt-0.5">Secretary-quality summaries generated after every meeting.</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Error loading summaries: {error}
          <button 
            onClick={() => window.location.reload()} 
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-3">
          <div className="relative">
            <svg viewBox="0 0 24 24" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
            {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin" />}
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search summaries…"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-9 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition" />
          </div>

          <div className="space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-0.5">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            ) : list.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
                <p className="text-sm font-medium text-slate-500">{debouncedSearch ? "No results found" : "No summaries yet"}</p>
                <p className="text-xs text-slate-400 mt-1">{debouncedSearch ? "Try different keywords." : "End a meeting to generate your first summary."}</p>
              </div>
            ) : list.map(s => {
              const active = activeSummary?.id === s.id;
              return (
                <button key={s.id} type="button" onClick={() => setActiveSummary(s)}
                  className={`w-full text-left rounded-xl px-3.5 py-3 border transition ${active ? "border-blue-200 bg-blue-50" : "border-slate-100 bg-white hover:border-blue-100 hover:bg-blue-50/50"}`}>
                  <div className={`text-sm font-medium truncate ${active ? "text-blue-700" : "text-slate-800"}`}>
                    {s.meetings?.title || s.meetings?.room_name || "Meeting"}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-slate-400">{displayDate(s.created_at)}</span>
                    {s.action_items && s.action_items.length > 0 && (
                      <span className="text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-1.5 py-0.5">{s.action_items.length} actions</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden print-content">
          {activeSummary ? (
            <>
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-white no-print">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {activeSummary.meetings?.title || activeSummary.meetings?.room_name || "Meeting"}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{displayDate(activeSummary.created_at)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                  <button type="button" onClick={copyMarkdown}
                    className={`h-8 rounded-lg border px-3 text-xs font-medium transition ${copied ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
                    {copied ? "✓ Copied" : "Copy"}
                  </button>
                  <button type="button" onClick={exportMarkdown}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
                    .md
                  </button>
                  <button type="button" onClick={printSummary}
                    className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                    Print / PDF
                  </button>
                </div>
              </div>

              <div className="p-5 sm:p-6 overflow-y-auto max-h-[calc(100vh-240px)]">
                {activeSummary.markdown_content
                  ? <MarkdownRenderer text={activeSummary.markdown_content} />
                  : <p className="text-sm text-slate-400 italic">This summary has no content.</p>}

                {activeSummary.action_items && activeSummary.action_items.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-blue-500" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" /></svg>
                      Action Items
                    </h3>
                    <div className="space-y-2">
                      {activeSummary.action_items.map(item => (
                        <div key={item.id} className={`flex items-start gap-3 p-3 rounded-xl border ${item.is_completed ? "opacity-50" : ""} bg-slate-50`}>
                          <div className={`mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${item.is_completed ? "border-emerald-500 bg-emerald-500" : "border-slate-300"}`}>
                            {item.is_completed && <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5 text-white" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm text-slate-700 ${item.is_completed ? "line-through text-slate-400" : ""}`}>{item.task}</p>
                            {item.assignee && item.assignee !== "Unassigned" && (
                              <p className="text-xs text-slate-400 mt-0.5">→ {item.assignee}</p>
                            )}
                          </div>
                          <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 shrink-0 ${priorityColor(item.priority)}`}>{item.priority}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 gap-4">
              <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-200 grid place-items-center">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-slate-300" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-600">Select a summary</p>
                <p className="text-xs text-slate-400 mt-1 max-w-[240px] leading-relaxed">
                  {loading ? "Loading your summaries…" : list.length === 0 ? "End a meeting and AI will automatically generate professional meeting minutes." : "Pick a meeting from the left to read its AI-generated minutes."}
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}