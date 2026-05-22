"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/shared/components/layout/DashboardShell";
import { supabase } from "@/shared/lib/supabase/client";

type ActionItem = {
  id: string;
  task: string;
  assignee: string;
  priority: "High" | "Medium" | "Low";
  is_completed: boolean;
  due_date: string | null;
};

type Summary = {
  id: string;
  created_at: string;
  meeting_id: string;
  markdown_content: string;
  executive_summary: string | null;
  key_decisions: string[];
  meeting: {
    title: string;
    room_name: string;
    created_at: string;
  } | null;
  action_items: ActionItem[];
};

const PRIORITY_STYLES: Record<string, string> = {
  High:   "bg-red-50   border-red-200   text-red-700",
  Medium: "bg-amber-50 border-amber-200 text-amber-700",
  Low:    "bg-slate-50 border-slate-200 text-slate-600",
};

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${PRIORITY_STYLES[priority] ?? PRIORITY_STYLES.Low}`}>
      {priority}
    </span>
  );
}

function ActionItemRow({
  item,
  onToggle,
}: {
  item: ActionItem;
  onToggle: (id: string, done: boolean) => void;
}) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 transition-all ${item.is_completed ? "bg-slate-50 border-slate-100 opacity-60" : "bg-white border-slate-200"}`}>
      <button
        type="button"
        onClick={() => onToggle(item.id, !item.is_completed)}
        aria-label={item.is_completed ? "Mark incomplete" : "Mark complete"}
        className={`mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${item.is_completed ? "border-blue-500 bg-blue-500" : "border-slate-300 hover:border-blue-400"}`}
      >
        {item.is_completed && (
          <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3 text-white" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-relaxed ${item.is_completed ? "line-through text-slate-400" : "text-slate-800"}`}>
          {item.task}
        </p>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className="text-xs text-slate-500">👤 {item.assignee}</span>
          {item.due_date && (
            <span className="text-xs text-slate-400">
              📅 {new Date(item.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </span>
          )}
          <PriorityBadge priority={item.priority} />
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-4 animate-pulse">
      <div className="h-4 bg-slate-100 rounded w-1/3" />
      <div className="h-3 bg-slate-100 rounded w-2/3" />
      <div className="space-y-2">
        <div className="h-3 bg-slate-100 rounded w-full" />
        <div className="h-3 bg-slate-100 rounded w-5/6" />
      </div>
    </div>
  );
}

export function SummariesView() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "decisions" | "actions">("summary");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data: summaryData, error: sErr } = await supabase
          .from("meeting_summaries")
          .select(`
            id, created_at, meeting_id, markdown_content, executive_summary, key_decisions,
            meetings ( title, room_name, created_at )
          `)
          .order("created_at", { ascending: false });
        if (sErr) throw sErr;

        if (!summaryData || summaryData.length === 0) {
          setSummaries([]);
          return;
        }

        const summaryIds = summaryData.map((s) => s.id);

        const { data: actionData, error: aErr } = await supabase
          .from("action_items")
          .select("id, task, assignee, priority, is_completed, due_date, summary_id")
          .in("summary_id", summaryIds);
        if (aErr) throw aErr;

        const actionMap = new Map<string, ActionItem[]>();
        for (const a of actionData ?? []) {
          const arr = actionMap.get(a.summary_id) ?? [];
          arr.push(a);
          actionMap.set(a.summary_id, arr);
        }

        const built: Summary[] = summaryData.map((s) => ({
          id: s.id,
          created_at: s.created_at,
          meeting_id: s.meeting_id,
          markdown_content: s.markdown_content,
          executive_summary: s.executive_summary ?? null,
          key_decisions: Array.isArray(s.key_decisions) ? s.key_decisions : [],
          meeting: Array.isArray(s.meetings) ? (s.meetings[0] ?? null) : (s.meetings ?? null),
          action_items: actionMap.get(s.id) ?? [],
        }));

        setSummaries(built);
        if (built.length > 0 && built[0]) setSelected(built[0].id);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load summaries.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  async function toggleActionItem(actionId: string, done: boolean) {
    // Optimistic update
    setSummaries((prev) =>
      prev.map((s) => ({
        ...s,
        action_items: s.action_items.map((a) =>
          a.id === actionId ? { ...a, is_completed: done } : a
        ),
      }))
    );
    await supabase
      .from("action_items")
      .update({ is_completed: done })
      .eq("id", actionId);
  }

  const activeSummary = summaries.find((s) => s.id === selected);

  return (
    <DashboardShell>
      <div className="max-w-6xl mx-auto space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Summaries</h1>
          <p className="text-sm text-slate-500 mt-0.5">AI-generated meeting summaries, decisions and action items.</p>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {loading ? (
          <div className="space-y-4">{[1, 2].map((i) => <SkeletonCard key={i} />)}</div>
        ) : summaries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
            <div className="text-3xl mb-3 opacity-20">✦</div>
            <p className="text-sm font-semibold text-slate-600">No summaries yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Summaries are generated automatically after a meeting ends.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">
            {/* Sidebar list */}
            <aside className="space-y-2">
              {summaries.map((s) => {
                const isSelected = selected === s.id;
                const completedCount = s.action_items.filter((a) => a.is_completed).length;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setSelected(s.id); setActiveTab("summary"); }}
                    className={[
                      "w-full text-left rounded-2xl border p-4 transition-all",
                      isSelected
                        ? "border-blue-300 bg-blue-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50",
                    ].join(" ")}
                  >
                    <p className={`text-sm font-semibold truncate ${isSelected ? "text-blue-800" : "text-slate-800"}`}>
                      {s.meeting?.title ?? "Untitled Meeting"}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono truncate">{s.meeting?.room_name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-slate-400">
                        {new Date(s.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                      {s.action_items.length > 0 && (
                        <>
                          <span className="text-slate-200">·</span>
                          <span className={`text-xs ${completedCount === s.action_items.length ? "text-emerald-600" : "text-amber-600"}`}>
                            {completedCount}/{s.action_items.length} tasks
                          </span>
                        </>
                      )}
                      {s.key_decisions.length > 0 && (
                        <>
                          <span className="text-slate-200">·</span>
                          <span className="text-xs text-slate-400">{s.key_decisions.length} decisions</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </aside>

            {/* Detail panel */}
            {activeSummary ? (
              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b border-slate-100 px-5 pt-4 gap-1">
                  {(["summary", "decisions", "actions"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={[
                        "pb-3 px-3 text-sm font-medium capitalize transition border-b-2 -mb-px",
                        activeTab === tab
                          ? "border-blue-500 text-blue-700"
                          : "border-transparent text-slate-500 hover:text-slate-700",
                      ].join(" ")}
                    >
                      {tab}
                      {tab === "actions" && activeSummary.action_items.length > 0 && (
                        <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                          {activeSummary.action_items.length}
                        </span>
                      )}
                      {tab === "decisions" && activeSummary.key_decisions.length > 0 && (
                        <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                          {activeSummary.key_decisions.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="p-5">
                  {/* Summary tab */}
                  {activeTab === "summary" && (
                    <div className="space-y-4">
                      <div>
                        <h2 className="text-base font-semibold text-slate-900">{activeSummary.meeting?.title ?? "Meeting"}</h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {activeSummary.meeting?.created_at
                            ? new Date(activeSummary.meeting.created_at).toLocaleString(undefined, {
                                dateStyle: "medium", timeStyle: "short",
                              })
                            : ""}
                        </p>
                      </div>
                      {activeSummary.executive_summary ? (
                        <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                          <p className="text-xs font-semibold text-blue-700 mb-2">Executive summary</p>
                          <p className="text-sm text-slate-700 leading-relaxed">{activeSummary.executive_summary}</p>
                        </div>
                      ) : null}
                      {activeSummary.markdown_content ? (
                        <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">
                          {activeSummary.markdown_content}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No content available.</p>
                      )}
                    </div>
                  )}

                  {/* Decisions tab */}
                  {activeTab === "decisions" && (
                    <div className="space-y-3">
                      <h2 className="text-sm font-semibold text-slate-900">Key decisions</h2>
                      {activeSummary.key_decisions.length === 0 ? (
                        <p className="text-sm text-slate-400">No key decisions recorded for this meeting.</p>
                      ) : (
                        <ul className="space-y-2">
                          {activeSummary.key_decisions.map((d, i) => (
                            <li key={i} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                              <span className="h-5 w-5 rounded-full bg-blue-100 text-blue-700 grid place-items-center text-[10px] font-bold shrink-0 mt-0.5">
                                {i + 1}
                              </span>
                              <p className="text-sm text-slate-700 leading-relaxed">{String(d)}</p>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Actions tab */}
                  {activeTab === "actions" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-900">Action items</h2>
                        {activeSummary.action_items.length > 0 && (
                          <span className="text-xs text-slate-400">
                            {activeSummary.action_items.filter((a) => a.is_completed).length} of{" "}
                            {activeSummary.action_items.length} complete
                          </span>
                        )}
                      </div>
                      {activeSummary.action_items.length === 0 ? (
                        <p className="text-sm text-slate-400">No action items for this meeting.</p>
                      ) : (
                        <div className="space-y-2">
                          {/* Incomplete first */}
                          {[...activeSummary.action_items]
                            .sort((a, b) => Number(a.is_completed) - Number(b.is_completed))
                            .map((item) => (
                              <ActionItemRow key={item.id} item={item} onToggle={toggleActionItem} />
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
