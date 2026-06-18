"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/shared/lib/supabase/client";

type PreJoinScreenProps = {
  roomName: string;
  initialTitle?: string;
  initialMeetingType?: string;
  initialAgenda?: string;
};

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toUpperCase();
}

export function PreJoinScreen({ roomName, initialTitle, initialMeetingType, initialAgenda }: PreJoinScreenProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [permissionPending, setPermissionPending] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [joining, setJoining] = useState(false);
  const [meetingType, setMeetingType] = useState<string>(() => {
    if (initialMeetingType?.trim()) return initialMeetingType.trim();
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("draftmin.meetingType") || "general";
    }
    return "general";
  });
  const [meetingTitle, setMeetingTitle] = useState(initialTitle?.trim() || roomName);
  const [agendaItems, setAgendaItems] = useState<string[]>(() => {
    const source = initialAgenda?.trim() || "";
    return source.split(/\r?\n/).map((line) => line.replace(/^[-*\d.)\s]+/, "").trim()).filter(Boolean);
  });

  const initials = useMemo(() => initialsFromName(displayName || "Guest"), [displayName]);

  const inviteLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/meeting/${encodeURIComponent(roomName)}/prejoin`
      : "";

  /* ── restore saved name or profile name ──────────────────────────────── */
  useEffect(() => {
    async function loadProfileName() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Fetch full_name from profiles
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.full_name && profile.full_name !== "Anonymous") {
            setDisplayName(profile.full_name);
            return;
          }

          // Fallback to local storage
          const saved = window.localStorage.getItem("draftmin.displayName");
          if (saved?.trim()) {
            setDisplayName(saved.trim());
            return;
          }

          // Fallback to user metadata full_name/name or email prefix
          const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? "";
          setDisplayName(name);
        } else {
          const saved = window.localStorage.getItem("draftmin.displayName");
          if (saved?.trim()) setDisplayName(saved.trim());
        }
      } catch (err) {
        console.warn("Failed to load profile name:", err);
        const saved = window.localStorage.getItem("draftmin.displayName");
        if (saved?.trim()) setDisplayName(saved.trim());
      }
    }
    void loadProfileName();
  }, []);

  useEffect(() => {
    async function loadMeetingContext() {
      try {
        const { data: meeting } = await supabase
          .from("meetings")
          .select("id, title, agenda, settings")
          .eq("room_name", roomName)
          .maybeSingle();

        if (!meeting) return;
        if (meeting.title) setMeetingTitle(meeting.title);
        const settings = meeting.settings as { meeting_type?: string } | null;
        if (settings?.meeting_type) setMeetingType(settings.meeting_type);

        const { data: items } = await supabase
          .from("meeting_agenda_items")
          .select("title, position")
          .eq("meeting_id", meeting.id)
          .order("position", { ascending: true });

        const savedItems = items?.map((item) => item.title).filter(Boolean) ?? [];
        if (savedItems.length) {
          setAgendaItems(savedItems);
        } else if (meeting.agenda) {
          setAgendaItems(
            String(meeting.agenda)
              .split(/\r?\n/)
              .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
              .filter(Boolean)
          );
        }
      } catch (err) {
        console.warn("Failed to load meeting agenda:", err);
      }
    }
    void loadMeetingContext();
  }, [roomName]);

  /* ── camera / mic preview ───────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    async function start() {
      setDeviceError(null);
      if (!cameraOn && !micOn) {
        // Stop existing stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        return;
      }
      setPermissionPending(true);
      try {
        const next = await navigator.mediaDevices
          .getUserMedia({ video: cameraOn, audio: micOn })
          .catch(async (err) => {
            if (!cameraOn || !micOn) throw err;
            // Try separately to isolate the failing device
            let vs: MediaStream | null = null;
            let as_: MediaStream | null = null;
            let ce: unknown = null, me: unknown = null;
            try { vs = await navigator.mediaDevices.getUserMedia({ video: true }); }
            catch (e) { ce = e; setCameraOn(false); }
            try { as_ = await navigator.mediaDevices.getUserMedia({ audio: true }); }
            catch (e) { me = e; setMicOn(false); }
            if (!vs && !as_) throw err;
            const combined = new MediaStream();
            vs?.getVideoTracks().forEach((t) => combined.addTrack(t));
            as_?.getAudioTracks().forEach((t) => combined.addTrack(t));
            const errVal = ce || me;
            if (errVal) {
              const device = ce && me ? "camera and microphone" : ce ? "camera" : "microphone";
              const msg = errVal instanceof Error ? errVal.message : String(errVal);
              setDeviceError(`Could not access ${device}: ${msg}`);
            }
            return combined;
          });

        if (cancelled) { next.getTracks().forEach((t) => t.stop()); return; }

        // Stop old stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        streamRef.current = next;

        if (videoRef.current) {
          videoRef.current.srcObject = next;
          await videoRef.current.play().catch(() => { });
        }
      } catch (e) {
        setDeviceError(e instanceof Error ? e.message : String(e));
      } finally {
        setPermissionPending(false);
      }
    }

    void start();
    return () => { cancelled = true; };
  }, [cameraOn, micOn]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const handleJoin = async () => {
    if (joining) return;
    setJoining(true);
    const safeName = displayName.trim() || "Guest";
    window.localStorage.setItem("draftmin.displayName", safeName);
    window.localStorage.setItem("draftmin.meetingType", meetingType);

    // Save/update profile name in Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ full_name: safeName })
          .eq("id", user.id);
      }
    } catch (e) {
      console.warn("Failed to update profile name on join:", e);
    }

    // Stop preview stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;

    const params = new URLSearchParams({
      name: safeName,
      mic: micOn ? "1" : "0",
      cam: cameraOn ? "1" : "0",
      type: meetingType,
      title: meetingTitle,
    });
    if (agendaItems.length) params.set("agenda", agendaItems.join("\n"));

    router.push(`/meeting/${encodeURIComponent(roomName)}?${params.toString()}`);
  };

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* ── header ── */}
        <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 grid place-items-center font-bold text-sm text-white shadow-sm">
              D
            </div>
            <span className="font-semibold text-stone-900 tracking-tight text-lg sm:text-xl">Draftmin</span>
          </div>
          <div className="flex items-center gap-2 text-xs sm:text-sm text-white bg-blue-600 hover:bg-blue-700 border border-stone-100 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 shadow-sm">
            <span className="hidden sm:inline">🚪Room:</span>
            <span className="font-mono text-white max-w-[150px] sm:max-w-[200px] truncate">
              {roomName}
            </span>
          </div>
        </div>

        {/* ── body ── */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl sm:text-3xl font-medium text-stone-900 tracking-tight">Ready to join?</h1>
          <p className="mt-1.5 sm:mt-2 text-sm text-stone-400">{meetingTitle} - check your camera and microphone, then enter your name.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">

          {/* ── camera preview ── */}
          <div className="rounded-2xl bg-white border border-stone-100 overflow-hidden shadow-sm">
            {/* Video */}
            <div className="relative aspect-video bg-stone-100 overflow-hidden">
              {cameraOn ? (
                <video
                  ref={videoRef}
                  muted
                  playsInline
                  className="h-full w-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center gap-3">
                  <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-stone-100 ring-1 ring-stone-200 grid place-items-center text-xl sm:text-2xl font-medium text-stone-500">
                    {initials}
                  </div>
                  <p className="text-sm text-stone-400">Camera is off</p>
                </div>
              )}

              {/* Name tag */}
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <span className="rounded-full bg-white/90 backdrop-blur-sm shadow-sm px-3 py-1.5 text-xs text-stone-700 font-medium border border-stone-200">
                  {displayName || "You"}
                </span>
                {deviceError && (
                  <span className="rounded-full bg-red-50 border border-red-200 backdrop-blur-sm px-3 py-1.5 text-xs text-red-600 font-medium flex items-center gap-1.5">
                    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 3h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    Device issue
                  </span>
                )}
              </div>
            </div>

            {/* Device error detail */}
            {deviceError && (
              <div className="px-4 py-3 bg-amber-50 border-t border-amber-200 text-xs text-amber-700 leading-relaxed">
                {deviceError}
              </div>
            )}

            {/* Toggle controls */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 sm:px-5 py-4 border-t border-stone-100 bg-stone-50/50">
              <button
                type="button"
                onClick={() => setMicOn((v) => !v)}
                className={[
                  "flex items-center gap-2 h-9 sm:h-10 rounded-full px-3 sm:px-4 text-xs sm:text-sm font-medium border transition",
                  micOn
                    ? "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                    : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
                ].join(" ")}
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden="true">
                  {micOn ? (
                    <>
                      <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M19 10v1a7 7 0 01-14 0v-1M12 19v3m-3 0h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </>
                  ) : (
                    <>
                      <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3zM19 10v1a7 7 0 01-14 0v-1M12 19v3m-3 0h6M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </>
                  )}
                </svg>
                {micOn ? "Mic on" : "Mic off"}
              </button>

              <button
                type="button"
                onClick={() => setCameraOn((v) => !v)}
                className={[
                  "flex items-center gap-2 h-9 sm:h-10 rounded-full px-3 sm:px-4 text-xs sm:text-sm font-medium border transition",
                  cameraOn
                    ? "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
                    : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
                ].join(" ")}
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" aria-hidden="true">
                  {cameraOn ? (
                    <>
                      <path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <rect x="3" y="8" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
                    </>
                  ) : (
                    <>
                      <path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      <path d="M7.5 8H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 001.5-.67" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </>
                  )}
                </svg>
                {cameraOn ? "Camera on" : "Camera off"}
              </button>

              <p className="ml-auto text-xs text-stone-400 hidden md:block">
                Allow browser permissions if prompted
              </p>
            </div>
          </div>

          {/* ── right panel ── */}
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-white border border-stone-100 p-4 sm:p-5 space-y-4 shadow-sm">
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                  Your name
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                  placeholder="Enter your name…"
                  autoFocus
                  className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 text-sm text-stone-900 placeholder:text-stone-300 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
                />
              </div>

              <div className="rounded-xl bg-stone-50 border border-stone-100 px-4 py-3 text-xs text-stone-500 leading-relaxed">
                Joining as <span className="text-stone-700 font-medium">{displayName || "Guest"}</span> with{" "}
                <span className={micOn ? "text-emerald-600" : "text-red-500"}>{micOn ? "mic on" : "mic off"}</span>{" "}
                and{" "}
                <span className={cameraOn ? "text-emerald-600" : "text-red-500"}>{cameraOn ? "camera on" : "camera off"}</span>.
              </div>

              {/* Meeting type selector */}
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
                  Meeting type
                </label>
                <div className="relative">
                  <select
                    value={meetingType}
                    onChange={e => setMeetingType(e.target.value)}
                    className="h-11 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 pr-10 text-sm text-stone-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition appearance-none cursor-pointer"
                  >
                    {([
                      { value: "general", label: "📝 General" },
                      { value: "board", label: "🏛️ Board" },
                      { value: "standup", label: "⚡ Stand-up" },
                      { value: "retro", label: "🔄 Retrospective" },
                      { value: "workshop", label: "🛠️ Workshop" },
                      { value: "client", label: "🤝 Client" },
                    ] as const).map(opt => (
                      <option key={opt.value} value={opt.value} className="text-stone-900">{opt.label}</option>
                    ))}
                  </select>
                  <svg viewBox="0 0 24 24" fill="none" className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                </div>
              </div>

              <button
                type="button"
                onClick={handleJoin}
                disabled={joining}
                className="h-12 w-full rounded-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-60 transition text-sm font-medium text-white flex items-center justify-center gap-2"
              >
                {joining ? (
                  <><div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Joining…</>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" />
                      <rect x="3" y="8" width="12" height="10" rx="2" />
                    </svg>
                    Join meeting
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => router.push("/meeting")}
                className="h-10 w-full rounded-full border border-stone-200 bg-white hover:bg-stone-50 transition text-sm text-stone-500 hover:text-stone-700"
              >
                ← Back to home
              </button>
            </div>

            {/* Invite link */}
            <div className="rounded-2xl bg-white border border-stone-100 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Invite others</span>
                <button
                  type="button"
                  onClick={copyLink}
                  className={[
                    "inline-flex items-center gap-1.5 h-8 rounded-lg px-3 text-xs font-medium border transition",
                    linkCopied
                      ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                      : "border-stone-200 bg-white text-stone-500 hover:bg-stone-50 hover:text-stone-700",
                  ].join(" ")}
                >
                  {linkCopied ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                      </svg>
                      Copy link
                    </>
                  )}
                </button>
              </div>
              <div className="rounded-xl bg-stone-50 border border-stone-100 px-3 py-2.5 text-[11px] font-mono text-stone-500 break-all leading-relaxed">
                {inviteLink || "Loading…"}
              </div>
              <p className="mt-2.5 text-[11px] text-stone-400 leading-relaxed">
                Each person who opens this link gets their own identity — no collisions, no dropped sessions.
              </p>
            </div>

            {/* Agenda */}
            <div className="rounded-2xl bg-white border border-stone-100 p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-stone-500 uppercase tracking-wide">Agenda</span>
                <span className="text-[11px] text-stone-400">{agendaItems.length || "No"} items</span>
              </div>
              {agendaItems.length ? (
                <ol className="space-y-2">
                  {agendaItems.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-2 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2.5">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-50 text-[10px] font-semibold text-blue-600">
                        {index + 1}
                      </span>
                      <span className="text-xs text-stone-600 leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-xs text-stone-400 leading-relaxed">No agenda has been shared for this room yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── permission overlay ── */}
      {permissionPending && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-stone-900/40 backdrop-blur-sm p-4">
          <div className="mt-20 flex max-w-sm items-center gap-3 rounded-2xl bg-white border border-blue-100 shadow-xl p-4">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
            </span>
            <div>
              <p className="text-sm font-semibold text-blue-600">Allow camera & microphone</p>
              <p className="mt-0.5 text-xs text-stone-500">Click <strong className="text-stone-700">Allow</strong> in the browser prompt.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
