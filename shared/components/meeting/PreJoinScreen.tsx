"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type PreJoinScreenProps = {
  roomName: string;
};

function sanitizeIdentity(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_ ]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 36);
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  const first = parts[0]?.[0] ?? "U";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (first + last).toUpperCase();
}

export function PreJoinScreen({ roomName }: PreJoinScreenProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [displayName, setDisplayName] = useState("Guest");
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [isPermissionPending, setIsPermissionPending] = useState(false);

  const avatarInitials = useMemo(() => initialsFromName(displayName), [displayName]);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("draftmin.displayName") : null;
    if (saved && saved.trim().length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayName(saved);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function updatePreview() {
      setDeviceError(null);

      if (!cameraOn && !micOn) {
        stream?.getTracks().forEach((track) => track.stop());
        setStream(null);
        if (videoRef.current) videoRef.current.srcObject = null;
        return;
      }

      setIsPermissionPending(true);
      try {
        let next: MediaStream;
        try {
          next = await navigator.mediaDevices.getUserMedia({
            video: cameraOn,
            audio: micOn,
          });
        } catch (err) {
          // If combined request fails, try to request separately to isolate which device is failing
          if (cameraOn && micOn) {
            console.warn("Combined getUserMedia failed, trying isolated tracks...", err);
            let videoStream: MediaStream | null = null;
            let audioStream: MediaStream | null = null;
            let cameraError: any = null;
            let micError: any = null;

            try {
              videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            } catch (vErr) {
              cameraError = vErr;
              setCameraOn(false); // Disable camera in UI since it's blocked/in-use
            }

            try {
              audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            } catch (aErr) {
              micError = aErr;
              setMicOn(false); // Disable microphone in UI since it's blocked/in-use
            }

            if (videoStream || audioStream) {
              const combined = new MediaStream();
              videoStream?.getVideoTracks().forEach((t) => combined.addTrack(t));
              audioStream?.getAudioTracks().forEach((t) => combined.addTrack(t));
              next = combined;

              if (cameraError || micError) {
                const failedDevice = cameraError && micError ? "camera and microphone" : cameraError ? "camera" : "microphone";
                const errDetail = (cameraError || micError) instanceof Error ? (cameraError || micError).message : String(cameraError || micError);
                setDeviceError(`Could not access ${failedDevice}: ${errDetail}`);
              }
            } else {
              // Both failed, throw original error
              throw err;
            }
          } else {
            // Already single request failed, propagate error
            throw err;
          }
        }

        if (cancelled) {
          next.getTracks().forEach((track) => track.stop());
          return;
        }

        stream?.getTracks().forEach((track) => track.stop());
        setStream(next);

        if (videoRef.current) {
          videoRef.current.srcObject = next;
          await videoRef.current.play().catch(() => {});
        }
      } catch (error) {
        setDeviceError(error instanceof Error ? error.message : String(error));
      } finally {
        setIsPermissionPending(false);
      }
    }

    void updatePreview();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOn, micOn]);

  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [stream]);

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-slate-900">
      <header className="h-14 border-b border-slate-200 bg-white flex items-center px-5">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 grid place-items-center text-white font-bold">
            D
          </div>
          <div className="text-sm font-semibold">Draftmin</div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.6fr_0.9fr]">
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Ready to join</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">Meeting: {roomName}</div>
              </div>
              <div className="text-xs text-slate-500">Preview</div>
            </div>

            <div className="p-6">
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
                {cameraOn ? (
                  <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full grid place-items-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-20 w-20 rounded-2xl bg-white/10 grid place-items-center text-white text-2xl font-semibold">
                        {avatarInitials}
                      </div>
                      <div className="text-white/70 text-sm">Camera is off</div>
                    </div>
                  </div>
                )}

                <div className="absolute bottom-3 left-3 flex items-center gap-2">
                  <span className="rounded-full bg-black/50 px-3 py-1 text-xs text-white/80 backdrop-blur">
                    {displayName || "Guest"}
                  </span>
                  {deviceError ? (
                    <span className="rounded-full bg-red-600/90 px-3 py-1 text-xs text-white">
                      Device issue
                    </span>
                  ) : null}
                </div>
              </div>

              {deviceError ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="font-semibold">Couldn’t access devices</div>
                  <div className="mt-1 text-amber-800/80">{deviceError}</div>
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMicOn((v) => !v)}
                  className={[
                    "h-11 rounded-2xl border px-4 text-sm font-semibold transition",
                    micOn ? "border-slate-200 bg-white hover:bg-slate-50" : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
                  ].join(" ")}
                >
                  {micOn ? "Microphone on" : "Microphone off"}
                </button>
                <button
                  type="button"
                  onClick={() => setCameraOn((v) => !v)}
                  className={[
                    "h-11 rounded-2xl border px-4 text-sm font-semibold transition",
                    cameraOn ? "border-slate-200 bg-white hover:bg-slate-50" : "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
                  ].join(" ")}
                >
                  {cameraOn ? "Camera on" : "Camera off"}
                </button>

                <div className="ml-auto text-xs text-slate-500">
                  Tip: allow camera/mic permissions in your browser.
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
              <div className="text-sm font-semibold text-slate-900">Join options</div>

              <label className="mt-4 block text-xs font-semibold text-slate-600">
                Your name
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-300"
                  placeholder="Enter your name"
                />
              </label>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 border border-slate-200">
                You’ll enter with <span className="font-semibold text-slate-900">{micOn ? "microphone on" : "microphone off"}</span> and{" "}
                <span className="font-semibold text-slate-900">{cameraOn ? "camera on" : "camera off"}</span>.
              </div>

              <button
                type="button"
                onClick={() => {
                  const safeName = displayName.trim().length > 0 ? displayName.trim() : "Guest";
                  window.localStorage.setItem("draftmin.displayName", safeName);

                  try {
                    stream?.getTracks().forEach((track) => track.stop());
                  } catch {
                    // ignore
                  }
                  setStream(null);
                  if (videoRef.current) {
                    videoRef.current.srcObject = null;
                  }

                  const base = sanitizeIdentity(safeName) || "guest";
                  const suffix = crypto.randomUUID().slice(0, 6);
                  const identity = `${base}-${suffix}`;

                  router.push(
                    `/meeting/${encodeURIComponent(roomName)}?name=${encodeURIComponent(safeName)}&identity=${encodeURIComponent(identity)}&mic=${micOn ? "1" : "0"}&cam=${cameraOn ? "1" : "0"}`,
                  );
                }}
                className="mt-5 h-12 w-full rounded-2xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
              >
                Join now
              </button>

              <button
                type="button"
                onClick={() => router.push("/meeting")}
                className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition text-sm font-semibold"
              >
                Back to home
              </button>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6">
              <div className="text-sm font-semibold text-slate-900">Meeting link</div>
              <div className="mt-3 text-sm text-slate-600">
                Share this room name with others:
              </div>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-xs text-slate-700 break-all">
                {roomName}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {isPermissionPending && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-[#0B0F19]/40 p-4 backdrop-blur-[2px]">
          <div className="mt-12 flex max-w-md animate-bounce items-center gap-3 rounded-2xl border border-blue-500/30 bg-[#0B0F19]/95 p-4 text-white shadow-[0_0_50px_rgba(0,0,0,0.5)] ring-2 ring-blue-500/20 backdrop-blur-xl">
            <span className="relative flex h-3.5 w-3.5 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-blue-500"></span>
            </span>
            <div className="text-left">
              <h4 className="text-sm font-semibold text-blue-400">Browser Permissions Required</h4>
              <p className="mt-1 text-xs text-white/90 leading-relaxed">
                Draftmin wants to access your camera and microphone. Please click <strong>Allow</strong> in the browser prompt at the top of your screen.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
