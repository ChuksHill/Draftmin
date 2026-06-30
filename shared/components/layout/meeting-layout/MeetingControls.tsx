"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useLocalParticipant, useRoomContext } from "@livekit/components-react";

export type MeetingPanel = "participants" | "chat" | "captions" | "agenda" | null;

type Props = {
  activePanel?: MeetingPanel;
  onTogglePanel?: (panel: Exclude<MeetingPanel, null>) => void;
  onDeviceError?: (error: Error | null) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  viewMode?: "grid" | "speaker";
  onToggleView?: () => void;
  isHost?: boolean;
  onEndMeeting?: () => void;
  onLeave?: () => void;
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
  Agenda: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
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
  Leave: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
  More: () => (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </svg>
  ),
};

/* ── Button atom ───────────────────────────────────────────────────────── */
function Btn({
  label, danger, active, onClick, icon, disabled, compact = false,
}: {
  label: string; danger?: boolean; active?: boolean; onClick?: () => void;
  icon: ReactNode; disabled?: boolean; compact?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={label}
        aria-label={label}
        className={[
          compact ? "h-9 w-9" : "h-10 w-10",
          "rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-40",
          danger
            ? "bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30"
            : active
            ? "bg-[#0B5CFF]/20 border border-[#0B5CFF]/40 text-[#4f8cff]"
            : "bg-white/10 border border-white/[0.08] text-white hover:bg-white/20",
        ].join(" ")}
      >
        {icon}
      </button>
      <span className={`text-[9px] leading-none select-none mt-0.5 ${active ? "text-[#4f8cff]" : "text-white/40"}`}>
        {label}
      </span>
    </div>
  );
}

/* ── Row divider ───────────────────────────────────────────────────────── */
function Divider() {
  return <div className="h-8 w-px bg-white/10 mx-1 self-center" />;
}

/* ── End/Leave button ──────────────────────────────────────────────────── */
function EndBtn({ onClick, isHost }: { onClick?: () => void; isHost?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button
        type="button"
        onClick={onClick}
        aria-label={isHost ? "End meeting for all" : "Leave meeting"}
        className={`h-10 w-12 rounded-full flex items-center justify-center transition active:scale-90 ${
          isHost
            ? "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]"
            : "bg-white/10 border border-white/[0.08] text-red-400 hover:bg-red-500/20"
        }`}
      >
        {isHost ? <IC.EndCall /> : <IC.Leave />}
      </button>
      <span className="text-[9px] text-white/40 select-none mt-0.5">
        {isHost ? "End" : "Leave"}
      </span>
    </div>
  );
}

/* ── More bottom sheet (mobile) ────────────────────────────────────────── */
function MoreSheet({
  open, onClose, children,
}: { open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sheet */}
      <div className="fixed bottom-[72px] inset-x-0 z-50 flex justify-center px-4 pb-2">
        <div className="w-full max-w-xs rounded-2xl bg-[#1e2030] border border-white/10 p-4 shadow-2xl">
          <div className="flex justify-center mb-3">
            <div className="h-1 w-10 rounded-full bg-white/20" />
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {children}
          </div>
        </div>
      </div>
    </>
  );
}

/* ── Main export ──────────────────────────────────────────────────────── */
export function MeetingControls({
  activePanel, onTogglePanel, onDeviceError,
  isFullscreen = false, onToggleFullscreen,
  viewMode = "grid", onToggleView,
  isHost = false, onEndMeeting, onLeave,
}: Props) {
  useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();
  const [togglingMic, setTogglingMic] = useState(false);
  const [togglingCam, setTogglingCam] = useState(false);
  const [togglingScreen, setTogglingScreen] = useState(false);
  const [canScreenShare, setCanScreenShare] = useState(false);
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    setCanScreenShare(typeof navigator.mediaDevices?.getDisplayMedia === "function");
  }, []);

  const report = useCallback(
    (e: unknown) => onDeviceError?.(e instanceof Error ? e : new Error(String(e))),
    [onDeviceError]
  );

  const toggleMic = useCallback(async () => {
    if (togglingMic) return;
    setTogglingMic(true);
    try { await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled); onDeviceError?.(null); }
    catch (e) { report(e); }
    finally { setTogglingMic(false); }
  }, [isMicrophoneEnabled, togglingMic, report, localParticipant, onDeviceError]);

  const toggleCam = useCallback(async () => {
    if (togglingCam) return;
    setTogglingCam(true);
    try { await localParticipant.setCameraEnabled(!isCameraEnabled); onDeviceError?.(null); }
    catch (e) { report(e); }
    finally { setTogglingCam(false); }
  }, [isCameraEnabled, togglingCam, report, localParticipant, onDeviceError]);

  const toggleScreen = useCallback(async () => {
    if (togglingScreen || !canScreenShare) return;
    setTogglingScreen(true);
    try { await localParticipant.setScreenShareEnabled(!isScreenShareEnabled); onDeviceError?.(null); }
    catch (e) { report(e); }
    finally { setTogglingScreen(false); }
  }, [isScreenShareEnabled, togglingScreen, canScreenShare, report, localParticipant, onDeviceError]);

  const handleLeaveClick = () => {
    if (isHost) { onEndMeeting?.(); } else { onLeave?.(); }
  };

  /* Secondary controls (shown inline on desktop, in sheet on mobile) */
  const secondaryControls = (compact = false) => (
    <>
      {canScreenShare && (
        <Btn
          compact={compact}
          label={isScreenShareEnabled ? "Stop" : "Share"}
          active={isScreenShareEnabled}
          onClick={() => { toggleScreen(); setShowMore(false); }}
          disabled={togglingScreen}
          icon={<IC.Share />}
        />
      )}
      <Btn
        compact={compact}
        label="People"
        active={activePanel === "participants"}
        onClick={() => { onTogglePanel?.("participants"); setShowMore(false); }}
        icon={<IC.People />}
      />
      <Btn
        compact={compact}
        label="Chat"
        active={activePanel === "chat"}
        onClick={() => { onTogglePanel?.("chat"); setShowMore(false); }}
        icon={<IC.Chat />}
      />
      <Btn
        compact={compact}
        label="Agenda"
        active={activePanel === "agenda"}
        onClick={() => { onTogglePanel?.("agenda"); setShowMore(false); }}
        icon={<IC.Agenda />}
      />
      <Btn
        compact={compact}
        label="Captions"
        active={activePanel === "captions"}
        onClick={() => { onTogglePanel?.("captions"); setShowMore(false); }}
        icon={<IC.Captions />}
      />
      <Btn
        compact={compact}
        label={viewMode === "grid" ? "Speaker" : "Grid"}
        onClick={() => { onToggleView?.(); setShowMore(false); }}
        icon={viewMode === "grid" ? <IC.Speaker /> : <IC.Grid />}
      />
      <Btn
        compact={compact}
        label={isFullscreen ? "Exit Full" : "Fullscreen"}
        onClick={() => { onToggleFullscreen?.(); setShowMore(false); }}
        icon={isFullscreen ? <IC.ExitFullscreen /> : <IC.Fullscreen />}
      />
    </>
  );

  return (
    <>
      {/* ── Fixed bottom control bar ─────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center items-center bg-[#111111]/95 border-t border-white/[0.07] backdrop-blur-md px-3 py-2">

        {/* ── Mobile: compact pill — only essential buttons + More ── */}
        <div className="flex sm:hidden items-center gap-2">
          {/* Mic */}
          <Btn
            label={togglingMic ? "…" : isMicrophoneEnabled ? "Mute" : "Unmute"}
            danger={!isMicrophoneEnabled}
            active={isMicrophoneEnabled}
            onClick={toggleMic}
            disabled={togglingMic}
            icon={isMicrophoneEnabled ? <IC.MicOn /> : <IC.MicOff />}
          />
          {/* Camera */}
          <Btn
            label={togglingCam ? "…" : isCameraEnabled ? "Stop" : "Start"}
            danger={!isCameraEnabled}
            active={isCameraEnabled}
            onClick={toggleCam}
            disabled={togglingCam}
            icon={isCameraEnabled ? <IC.CamOn /> : <IC.CamOff />}
          />

          <Divider />

          {/* More — opens sheet */}
          <Btn
            label="More"
            active={showMore}
            onClick={() => setShowMore((v) => !v)}
            icon={<IC.More />}
          />

          <Divider />

          {/* Leave / End */}
          <EndBtn onClick={handleLeaveClick} isHost={isHost} />
        </div>

        {/* ── Desktop: full pill with all buttons inline ──────────── */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-2xl bg-[#232530]/80 border border-white/10 px-4 py-2.5 shadow-xl">
          {/* Mic */}
          <Btn
            label={togglingMic ? "…" : isMicrophoneEnabled ? "Mute" : "Unmute"}
            danger={!isMicrophoneEnabled}
            active={isMicrophoneEnabled}
            onClick={toggleMic}
            disabled={togglingMic}
            icon={isMicrophoneEnabled ? <IC.MicOn /> : <IC.MicOff />}
          />
          {/* Camera */}
          <Btn
            label={togglingCam ? "…" : isCameraEnabled ? "Stop video" : "Start video"}
            danger={!isCameraEnabled}
            active={isCameraEnabled}
            onClick={toggleCam}
            disabled={togglingCam}
            icon={isCameraEnabled ? <IC.CamOn /> : <IC.CamOff />}
          />

          <Divider />

          {secondaryControls()}

          <Divider />

          {/* Leave / End */}
          <EndBtn onClick={handleLeaveClick} isHost={isHost} />
        </div>
      </div>

      {/* ── Mobile More sheet ──────────────────────────────────────── */}
      <MoreSheet open={showMore} onClose={() => setShowMore(false)}>
        {secondaryControls(true)}
      </MoreSheet>
    </>
  );
}
