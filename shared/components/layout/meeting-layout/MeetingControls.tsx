"use client";

import { ReactNode, useCallback, useState } from "react";
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

/* ── Icons ────────────────────────────────────────────────────────────────── */
function IconMic({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
      {off ? (
        <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3zM19 10v1a7 7 0 01-14 0v-1M12 19v3m-3 0h6M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <>
          <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M19 10v1a7 7 0 01-14 0v-1M12 19v3m-3 0h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function IconCamera({ off }: { off: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
      {off ? (
        <path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 3l18 18M7.5 8H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 001.5-.67" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : (
        <>
          <path d="M15 10l4.553-2.277A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <rect x="3" y="8" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}

function IconShare({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {active && <path d="M7 10l5-5 5 5M12 5v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCaptions() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
      <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 12h4M13 12h4M7 15.5h3M12 15.5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconSpeaker() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
      <rect x="2" y="3" width="15" height="14" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="19" y="4" width="3" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="19" y="12" width="3" height="5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 21h20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function IconFullscreen({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
      {active ? (
        <path d="M8 3v3a2 2 0 01-2 2H3M21 8h-3a2 2 0 01-2-2V3M3 16h3a2 2 0 012 2v3M16 21v-3a2 2 0 012-2h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M8 3H5a2 2 0 00-2 2v3M21 8V5a2 2 0 00-2-2h-3M3 16v3a2 2 0 002 2h3M16 21h3a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

function IconEndCall() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M10.68 13.31a16 16 0 003.41 2.6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7 2 2 0 011.72 2v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.42 19.42 0 012 6.18 2 2 0 014 4h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91M23 1L1 23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Button components ────────────────────────────────────────────────────── */
function MediaBtn({ label, danger, onClick, icon, disabled }: { label: string; danger?: boolean; onClick?: () => void; icon: ReactNode; disabled?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 sm:gap-1.5">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={[
          "h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center transition-all active:scale-95 disabled:opacity-40",
          danger
            ? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
            : "bg-white/10 border border-white/[0.08] text-white hover:bg-white/20",
        ].join(" ")}
      >
        {icon}
      </button>
      <span className="text-[9px] sm:text-[10px] text-white/30 select-none hidden xs:block">{label}</span>
    </div>
  );
}

function PanelBtn({ label, active, onClick, icon }: { label: string; active?: boolean; onClick?: () => void; icon: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 sm:gap-1.5">
      <button
        type="button"
        onClick={onClick}
        className={[
          "h-9 w-9 sm:h-10 sm:w-10 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all active:scale-95",
          active
            ? "bg-blue-500/20 border border-blue-500/30 text-blue-400"
            : "bg-white/5 border border-white/[0.06] text-white/50 hover:bg-white/10 hover:text-white",
        ].join(" ")}
      >
        {icon}
      </button>
      <span className={["text-[9px] sm:text-[10px] select-none hidden xs:block", active ? "text-blue-400/80" : "text-white/25"].join(" ")}>{label}</span>
    </div>
  );
}

/* ── Main export ──────────────────────────────────────────────────────────── */
export function MeetingControls({ activePanel, onTogglePanel, onDeviceError, isFullscreen = false, onToggleFullscreen, viewMode = "grid", onToggleView }: Props) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const [togglingMic, setTogglingMic] = useState(false);
  const [togglingCam, setTogglingCam] = useState(false);
  const [togglingScreen, setTogglingScreen] = useState(false);

  const report = useCallback((e: unknown) => onDeviceError?.(e instanceof Error ? e : new Error(String(e))), [onDeviceError]);

  const toggleMic = useCallback(async () => {
    if (togglingMic) return;
    setTogglingMic(true);
    try { await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled); onDeviceError?.(null); }
    catch (e) { report(e); } finally { setTogglingMic(false); }
  }, [isMicrophoneEnabled, togglingMic, report, localParticipant, onDeviceError]);

  const toggleCam = useCallback(async () => {
    if (togglingCam) return;
    setTogglingCam(true);
    try { await localParticipant.setCameraEnabled(!isCameraEnabled); onDeviceError?.(null); }
    catch (e) { report(e); } finally { setTogglingCam(false); }
  }, [isCameraEnabled, togglingCam, report, localParticipant, onDeviceError]);

  const toggleScreen = useCallback(async () => {
    if (togglingScreen) return;
    setTogglingScreen(true);
    try { await localParticipant.setScreenShareEnabled(!isScreenShareEnabled); onDeviceError?.(null); }
    catch (e) { report(e); } finally { setTogglingScreen(false); }
  }, [isScreenShareEnabled, togglingScreen, report, localParticipant, onDeviceError]);

  return (
    <div className="flex items-end gap-1.5 sm:gap-3 bg-[#14151c]/80 backdrop-blur-2xl border border-white/[0.08] rounded-2xl px-3 sm:px-5 py-3 sm:py-4 shadow-[0_8px_40px_rgba(0,0,0,0.6)] overflow-x-auto max-w-full">
      {/* Audio unlock */}
      <StartAudio
        className="hidden h-8 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white/40 hover:text-white transition"
        label="Unlock audio"
      />

      {/* Primary controls */}
      <MediaBtn label={togglingMic ? "…" : isMicrophoneEnabled ? "Mute" : "Unmute"} danger={!isMicrophoneEnabled} onClick={toggleMic} disabled={togglingMic} icon={<IconMic off={!isMicrophoneEnabled} />} />
      <MediaBtn label={togglingCam ? "…" : isCameraEnabled ? "Stop video" : "Start video"} danger={!isCameraEnabled} onClick={toggleCam} disabled={togglingCam} icon={<IconCamera off={!isCameraEnabled} />} />
      {/* Hide screen share on very small screens */}
      <div className="hidden sm:block">
        <MediaBtn label={isScreenShareEnabled ? "Stop share" : "Share screen"} onClick={toggleScreen} disabled={togglingScreen} icon={<IconShare active={isScreenShareEnabled} />} />
      </div>

      <div className="w-px h-8 sm:h-10 bg-white/[0.06] mx-0.5 sm:mx-1 self-center shrink-0" />

      {/* Panel toggles */}
      <PanelBtn label="People" active={activePanel === "participants"} onClick={() => onTogglePanel?.("participants")} icon={<IconUsers />} />
      <PanelBtn label="Chat" active={activePanel === "chat"} onClick={() => onTogglePanel?.("chat")} icon={<IconChat />} />
      {/* Hide captions on small screens */}
      <div className="hidden sm:block">
        <PanelBtn label="Captions" active={activePanel === "captions"} onClick={() => onTogglePanel?.("captions")} icon={<IconCaptions />} />
      </div>

      <div className="w-px h-8 sm:h-10 bg-white/[0.06] mx-0.5 sm:mx-1 self-center shrink-0 hidden sm:block" />

      {/* View + fullscreen (desktop only) */}
      <div className="hidden sm:block">
        <PanelBtn label={viewMode === "grid" ? "Speaker" : "Grid"} onClick={onToggleView} icon={viewMode === "grid" ? <IconSpeaker /> : <IconGrid />} />
      </div>
      <div className="hidden sm:block">
        <PanelBtn label={isFullscreen ? "Exit full" : "Fullscreen"} onClick={onToggleFullscreen} icon={<IconFullscreen active={isFullscreen} />} />
      </div>

      <div className="w-px h-8 sm:h-10 bg-white/[0.06] mx-0.5 sm:mx-1 self-center shrink-0" />

      {/* End call */}
      <div className="flex flex-col items-center gap-1 sm:gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => room.disconnect(true)}
          className="h-10 w-12 sm:h-12 sm:w-14 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 transition flex items-center justify-center text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]"
          aria-label="Leave meeting"
        >
          <IconEndCall />
        </button>
        <span className="text-[9px] sm:text-[10px] text-white/30 select-none hidden xs:block">Leave</span>
      </div>
    </div>
  );
}
