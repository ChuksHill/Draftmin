"use client";

import { useEffect, useRef, useState } from "react";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useChat,
  useParticipants,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import { Track } from "livekit-client";
import { MeetingLayout } from "@/shared/components/layout/meeting-layout/MeetingLayout";
import { MeetingHeader } from "@/shared/components/layout/meeting-layout/MeetingHeader";
import { MeetingControls, MeetingPanel } from "@/shared/components/layout/meeting-layout/MeetingControls";

type SttProvider = "deepgram" | "whisper" | "webspeech";

type SimpleSpeechRecognitionAlternative = {
  transcript?: string;
};

type SimpleSpeechRecognitionResult = {
  isFinal: boolean;
  [index: number]: SimpleSpeechRecognitionAlternative;
};

type SimpleSpeechRecognitionResultList = {
  length: number;
  [index: number]: SimpleSpeechRecognitionResult;
};

type SimpleSpeechRecognitionEvent = Event & {
  readonly resultIndex: number;
  readonly results: SimpleSpeechRecognitionResultList;
};

type SimpleSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult?: (event: SimpleSpeechRecognitionEvent) => void;
  onerror?: (event: { error?: string; message?: string }) => void;
  onend?: () => void;
  start: () => void;
  stop: () => void;
};

type SimpleSpeechRecognitionConstructor = new () => SimpleSpeechRecognition;

type TokenResponse = {
  url: string;
  token: string;
  room: string;
  identity: string;
};

function parseSttProviderOrder(value: string | undefined | null): SttProvider[] {
  const normalized = (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  const order = normalized.filter((entry): entry is SttProvider => entry === "deepgram" || entry === "whisper" || entry === "webspeech");
  return order.length > 0 ? order : ["webspeech"];
}

function parsePositiveInt(value: string | undefined | null, fallback: number) {
  const parsed = Number.parseInt((value ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const DEFAULT_STT_PROVIDER_ORDER = parseSttProviderOrder(process.env.NEXT_PUBLIC_STT_PROVIDER_ORDER);
const DEFAULT_STT_LANG = (process.env.NEXT_PUBLIC_STT_LANG ?? "en-US").trim() || "en-US";
const DEFAULT_STT_CHUNK_MS = parsePositiveInt(process.env.NEXT_PUBLIC_STT_CHUNK_MS, 4000);
const STT_DISABLED = Boolean((process.env.NEXT_PUBLIC_STT_DISABLED ?? "").trim());

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
  captions,
  interimCaption,
  captionError,
  speechRecognitionAvailable,
  providerOrder,
}: {
  activePanel: Exclude<MeetingPanel, null>;
  onClose: () => void;
  captions: string[];
  interimCaption: string;
  captionError: string | null;
  speechRecognitionAvailable: boolean;
  providerOrder: SttProvider[];
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
              Live captions use hybrid speech-to-text. If one provider fails, Draftmin automatically switches to the next available option. Allow microphone access and speak clearly for the best results.
            </p>
          </div>

          {!speechRecognitionAvailable && providerOrder.includes("webspeech") ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
              Browser speech recognition (WebSpeech) is not available in this browser. Captions will fall back to server-based STT when configured.
            </div>
          ) : null}

          {captionError ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
              <div className="font-semibold">Caption error</div>
              <p className="mt-1 text-rose-100/80">{captionError}</p>
            </div>
          ) : null}

          {interimCaption ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/90">
              <div className="text-xs uppercase tracking-[0.18em] text-white/50">Interim transcript</div>
              <p className="mt-2">{interimCaption}</p>
            </div>
          ) : null}

          {captions.length > 0 ? (
            <div className="space-y-3">
              {captions.map((caption, index) => (
                <div key={`${caption}-${index}`} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/90">
                  {caption}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
              No captions yet. Speak into your microphone to start transcription.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function CustomParticipantTile({ trackRef }: { trackRef: any }) {
  const participant = trackRef.participant;
  const isVideoEnabled = trackRef.publication?.isSubscribed && !trackRef.publication?.isMuted;
  const isSpeaking = participant?.isSpeaking;
  const identity = participant?.identity ?? "Unknown";

  // Generate initials
  const initials = identity
    .split("-")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-xl border bg-[#10131A] transition-all duration-300 ${
        isSpeaking
          ? "border-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)] scale-[1.01]"
          : "border-white/10 hover:border-white/20"
      }`}
    >
      {isVideoEnabled && trackRef.publication?.track ? (
        <VideoTrack
          trackRef={trackRef as any}
          className="h-full w-full object-cover [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1E1B4B] to-[#0F172A]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-600/20 border border-violet-500/30 text-base font-bold text-violet-300 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
            {initials}
          </div>
          <span className="mt-3 text-xs text-white/50">{identity}</span>
        </div>
      )}

      {/* Bottom Name & Mic Panel */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl border border-white/5 bg-black/40 px-3 py-1.5 backdrop-blur-md">
        <span className="truncate text-xs font-medium text-white">
          {identity} {participant?.isLocal ? " (You)" : ""}
        </span>
        <div className="flex items-center gap-1.5">
          {participant?.isMicrophoneEnabled ? (
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-emerald-400" aria-hidden="true">
              <path
                d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v1a7 7 0 01-14 0v-1M12 18v5m-4 0h8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-rose-400" aria-hidden="true">
              <path
                d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v1a7 7 0 01-14 0v-1M12 18v5m-4 0h8M3 3l18 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

function MeetingStage() {
  const screenShareTracks = useTracks([
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);

  const cameraTracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
  ]);

  const isScreenSharing = screenShareTracks.length > 0;

  return (
    <div className="h-full w-full p-3 md:p-5">
      <div className="h-full rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
        {isScreenSharing ? (
          <div className="flex h-full w-full flex-col lg:flex-row gap-4 p-3 md:p-4">
            {/* Screen Share Large Area */}
            <div className="flex-1 min-w-0 h-[60%] lg:h-full relative rounded-xl overflow-hidden border border-white/15 bg-black/50">
              <VideoTrack
                trackRef={screenShareTracks[0] as any}
                className="h-full w-full object-contain [&_video]:h-full [&_video]:w-full [&_video]:object-contain"
              />
              <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl border border-white/5 bg-black/60 px-3 py-1.5 backdrop-blur-md text-xs text-white">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span>{screenShareTracks[0].participant.identity}'s Screen Share</span>
              </div>
            </div>

            {/* Scrolling camera track strip */}
            <div className="w-full lg:w-80 flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto min-h-[140px] lg:min-h-0 lg:max-h-full pb-2 lg:pb-0 pr-2 scrollbar-thin scrollbar-thumb-white/10">
              {cameraTracks.map((track) => (
                <div key={track.participant.identity} className="w-48 lg:w-full h-[120px] lg:h-[180px] shrink-0">
                  <CustomParticipantTile trackRef={track} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Responsive standard camera grid */
          <div className="h-full w-full p-3 md:p-4 gap-3 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 auto-rows-fr overflow-y-auto">
            {cameraTracks.map((track) => (
              <CustomParticipantTile key={track.participant.identity} trackRef={track} />
            ))}
          </div>
        )}
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
  const [captions, setCaptions] = useState<string[]>([]);
  const [interimCaption, setInterimCaption] = useState<string>("");
  const [captionError, setCaptionError] = useState<string | null>(null);
  const recognitionRef = useRef<SimpleSpeechRecognition | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const transcriptionQueueRef = useRef<Promise<void>>(Promise.resolve());
  const activeProviderRef = useRef<SttProvider | null>(null);

  const speechRecognitionAvailable =
    typeof window !== "undefined" &&
    (() => {
      const win = window as Window & {
        SpeechRecognition?: SimpleSpeechRecognitionConstructor;
        webkitSpeechRecognition?: SimpleSpeechRecognitionConstructor;
      };
      return Boolean(win.SpeechRecognition ?? win.webkitSpeechRecognition);
    })();

  const sttProviderOrder = DEFAULT_STT_PROVIDER_ORDER;
  const sttLang = DEFAULT_STT_LANG;
  const sttChunkMs = DEFAULT_STT_CHUNK_MS;
  const sttDisabled = STT_DISABLED;

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (sttDisabled) {
      return;
    }

    let cancelled = false;
    let currentStop: (() => void) | null = null;
    let currentIndex = 0;
    const failures = new Map<SttProvider, number>();

    const cleanupCurrent = () => {
      currentStop?.();
      currentStop = null;
      activeProviderRef.current = null;
    };

    const stopMediaRecorder = () => {
      const recorder = recorderRef.current;
      recorderRef.current = null;
      try {
        if (recorder && recorder.state !== "inactive") {
          recorder.stop();
        }
      } catch {
        // ignore
      }

      const stream = mediaStreamRef.current;
      mediaStreamRef.current = null;
      try {
        stream?.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
    };

    const stopWebSpeech = () => {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (!recognition) return;
      try {
        recognition.onresult = undefined;
        recognition.onend = undefined;
        recognition.onerror = undefined;
        recognition.stop?.();
      } catch {
        // ignore
      }
    };

    const startWebSpeech = (): (() => void) => {
      const win = window as Window & {
        SpeechRecognition?: SimpleSpeechRecognitionConstructor;
        webkitSpeechRecognition?: SimpleSpeechRecognitionConstructor;
      };
      const SpeechRecognition = win.SpeechRecognition ?? win.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error("Browser speech recognition is not available.");
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = sttLang;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: SimpleSpeechRecognitionEvent) => {
        let nextInterim = "";
        const finalized: string[] = [];

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = result[0]?.transcript?.trim();
          if (!transcript) continue;

          if (result.isFinal) {
            finalized.push(transcript);
          } else {
            nextInterim = transcript;
          }
        }

        if (nextInterim) {
          setInterimCaption(nextInterim);
        }

        if (finalized.length > 0) {
          setCaptions((current) => [...current, ...finalized]);
          setInterimCaption("");
        }
      };

      recognition.onerror = (event: { error?: string; message?: string }) => {
        const message = event.error ?? String(event.message ?? "Speech recognition error");
        setCaptionError(message);
        void switchProvider(`WebSpeech failed: ${message}`);
      };

      recognition.onend = () => {
        if (!recognitionRef.current) return;
        try {
          recognition.start();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn("WebSpeech restart issue:", message);
          // Try to restart one more time after a short delay before giving up
          setTimeout(() => {
            if (!recognitionRef.current) return;
            try {
              recognition.start();
            } catch (retryError) {
              const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
              if (retryMessage.toLowerCase().includes("already")) return; // ignore already-started
              setCaptionError(retryMessage);
              void switchProvider("WebSpeech could not restart.");
            }
          }, 1000);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;

      return () => stopWebSpeech();
    };

    const transcribeChunk = async (provider: Exclude<SttProvider, "webspeech">, blob: Blob) => {
      const response = await fetch("/api/stt", {
        method: "POST",
        headers: {
          "x-stt-provider": provider,
          "x-stt-lang": sttLang,
        },
        body: blob,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || `STT request failed (${response.status})`);
      }

      const data = (await response.json()) as { provider?: string; text?: string; error?: string };
      if (data.error) throw new Error(data.error);
      return (data.text ?? "").trim();
    };

    const startServerStt = async (provider: Exclude<SttProvider, "webspeech">): Promise<() => void> => {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone capture is not supported in this browser.");
      }
      if (typeof MediaRecorder === "undefined") {
        throw new Error("MediaRecorder is not available in this browser.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("Cancelled");
      }

      mediaStreamRef.current = stream;

      const supportedMimeTypes = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/ogg"];
      const mimeType = supportedMimeTypes.find((type) => MediaRecorder.isTypeSupported(type));

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (!event.data || event.data.size === 0) return;
        transcriptionQueueRef.current = transcriptionQueueRef.current
          .then(async () => {
            if (cancelled) return;
            if (activeProviderRef.current !== provider) return;
            const text = await transcribeChunk(provider, event.data);
            if (!text) return;
            setCaptions((current) => [...current, text]);
            setInterimCaption("");
            failures.set(provider, 0);
          })
          .catch((error) => {
            const next = (failures.get(provider) ?? 0) + 1;
            failures.set(provider, next);
            const message = error instanceof Error ? error.message : String(error);
            setCaptionError(message);
            if (next >= 2) {
              void switchProvider(`${provider} failed: ${message}`);
            }
          });
      };

      // Start recording the first chunk
      recorder.start();

      // Chunking timer: periodically stop current recording (fires ondataavailable)
      // and immediately restart a new complete recording session to ensure proper WebM headers.
      const intervalId = setInterval(() => {
        if (cancelled) {
          clearInterval(intervalId);
          return;
        }
        try {
          if (recorder.state === "recording") {
            recorder.stop();
            // Start recording the next chunk with fresh headers
            recorder.start();
          }
        } catch (e) {
          console.warn("MediaRecorder chunk stop/restart failed:", e);
        }
      }, sttChunkMs);

      return () => {
        clearInterval(intervalId);
        stopMediaRecorder();
      };
    };

    const startProvider = async (provider: SttProvider): Promise<() => void> => {
      setCaptionError(null);
      setInterimCaption("");

      if (provider === "webspeech") {
        stopMediaRecorder();
        return startWebSpeech();
      }

      stopWebSpeech();
      return await startServerStt(provider);
    };

    const supportsProvider = (provider: SttProvider) => {
      if (provider === "webspeech") return speechRecognitionAvailable;
      return typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";
    };

    async function activateFromIndex(index: number, context?: string) {
      cleanupCurrent();

      for (let i = index; i < sttProviderOrder.length; i += 1) {
        const provider = sttProviderOrder[i];
        if (!supportsProvider(provider)) continue;

        try {
          const stop = await startProvider(provider);
          if (cancelled) {
            stop();
            return;
          }
          currentStop = stop;
          currentIndex = i;
          activeProviderRef.current = provider;
          return;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          setCaptionError(context ? `${context} (${message})` : message);
        }
      }

      setCaptionError(
        "No STT provider is available. Enable microphone permissions or try a different browser (Chrome/Edge for WebSpeech).",
      );
    }

    async function switchProvider(reason?: string) {
      const currentProvider = activeProviderRef.current;
      const nextIndex = Math.min(currentIndex + 1, sttProviderOrder.length);
      const prefix = currentProvider ? `Switching STT from ${currentProvider} to next provider.` : "Selecting STT provider.";
      await activateFromIndex(nextIndex, reason ? `${prefix} ${reason}` : prefix);
    }

    void activateFromIndex(0);

    // Recovery timer to periodically attempt to promote STT back to high-quality primary providers (index 0)
    const recoveryIntervalId = setInterval(() => {
      if (cancelled) return;
      if (currentIndex > 0) {
        console.log("Attempting STT recovery to primary provider...");
        void activateFromIndex(0, "Attempting STT primary provider recovery.");
      }
    }, 60000); // Try to recover every 60 seconds

    return () => {
      cancelled = true;
      clearInterval(recoveryIntervalId);
      cleanupCurrent();
      stopWebSpeech();
      stopMediaRecorder();
    };
  }, [speechRecognitionAvailable, sttChunkMs, sttDisabled, sttLang, sttProviderOrder]);

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
      video={
        startWithCamera
          ? {
              resolution: {
                width: 1280,
                height: 720,
                frameRate: 30,
                aspectRatio: 1.777777778,
              },
              facingMode: "user",
            }
          : false
      }
      connect
      onMediaDeviceFailure={handleMediaFailure}
    >
      <MeetingLayout
        header={<MeetingHeader title={title} />}
        sidebar={
          activePanel ? (
            <SidePanel
              activePanel={activePanel}
              onClose={() => setActivePanel(null)}
              captions={captions}
              interimCaption={interimCaption}
              captionError={captionError}
              speechRecognitionAvailable={speechRecognitionAvailable}
              providerOrder={sttProviderOrder}
            />
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
