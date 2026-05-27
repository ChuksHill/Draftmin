"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { StartAudio, useLocalParticipant, useRoomContext } from "@livekit/components-react";

export type MeetingPanel = "participants" | "chat" | "captions" | null;

type Props = {
  activePanel?: MeetingPanel;
  onTogglePanel?: (panel: Exclude<MeetingPanel, null>) => void;
  onDeviceError?: (error: Error | null) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  viewMode?: "grid" | "speaker";
  onToggleView?: () => void;
};

/* ── SVG Icons ─────────────────────────────────────────────────────────── */
const IC = {
  MicOn: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
      <path d="M19 10v1a7 7 0 01-14 0v-1M12 19v3m-3 0h6" />
    </svg>
  ),
  MicOff: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3zM19 10v1a7 7 0 01-14 0v-1M12 19v3m-3 0h6M3 3l18 18" />
    </svg>
  ),
  CamOn: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" />
      <rect x="3" y="8" width="12" height="10" rx="2" />
    </svg>
  ),
  CamOff: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 3l18 18M7.5 8H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 001.5-.67" />
    </svg>
  ),
  Share: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  ),
  People: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  ),
  Chat: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  Captions: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M7 12h4M13 12h4M7 15.5h3M12 15.5h5" />
    </svg>
  ),
  Speaker: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="15" height="14" rx="1.5" />
      <rect x="19" y="4" width="3" height="5" rx="1" strokeWidth="1.5" />
      <rect x="19" y="12" width="3" height="5" rx="1" strokeWidth="1.5" />
    </svg>
  ),
  Grid: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  Fullscreen: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3" />
    </svg>
  ),
  ExitFullscreen: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3" />
    </svg>
  ),
  EndCall: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 012 6.18 2 2 0 014 4h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91M23 1L1 23" />
    </svg>
  ),
  More: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="5" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
    </svg>
  ),
};

/* ── Reusable button atoms ─────────────────────────────────────────────── */
function Btn({
  label, danger, active, onClick, icon, disabled, className = "",
}: {
  label: string; danger?: boolean; active?: boolean; onClick?: () => void;
  icon: ReactNode; disabled?: boolean; className?: string;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={label}
        aria-label={label}
        className={[
          "h-11 w-11 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40",
          danger ? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
          : active ? "bg-blue-500/20 border border-blue-500/30 text-blue-400"
          : "bg-white/10 border border-white/[0.08] text-white hover:bg-white/20",
        ].join(" ")}
      >{icon}</button>
      <span className={`text-[9px] leading-none select-none ${active ? "text-blue-400/80" : "text-white/30"}`}>{label}</span>
    </div>
  );
}

function EndBtn({ onClick }: { onClick?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        aria-label="Leave meeting"
        className="h-11 w-14 rounded-full bg-red-600 hover:bg-red-500 active:scale-90 transition flex items-center justify-center text-white shadow-[0_0_24px_rgba(239,68,68,0.35)]"
      ><IC.EndCall /></button>
      <span className="text-[9px] text-white/30 select-none">Leave</span>
    </div>
  );
}

/* ── Main export ──────────────────────────────────────────────────────── */
export function MeetingControls({
  activePanel, onTogglePanel, onDeviceError,
  isFullscreen = false, onToggleFullscreen,
  viewMode = "grid", onToggleView,
}: Props) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const [togglingMic, setTogglingMic] = useState(false);
  const [togglingCam, setTogglingCam] = useState(false);
  const [togglingScreen, setTogglingScreen] = useState(false);
  const [canScreenShare, setCanScreenShare] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  // Detect screen share capability (not available on mobile)
  useEffect(() => {
    const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    setCanScreenShare(!mobile && typeof navigator.mediaDevices?.getDisplayMedia === "function");
  }, []);

  // Close "more" sheet on outside click
  useEffect(() => {
    if (!showMore) return;
    const handler = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setShowMore(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMore]);

  const report = useCallback((e: unknown) => onDeviceError?.(e instanceof Error ? e : new Error(String(e))), [onDeviceError]);

  const toggleMic = useCallback(async () => {
    if (togglingMic) return; setTogglingMic(true);
    try { await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled); onDeviceError?.(null); }
    catch (e) { report(e); } finally { setTogglingMic(false); }
  }, [isMicrophoneEnabled, togglingMic, report, localParticipant, onDeviceError]);

  const toggleCam = useCallback(async () => {
    if (togglingCam) return; setTogglingCam(true);
    try { await localParticipant.setCameraEnabled(!isCameraEnabled); onDeviceError?.(null); }
    catch (e) { report(e); } finally { setTogglingCam(false); }
  }, [isCameraEnabled, togglingCam, report, localParticipant, onDeviceError]);

  const toggleScreen = useCallback(async () => {
    if (togglingScreen || !canScreenShare) return; setTogglingScreen(true);
    try { await localParticipant.setScreenShareEnabled(!isScreenShareEnabled); onDeviceError?.(null); }
    catch (e) { report(e); } finally { setTogglingScreen(false); }
  }, [isScreenShareEnabled, togglingScreen, canScreenShare, report, localParticipant, onDeviceError]);

  /* ── Secondary controls shared between desktop bar & mobile "More" sheet ─ */
  const secondaryControls = (
    <>
      {canScreenShare && (
        <Btn label={isScreenShareEnabled ? "Stop share" : "Share"} active={isScreenShareEnabled}
          onClick={toggleScreen} disabled={togglingScreen} icon={<IC.Share />} />
      )}
      <Btn label="People" active={activePanel === "participants"} onClick={() => { onTogglePanel?.("participants"); setShowMore(false); }} icon={<IC.People />} />
      <Btn label="Chat" active={activePanel === "chat"} onClick={() => { onTogglePanel?.("chat"); setShowMore(false); }} icon={<IC.Chat />} />
      <Btn label="Captions" active={activePanel === "captions"} onClick={() => { onTogglePanel?.("captions"); setShowMore(false); }} icon={<IC.Captions />} />
      <Btn label={viewMode === "grid" ? "Speaker" : "Grid"} onClick={() => { onToggleView?.(); setShowMore(false); }} icon={viewMode === "grid" ? <IC.Speaker /> : <IC.Grid />} />
      <Btn label={isFullscreen ? "Exit full" : "Fullscreen"} onClick={() => { onToggleFullscreen?.(); setShowMore(false); }} icon={isFullscreen ? <IC.ExitFullscreen /> : <IC.Fullscreen />} />
    </>
  );

  return (
    <>
      {/* ── Desktop controls bar ──────────────────────────────────────── */}
      <div className="hidden sm:flex items-end gap-2 md:gap-3 bg-[#14151c]/80 backdrop-blur-2xl border border-white/[0.08] rounded-2xl px-4 md:px-5 py-3 shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
        <StartAudio className="hidden h-8 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white/40" label="Unlock audio" />
        <Btn label={togglingMic ? "…" : isMicrophoneEnabled ? "Mute" : "Unmute"} danger={!isMicrophoneEnabled}
          onClick={toggleMic} disabled={togglingMic} icon={isMicrophoneEnabled ? <IC.MicOn /> : <IC.MicOff />} />
        <Btn label={togglingCam ? "…" : isCameraEnabled ? "Stop video" : "Start video"} danger={!isCameraEnabled}
          onClick={toggleCam} disabled={togglingCam} icon={isCameraEnabled ? <IC.CamOn /> : <IC.CamOff />} />
        <div className="w-px h-9 bg-white/[0.06] mx-0.5 self-center" />
        {secondaryControls}
        <div className="w-px h-9 bg-white/[0.06] mx-0.5 self-center" />
        <EndBtn onClick={() => room.disconnect(true)} />
      </div>

      {/* ── Mobile compact bar ────────────────────────────────────────── */}
      <div className="flex sm:hidden items-end gap-2 xs:gap-3 bg-[#14151c]/90 backdrop-blur-2xl border border-white/[0.08] rounded-2xl px-3 xs:px-4 py-3 shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
        <Btn label={isMicrophoneEnabled ? "Mute" : "Unmute"} danger={!isMicrophoneEnabled}
          onClick={toggleMic} disabled={togglingMic} icon={isMicrophoneEnabled ? <IC.MicOn /> : <IC.MicOff />} />
        <Btn label={isCameraEnabled ? "Stop" : "Start"} danger={!isCameraEnabled}
          onClick={toggleCam} disabled={togglingCam} icon={isCameraEnabled ? <IC.CamOn /> : <IC.CamOff />} />

        {/* More button — opens overlay sheet */}
        <div className="relative" ref={moreRef}>
          <Btn label="More" active={showMore} onClick={() => setShowMore((v) => !v)} icon={<IC.More />} />
          {showMore && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 bg-[#1a1d27]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-3 shadow-2xl">
              <div className="grid grid-cols-3 gap-2 w-52">
                {canScreenShare && (
                  <Btn label={isScreenShareEnabled ? "Stop share" : "Share"} active={isScreenShareEnabled}
                    onClick={toggleScreen} disabled={togglingScreen} icon={<IC.Share />} />
                )}
                <Btn label="People" active={activePanel === "participants"} onClick={() => { onTogglePanel?.("participants"); setShowMore(false); }} icon={<IC.People />} />
                <Btn label="Chat" active={activePanel === "chat"} onClick={() => { onTogglePanel?.("chat"); setShowMore(false); }} icon={<IC.Chat />} />
                <Btn label="Captions" active={activePanel === "captions"} onClick={() => { onTogglePanel?.("captions"); setShowMore(false); }} icon={<IC.Captions />} />
                <Btn label={viewMode === "grid" ? "Speaker" : "Grid"} onClick={() => { onToggleView?.(); setShowMore(false); }} icon={viewMode === "grid" ? <IC.Speaker /> : <IC.Grid />} />
                <Btn label={isFullscreen ? "Exit" : "Fullscreen"} onClick={() => { onToggleFullscreen?.(); setShowMore(false); }} icon={isFullscreen ? <IC.ExitFullscreen /> : <IC.Fullscreen />} />
              </div>
            </div>
          )}
        </div>

        <EndBtn onClick={() => room.disconnect(true)} />
      </div>
    </>
  );
}
