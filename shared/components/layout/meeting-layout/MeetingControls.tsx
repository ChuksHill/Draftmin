"use client";

import { ReactNode, useCallback, useMemo, useState } from "react";
import { StartAudio, useLocalParticipant, useRoomContext } from "@livekit/components-react";

export type MeetingPanel = "participants" | "chat" | "captions" | null;

type MeetingControlsProps = {
  activePanel?: MeetingPanel;
  onTogglePanel?: (panel: Exclude<MeetingPanel, null>) => void;
  onDeviceError?: (error: Error | null) => void;
};

function ControlIcon({ children }: { children: ReactNode }) {
  return <span className="h-5 w-5">{children}</span>;
}

function IconMic({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M19 11a7 7 0 0 1-14 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 21h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      {muted ? (
        <path d="M5 5l14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : null}
    </svg>
  );
}

function IconCamera({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M4.5 7.5A2.5 2.5 0 0 1 7 5h7a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 14 19H7a2.5 2.5 0 0 1-2.5-2.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M16.5 10.2 21 7.5v9l-4.5-2.7v-3.6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {muted ? (
        <path d="M5 5l14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      ) : null}
    </svg>
  );
}

function IconShare({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M12 16V4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M7.5 8.5 12 4l4.5 4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      {active ? (
        <path d="M12 18h0" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      ) : null}
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M16 18.5c0-2 2-3.5 4-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M4 18.5c0-2 2.7-3.5 6-3.5s6 1.5 6 3.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M10 12.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M18 12a2.5 2.5 0 1 0 0-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconChat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M7 17.5H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v7.5a3 3 0 0 1-3 3h-6.5L7 21v-3.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M7.5 9.5h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7.5 12.5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function IconCaptions() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M4.5 6.5A2.5 2.5 0 0 1 7 4h10a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 17 18H7a2.5 2.5 0 0 1-2.5-2.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M8 11h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13 11h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M8 14h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ControlButton({
  label,
  active,
  onClick,
  icon,
  disabled,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  icon: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "group flex w-[74px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-xs",
        "border border-white/10 bg-white/5 hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed",
        active ? "ring-1 ring-emerald-400/50 border-emerald-400/30" : "",
      ].join(" ")}
    >
      <span className="text-white/90">{icon}</span>
      <span className="text-white/70 group-hover:text-white/90">{label}</span>
    </button>
  );
}

export function MeetingControls({ activePanel, onTogglePanel, onDeviceError }: MeetingControlsProps) {
  const room = useRoomContext();
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant();

  const [togglingMic, setTogglingMic] = useState(false);
  const [togglingCamera, setTogglingCamera] = useState(false);
  const [togglingScreen, setTogglingScreen] = useState(false);

  const reportDeviceError = useCallback(
    (error: unknown) => {
      const normalized = error instanceof Error ? error : new Error(String(error));
      onDeviceError?.(normalized);
    },
    [onDeviceError],
  );

  const toggleMic = useCallback(async () => {
    if (togglingMic) return;
    setTogglingMic(true);
    try {
      await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled);
      onDeviceError?.(null);
    } catch (error) {
      reportDeviceError(error);
    } finally {
      setTogglingMic(false);
    }
  }, [isMicrophoneEnabled, togglingMic, reportDeviceError, localParticipant, onDeviceError]);

  const toggleCamera = useCallback(async () => {
    if (togglingCamera) return;
    setTogglingCamera(true);
    try {
      await localParticipant.setCameraEnabled(!isCameraEnabled);
      onDeviceError?.(null);
    } catch (error) {
      reportDeviceError(error);
    } finally {
      setTogglingCamera(false);
    }
  }, [isCameraEnabled, togglingCamera, reportDeviceError, localParticipant, onDeviceError]);

  const toggleScreenShare = useCallback(async () => {
    if (togglingScreen) return;
    setTogglingScreen(true);
    try {
      await localParticipant.setScreenShareEnabled(!isScreenShareEnabled);
      onDeviceError?.(null);
    } catch (error) {
      reportDeviceError(error);
    } finally {
      setTogglingScreen(false);
    }
  }, [isScreenShareEnabled, togglingScreen, reportDeviceError, localParticipant, onDeviceError]);

  const togglePanel = useMemo(() => {
    return (panel: Exclude<MeetingPanel, null>) => onTogglePanel?.(panel);
  }, [onTogglePanel]);

  return (
    <div className="w-full flex items-center justify-between gap-3">
      <div className="hidden md:flex items-center gap-2">
        <StartAudio
          className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white/80 hover:bg-white/10 transition"
          label="Enable audio playback"
        />
      </div>

      <div className="flex flex-1 items-center justify-center gap-2">
        <ControlButton
          label={togglingMic ? "Syncing..." : isMicrophoneEnabled ? "Mute" : "Unmute"}
          onClick={toggleMic}
          disabled={togglingMic}
          icon={
            <ControlIcon>
              <IconMic muted={!isMicrophoneEnabled} />
            </ControlIcon>
          }
          active={!isMicrophoneEnabled}
        />
        <ControlButton
          label={togglingCamera ? "Syncing..." : isCameraEnabled ? "Stop Video" : "Start Video"}
          onClick={toggleCamera}
          disabled={togglingCamera}
          icon={
            <ControlIcon>
              <IconCamera muted={!isCameraEnabled} />
            </ControlIcon>
          }
          active={!isCameraEnabled}
        />
        <ControlButton
          label={togglingScreen ? "Sharing..." : isScreenShareEnabled ? "Stop Share" : "Share"}
          onClick={toggleScreenShare}
          disabled={togglingScreen}
          icon={
            <ControlIcon>
              <IconShare active={isScreenShareEnabled} />
            </ControlIcon>
          }
          active={isScreenShareEnabled}
        />

        <div className="hidden md:block h-9 w-px bg-white/10 mx-1" />

        <ControlButton
          label="Participants"
          onClick={() => togglePanel("participants")}
          icon={
            <ControlIcon>
              <IconUsers />
            </ControlIcon>
          }
          active={activePanel === "participants"}
        />
        <ControlButton
          label="Chat"
          onClick={() => togglePanel("chat")}
          icon={
            <ControlIcon>
              <IconChat />
            </ControlIcon>
          }
          active={activePanel === "chat"}
        />
        <ControlButton
          label="Captions"
          onClick={() => togglePanel("captions")}
          icon={
            <ControlIcon>
              <IconCaptions />
            </ControlIcon>
          }
          active={activePanel === "captions"}
        />
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => {
            room.disconnect(true);
          }}
          className="h-10 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 transition"
        >
          End
        </button>
      </div>
    </div>
  );
}
