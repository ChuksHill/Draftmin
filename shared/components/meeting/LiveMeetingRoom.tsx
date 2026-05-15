"use client";

import { useEffect, useState } from "react";
import {
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useChat,
  useParticipants,
  useTracks,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { MeetingLayout } from "@/shared/components/layout/meeting-layout/MeetingLayout";
import { MeetingHeader } from "@/shared/components/layout/meeting-layout/MeetingHeader";
import { MeetingControls, MeetingPanel } from "@/shared/components/layout/meeting-layout/MeetingControls";

type TokenResponse = {
  url: string;
  token: string;
  room: string;
  identity: string;
};

export type LiveMeetingRoomProps = {
  roomName: string;
  identity: string;
  title?: string;
  startWithMic?: boolean;
  startWithCamera?: boolean;
};

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SidePanel({
  activePanel,
  onClose,
}: {
  activePanel: Exclude<MeetingPanel, null>;
  onClose: () => void;
}) {
  const participants = useParticipants();
  const { chatMessages, send, isSending } = useChat();
  const [draft, setDraft] = useState("");

  const title =
    activePanel === "participants"
      ? `Participants (${participants.length})`
      : activePanel === "chat"
        ? "Chat"
        : "Captions";

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="text-sm font-semibold text-white">{title}</div>
        <button
          type="button"
          onClick={onClose}
          className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition grid place-items-center"
          aria-label="Close panel"
        >
          <IconClose />
        </button>
      </div>

      {activePanel === "participants" ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {participants.map((participant) => (
            <div
              key={participant.identity}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm text-white">
                  {participant.identity}
                  {participant.isLocal ? " (You)" : ""}
                </div>
                <div className="mt-0.5 text-xs text-white/50">
                  {participant.isSpeaking ? "Speaking" : "In meeting"}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <span className={participant.isMicrophoneEnabled ? "text-white/70" : "text-red-300"}>
                  {participant.isMicrophoneEnabled ? "Mic" : "Mic off"}
                </span>
                <span className={participant.isCameraEnabled ? "text-white/70" : "text-white/40"}>
                  {participant.isCameraEnabled ? "Cam" : "No cam"}
                </span>
              </div>
            </div>
          ))}
          {participants.length === 0 ? (
            <div className="text-sm text-white/60">No participants yet.</div>
          ) : null}
        </div>
      ) : null}

      {activePanel === "chat" ? (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-sm text-white/60">No messages yet.</div>
            ) : null}
            {chatMessages.map((msg) => (
              <div key={`${msg.timestamp}-${msg.message}`} className="space-y-1">
                <div className="text-xs text-white/50">
                  {msg.from?.identity ?? "Unknown"}
                  {msg.from?.isLocal ? " (You)" : ""}
                </div>
                <div className="inline-block max-w-[92%] rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white">
                  {msg.message}
                </div>
              </div>
            ))}
          </div>

          <form
            className="border-t border-white/10 p-3"
            onSubmit={async (event) => {
              event.preventDefault();
              const message = draft.trim();
              if (!message) return;
              await send(message);
              setDraft("");
            }}
          >
            <div className="flex items-center gap-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Type a message…"
                className="h-10 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20"
              />
              <button
                type="submit"
                disabled={isSending || draft.trim().length === 0}
                className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50 hover:bg-blue-700 transition"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {activePanel === "captions" ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold text-white">Live captions</div>
            <p className="mt-2 text-sm text-white/60">
              Captions UI is ready. Wire this up to LiveKit transcriptions or your preferred speech-to-text provider.
            </p>
          </div>
          <div className="text-sm text-white/60">No captions yet.</div>
        </div>
      ) : null}
    </div>
  );
}

function MeetingStage() {
  const tracks = useTracks([
    { source: Track.Source.ScreenShare, withPlaceholder: false },
    { source: Track.Source.Camera, withPlaceholder: true },
  ]);

  return (
    <div className="h-full w-full p-3 md:p-5">
      <div className="h-full rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
        <GridLayout tracks={tracks} className="h-full w-full p-3 md:p-4 gap-3">
          <ParticipantTile className="h-full w-full overflow-hidden rounded-xl border border-white/10 bg-[#10131A] [&_video]:h-full [&_video]:w-full [&_video]:object-cover" />
        </GridLayout>
      </div>
      <RoomAudioRenderer />
    </div>
  );
}

export function LiveMeetingRoom({
  roomName,
  identity,
  title = "Draftmin Meeting",
  startWithMic = true,
  startWithCamera = false,
}: LiveMeetingRoomProps) {
  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<MeetingPanel>(null);

  const audioCaptureOptions = startWithMic
    ? {
        autoGainControl: true,
        echoCancellation: true,
        noiseSuppression: true,
      }
    : false;

  const handleMediaFailure = (failure?: unknown, kind?: string) => {
    const kindLabel = kind === "videoinput" ? "camera" : kind === "audioinput" ? "microphone" : "media device";
    setDeviceError(
      `Unable to access your ${kindLabel}. ${(failure as { message?: string })?.message ?? "Check permissions and try again."}`,
    );
  };

  useEffect(() => {
    const controller = new AbortController();

    async function loadToken() {
      try {
        const response = await fetch(
          `/api/livekit/token?room=${encodeURIComponent(roomName)}&identity=${encodeURIComponent(identity)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Unable to get LiveKit token");
        }

        const data = (await response.json()) as TokenResponse;
        setTokenData(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : String(error));
      }
    }

    loadToken();

    return () => controller.abort();
  }, [identity, roomName]);

  if (!tokenData && !error) {
    return (
      <div className="h-screen w-full bg-[#0B0F19] text-white flex items-center justify-center px-6">
        <div className="max-w-lg rounded-[2rem] border border-white/10 bg-white/5 p-10 text-center">
          <div className="text-lg font-semibold text-white">Connecting to the meeting…</div>
          <p className="mt-3 text-sm text-white/60">Fetching a LiveKit token and opening the room for your session.</p>
        </div>
      </div>
    );
  }

  if (error || !tokenData) {
    return (
      <div className="h-screen w-full bg-[#0B0F19] text-white flex items-center justify-center px-6">
        <div className="max-w-lg rounded-[2rem] border border-red-500/30 bg-white/5 p-10 text-center">
          <div className="text-lg font-semibold text-white">Unable to join the meeting</div>
          <p className="mt-3 text-sm text-white/60">{error ?? "LiveKit token service did not return a session."}</p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={tokenData.url}
      token={tokenData.token}
      audio={audioCaptureOptions}
      video={startWithCamera}
      connect
      onMediaDeviceFailure={handleMediaFailure}
    >
      <MeetingLayout
        header={<MeetingHeader title={title} />}
        sidebar={
          activePanel ? (
            <SidePanel activePanel={activePanel} onClose={() => setActivePanel(null)} />
          ) : undefined
        }
        controls={
          <MeetingControls
            activePanel={activePanel}
            onTogglePanel={(panel) => setActivePanel((current) => (current === panel ? null : panel))}
            onDeviceError={(error) => setDeviceError(error.message)}
          />
        }
      >
        <div className="h-full w-full flex flex-col min-h-0">
          {deviceError ? (
            <div className="px-5 pt-5">
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
                <div className="font-semibold">Media device issue</div>
                <p className="mt-1 text-amber-100/80">{deviceError}</p>
              </div>
            </div>
          ) : null}
          <div className="flex-1 min-h-0">
            <MeetingStage />
          </div>
        </div>
      </MeetingLayout>
    </LiveKitRoom>
  );
}

