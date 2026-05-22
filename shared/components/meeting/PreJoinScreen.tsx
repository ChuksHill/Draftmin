"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PreJoinScreenProps = { roomName: string };

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toUpperCase();
}

export function PreJoinScreen({ roomName }: PreJoinScreenProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [permissionPending, setPermissionPending] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [joining, setJoining] = useState(false);

  const initials = useMemo(() => initialsFromName(displayName || "Guest"), [displayName]);

  const inviteLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/meeting/${encodeURIComponent(roomName)}/prejoin`
      : "";

  /* ── restore saved name ─────────────────────────────────────────────── */
  useEffect(() => {
    const saved = window.localStorage.getItem("draftmin.displayName");
    if (saved?.trim()) setDisplayName(saved.trim());
  }, []);

  /* ── camera / mic preview ───────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    async function start() {
      setDeviceError(null);
      if (!cameraOn && !micOn) {
        stream?.getTracks().forEach((t) => t.stop());
        setStream(null);
        if (videoRef.current) videoRef.current.srcObject = null;
        return;
      }
      setPermissionPending(true);
      try {
        const next = await navigator.mediaDevices
          .getUserMedia({ video: cameraOn, audio: micOn })
          .catch(async (err) => {
            if (!cameraOn || !micOn) throw err;
            // try separately to isolate the failing device
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
        stream?.getTracks().forEach((t) => t.stop());
        setStream(next);
        if (videoRef.current) {
          videoRef.current.srcObject = next;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e) {
        setDeviceError(e instanceof Error ? e.message : String(e));
      } finally {
        setPermissionPending(false);
      }
    }

    void start();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn, micOn]);

  useEffect(() => () => { stream?.getTracks().forEach((t) => t.stop()); }, [stream]);

  const handleJoin = () => {
    if (joining) return;
    setJoining(true);
    const safeName = displayName.trim() || "Guest";
    window.localStorage.setItem("draftmin.displayName", safeName);
    try { stream?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
    // ✅ Only pass `name`, mic, cam — identity is generated server-side
    router.push(
      `/meeting/${encodeURIComponent(roomName)}?name=${encodeURIComponent(safeName)}&mic=${micOn ? "1" : "0"}&cam=${cameraOn ? "1" : "0"}`,
    );
  };

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-white flex flex-col">
      {/* ── header ────────────────────────────────────────────────────── */}
      <header className="h-16 flex items-center px-6 gap-3 border-b border-white/5 shrink-0">
        <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 grid place-items-center font-bold text-sm">
          D
        </div>
        <span className="font-semibold text-white tracking-tight">Draftmin</span>
        <div className="ml-auto flex items-center gap-2 text-xs text-white/40">
          <span className="hidden sm:inline">Room</span>
          <span className="font-mono bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white/70 max-w-[200px] truncate">
            {roomName}
          </span>
        </div>
      </header>

      {/* ── body ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-4xl">

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Ready to join?</h1>
            <p className="mt-2 text-white/50 text-sm">Check your camera and microphone, then enter your name.</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">

            {/* ── camera preview ───────────────────────────────────────── */}
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#1a1d27] flex flex-col">
              {/* Video */}
              <div className="relative aspect-video bg-[#0d0f15] overflow-hidden">
                {cameraOn ? (
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="h-full w-full object-cover scale-x-[-1]"
                  />
                ) : (
                  <div className="h-full w-full flex flex-col items-center justify-center gap-3">
                    <div className="h-20 w-20 rounded-2xl bg-white/5 ring-1 ring-white/10 grid place-items-center text-2xl font-bold text-white/80">
                      {initials}
                    </div>
                    <p className="text-sm text-white/40">Camera is off</p>
                  </div>
                )}

                {/* Name tag */}
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <span className="rounded-full bg-black/60 backdrop-blur px-3 py-1.5 text-xs text-white/90 font-medium">
                    {displayName || "You"}
                  </span>
                  {deviceError && (
                    <span className="rounded-full bg-red-600/80 backdrop-blur px-3 py-1.5 text-xs text-white font-medium flex items-center gap-1.5">
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
                <div className="px-4 py-3 bg-amber-500/10 border-t border-amber-500/20 text-xs text-amber-300 leading-relaxed">
                  {deviceError}
                </div>
              )}

              {/* Toggle controls */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-4 sm:px-5 py-4 border-t border-white/5">
                {/* Mic toggle */}
                <button
                  type="button"
                  onClick={() => setMicOn((v) => !v)}
                  className={[
                    "flex items-center gap-2 h-10 rounded-xl px-4 text-sm font-medium border transition",
                    micOn
                      ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                      : "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20",
                  ].join(" ")}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
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

                {/* Camera toggle */}
                <button
                  type="button"
                  onClick={() => setCameraOn((v) => !v)}
                  className={[
                    "flex items-center gap-2 h-10 rounded-xl px-4 text-sm font-medium border transition",
                    cameraOn
                      ? "border-white/10 bg-white/5 text-white hover:bg-white/10"
                      : "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20",
                  ].join(" ")}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" aria-hidden="true">
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

                <p className="ml-auto text-xs text-white/25 hidden md:block">
                  Allow browser permissions if prompted
                </p>
              </div>
            </div>

            {/* ── right panel ──────────────────────────────────────────── */}
            <div className="flex flex-col gap-4">

              {/* Name & join */}
              <div className="rounded-2xl border border-white/10 bg-[#1a1d27] p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                    Your name
                  </label>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                    placeholder="Enter your name…"
                    autoFocus
                    className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-white/25 outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>

                <div className="rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 text-xs text-white/40 leading-relaxed">
                  Joining as <span className="text-white/70 font-medium">{displayName || "Guest"}</span> with{" "}
                  <span className={micOn ? "text-emerald-400" : "text-red-400"}>{micOn ? "mic on" : "mic off"}</span>{" "}
                  and{" "}
                  <span className={cameraOn ? "text-emerald-400" : "text-red-400"}>{cameraOn ? "camera on" : "camera off"}</span>.
                </div>

                <button
                  type="button"
                  onClick={handleJoin}
                  disabled={joining}
                  className="h-12 w-full rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-60 transition text-sm font-semibold text-white flex items-center justify-center gap-2"
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
                  className="h-10 w-full rounded-xl border border-white/10 bg-transparent hover:bg-white/5 transition text-sm text-white/50 hover:text-white/80"
                >
                  ← Back to home
                </button>
              </div>

              {/* Invite link */}
              <div className="rounded-2xl border border-white/10 bg-[#1a1d27] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Invite others</span>
                  <button
                    type="button"
                    onClick={copyLink}
                    className={[
                      "inline-flex items-center gap-1.5 h-8 rounded-lg px-3 text-xs font-medium border transition",
                      linkCopied
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-white/10 bg-white/5 text-white/60 hover:text-white hover:bg-white/10",
                    ].join(" ")}
                  >
                    {linkCopied ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                        Copy link
                      </>
                    )}
                  </button>
                </div>
                <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 text-[11px] font-mono text-white/40 break-all leading-relaxed">
                  {inviteLink || "Loading…"}
                </div>
                <p className="mt-2.5 text-[11px] text-white/25 leading-relaxed">
                  Each person who opens this link gets their own identity — no collisions, no dropped sessions.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── permission overlay ────────────────────────────────────────────── */}
      {permissionPending && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="mt-20 flex max-w-sm items-center gap-3 rounded-2xl border border-blue-500/30 bg-[#0f1117]/95 p-4 shadow-2xl ring-1 ring-blue-500/20">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-blue-500" />
            </span>
            <div>
              <p className="text-sm font-semibold text-blue-300">Allow camera & microphone</p>
              <p className="mt-0.5 text-xs text-white/50">Click <strong className="text-white/80">Allow</strong> in the browser prompt.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}