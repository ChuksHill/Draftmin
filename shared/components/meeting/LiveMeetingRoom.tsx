"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/shared/lib/supabase/client";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useChat,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
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
  meetingId,
}: {
  activePanel: Exclude<MeetingPanel, null>;
  onClose: () => void;
  captions: string[];
  interimCaption: string;
  captionError: string | null;
  speechRecognitionAvailable: boolean;
  providerOrder: SttProvider[];
  meetingId: string | null;
}) {
  const { localParticipant } = useLocalParticipant();
  const identity = localParticipant?.identity ?? "Guest";
  const participants = useParticipants();
  const { chatMessages, send, isSending } = useChat();
  const [draft, setDraft] = useState("");

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check size limit: 50MB
    if (file.size > 52428800) {
      setUploadError("File exceeds the 50MB size limit.");
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
  };

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
            {chatMessages.map((msg) => {
              let text = msg.message;
              let attachment = null;
              try {
                if (msg.message.startsWith("{")) {
                  const parsed = JSON.parse(msg.message);
                  text = parsed.text;
                  attachment = parsed.attachment;
                }
              } catch {
                // Ignore parsing errors, render as plain text
              }

              const isImage = attachment && attachment.type?.startsWith("image/");

              return (
                <div key={`${msg.timestamp}-${msg.message}`} className="space-y-1 animate-in fade-in duration-200">
                  <div className="text-xs text-white/50 px-1">
                    {msg.from?.identity ?? "Unknown"}
                    {msg.from?.isLocal ? " (You)" : ""}
                  </div>
                  <div className="inline-block max-w-[92%] rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white space-y-1.5">
                    {text && <p className="leading-relaxed whitespace-pre-wrap break-words">{text}</p>}
                    
                    {attachment && (
                      <div className="mt-1.5 pt-1.5 border-t border-white/5">
                        {isImage ? (
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block max-w-sm rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition duration-300 bg-black/20"
                          >
                            <img
                              src={attachment.url}
                              alt={attachment.name}
                              className="w-full h-auto max-h-48 object-cover"
                            />
                            <div className="bg-black/40 px-3 py-1.5 text-xs text-white/70 truncate flex items-center justify-between gap-2">
                              <span className="truncate">{attachment.name}</span>
                              <span className="shrink-0 text-white/40">
                                {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : ""}
                              </span>
                            </div>
                          </a>
                        ) : (
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 max-w-sm rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition duration-300"
                          >
                            <span className="p-2 bg-blue-500/10 rounded-lg text-blue-400 shrink-0">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-5 w-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                              </svg>
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-white truncate">{attachment.name}</div>
                              <div className="text-[10px] text-white/40 mt-0.5 uppercase tracking-wide">
                                {attachment.type?.split("/")[1] || "document"} 
                                {attachment.size ? ` • ${(attachment.size / (1024 * 1024)).toFixed(1)} MB` : ""}
                              </div>
                            </div>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <form
            className="border-t border-white/10 p-3"
            onSubmit={async (event) => {
              event.preventDefault();
              const messageText = draft.trim();
              if (!messageText && !selectedFile) return;

              setIsUploading(true);
              setUploadError(null);
              let attachmentInfo = null;

              try {
                if (selectedFile) {
                  const fileExt = selectedFile.name.split('.').pop() || '';
                  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
                  const filePath = `${meetingId || 'general'}/${fileName}`;

                  const { error: uploadErr } = await supabase.storage
                    .from("chat_attachments")
                    .upload(filePath, selectedFile, {
                      cacheControl: '3600',
                      upsert: false
                    });

                  if (uploadErr) throw uploadErr;

                  const { data: { publicUrl } } = supabase.storage
                    .from("chat_attachments")
                    .getPublicUrl(filePath);

                  attachmentInfo = {
                    name: selectedFile.name,
                    url: publicUrl,
                    type: selectedFile.type,
                    size: selectedFile.size,
                  };
                }

                // Construct and send message
                const finalMessage = attachmentInfo 
                  ? JSON.stringify({ text: messageText || `Shared a file: ${attachmentInfo.name}`, attachment: attachmentInfo })
                  : messageText;

                await send(finalMessage);

                if (meetingId) {
                  void supabase.from("chat_history").insert({
                    meeting_id: meetingId,
                    sender_identity: identity,
                    message_text: finalMessage,
                  });
                }

                setDraft("");
                setSelectedFile(null);
              } catch (err) {
                console.error("Error sending chat attachment:", err);
                setUploadError("Failed to upload file or send message. Please try again.");
              } finally {
                setIsUploading(false);
              }
            }}
          >
            {/* Selected File Preview Bar */}
            {selectedFile && (
              <div className="mb-2 rounded-xl border border-white/10 bg-white/5 p-2 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="p-1 bg-blue-500/10 rounded-md text-blue-400 shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 0A3 3 0 109.878 14.14l3.536-3.536m0 0l3.536-3.536M9.878 14.14l-3.536 3.536m0 0a3 3 0 104.243 4.243l3.536-3.536" />
                    </svg>
                  </span>
                  <span className="text-xs text-slate-200 truncate font-medium">{selectedFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="text-white/40 hover:text-white transition p-1 hover:bg-white/5 rounded"
                  disabled={isUploading}
                >
                  <IconClose />
                </button>
              </div>
            )}

            {/* Error Message Display */}
            {uploadError && (
              <div className="mb-2 text-xs text-red-400 font-medium px-1 flex items-center gap-1.5 animate-in fade-in duration-200">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{uploadError}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label 
                className="h-10 w-10 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition grid place-items-center cursor-pointer shrink-0" 
                title="Attach document or photo"
              >
                {isUploading ? (
                  <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5 text-white/80">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 0A3 3 0 109.878 14.14l3.536-3.536m0 0l3.536-3.536M9.878 14.14l-3.536 3.536m0 0a3 3 0 104.243 4.243l3.536-3.536" />
                  </svg>
                )}
                <input
                  type="file"
                  onChange={handleFileSelected}
                  className="hidden"
                  accept="image/*,application/pdf"
                  disabled={isUploading}
                />
              </label>

              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={isUploading ? "Uploading file..." : "Type a message…"}
                disabled={isUploading}
                className="h-10 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/20 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isSending || isUploading || (!draft.trim() && !selectedFile)}
                className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50 hover:bg-blue-700 transition flex items-center justify-center min-w-[70px]"
              >
                {isUploading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Send"
                )}
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

function getFriendlyDeviceErrorMessage(errorMsg: string): { title: string; description: string; suggestion: string } {
  const msg = errorMsg.toLowerCase();
  
  if (msg.includes("permission") || msg.includes("allowed") || msg.includes("notallowederror")) {
    return {
      title: "Camera or Microphone Access Denied",
      description: "Your browser or operating system has blocked Draftmin from accessing your camera or microphone.",
      suggestion: "Please click the lock/settings icon next to the URL in your browser's address bar and set Camera/Microphone permissions to 'Allow'. Also ensure camera access is enabled in your OS privacy settings."
    };
  }
  
  if (msg.includes("readable") || msg.includes("trackstart") || msg.includes("in use") || msg.includes("concurrent")) {
    return {
      title: "Camera or Microphone in Use",
      description: "Another application (like Zoom, Microsoft Teams, OBS, or another browser tab) is currently using your camera or microphone.",
      suggestion: "Please close any other apps or tabs that might be using your media devices, then try starting your video or audio again."
    };
  }
  
  if (msg.includes("notfound") || msg.includes("devicesnotfound") || msg.includes("no device")) {
    return {
      title: "No Media Device Found",
      description: "We couldn't detect any connected camera or microphone on your system.",
      suggestion: "Make sure your webcam or microphone is properly plugged in, powered on, and recognized by your system settings."
    };
  }

  if (msg.includes("overconstrained") || msg.includes("constraint")) {
    return {
      title: "Hardware Constraint Error",
      description: "Your camera doesn't support the requested video quality or resolution settings.",
      suggestion: "We will automatically lower the resolution settings to match your device. Try toggling the video off and on again."
    };
  }

  return {
    title: "Media Device Error",
    description: errorMsg,
    suggestion: "Check your connections, ensure no other app is using the device, and verify browser permissions."
  };
}

type RoomTranscriptionControllerProps = {
  sttDisabled: boolean;
  sttLang: string;
  sttChunkMs: number;
  speechRecognitionAvailable: boolean;
  sttProviderOrder: SttProvider[];
  onCaptionsChange: (updater: (current: string[]) => string[]) => void;
  onInterimCaptionChange: (caption: string) => void;
  onCaptionErrorChange: (error: string | null) => void;
  meetingId: string | null;
};

function RoomTranscriptionController({
  sttDisabled,
  sttLang,
  sttChunkMs,
  speechRecognitionAvailable,
  sttProviderOrder,
  onCaptionsChange,
  onInterimCaptionChange,
  onCaptionErrorChange,
  meetingId,
}: RoomTranscriptionControllerProps) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const room = useRoomContext();
  const identity = localParticipant?.identity ?? "Guest";
  const recognitionRef = useRef<SimpleSpeechRecognition | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const transcriptionQueueRef = useRef<Promise<void>>(Promise.resolve());
  const activeProviderRef = useRef<SttProvider | null>(null);

  const broadcastCaption = useCallback((text: string) => {
    if (!localParticipant) return;
    try {
      const encoder = new TextEncoder();
      const payload = JSON.stringify({
        type: "caption",
        sender: localParticipant.identity,
        text: text,
      });
      const data = encoder.encode(payload);
      void localParticipant.publishData(data, {
        reliable: true,
        topic: "captions",
      });
    } catch (e) {
      console.warn("Failed to broadcast caption:", e);
    }
  }, [localParticipant]);

  const handleSpeechFinalized = useCallback((text: string) => {
    const speakerText = `${identity}: ${text}`;
    onCaptionsChange((current) => [...current, speakerText]);
    broadcastCaption(text);
    if (meetingId) {
      void supabase.from("transcripts").insert({
        meeting_id: meetingId,
        speaker_name: identity,
        transcript_text: text,
      });
    }
  }, [identity, onCaptionsChange, broadcastCaption, meetingId]);

  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload: Uint8Array) => {
      try {
        const decoder = new TextDecoder();
        const data = JSON.parse(decoder.decode(payload));
        if (data.type === "caption") {
          if (data.sender === localParticipant.identity) return;
          const speakerText = `${data.sender}: ${data.text}`;
          onCaptionsChange((current) => {
            if (current.includes(speakerText)) return current;
            return [...current, speakerText];
          });
        }
      } catch (e) {
        // ignore
      }
    };

    room.on("dataReceived", handleDataReceived);
    return () => {
      room.off("dataReceived", handleDataReceived);
    };
  }, [localParticipant, room, onCaptionsChange]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (sttDisabled || !isMicrophoneEnabled) {
      onInterimCaptionChange("");
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
          onInterimCaptionChange(nextInterim);
        }

        if (finalized.length > 0) {
          finalized.forEach((text) => {
            handleSpeechFinalized(text);
          });
          onInterimCaptionChange("");
        }
      };

      recognition.onerror = (event: { error?: string; message?: string }) => {
        const message = event.error ?? String(event.message ?? "Speech recognition error");
        onCaptionErrorChange(message);
        void switchProvider(`WebSpeech failed: ${message}`);
      };

      recognition.onend = () => {
        if (!recognitionRef.current) return;
        try {
          recognition.start();
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn("WebSpeech restart issue:", message);
          setTimeout(() => {
            if (!recognitionRef.current) return;
            try {
              recognition.start();
            } catch (retryError) {
              const retryMessage = retryError instanceof Error ? retryError.message : String(retryError);
              if (retryMessage.toLowerCase().includes("already")) return;
              onCaptionErrorChange(retryMessage);
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
            handleSpeechFinalized(text);
            onInterimCaptionChange("");
            failures.set(provider, 0);
          })
          .catch((error) => {
            const next = (failures.get(provider) ?? 0) + 1;
            failures.set(provider, next);
            const message = error instanceof Error ? error.message : String(error);
            onCaptionErrorChange(message);
            if (next >= 2) {
              void switchProvider(`${provider} failed: ${message}`);
            }
          });
      };

      recorder.start();

      const intervalId = setInterval(() => {
        if (cancelled) {
          clearInterval(intervalId);
          return;
        }
        try {
          if (recorder.state === "recording") {
            recorder.stop();
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
      onCaptionErrorChange(null);
      onInterimCaptionChange("");

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
          onCaptionErrorChange(context ? `${context} (${message})` : message);
        }
      }

      onCaptionErrorChange(
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

    const recoveryIntervalId = setInterval(() => {
      if (cancelled) return;
      if (currentIndex > 0) {
        console.log("Attempting STT recovery to primary provider...");
        void activateFromIndex(0, "Attempting STT primary provider recovery.");
      }
    }, 60000);

    return () => {
      cancelled = true;
      clearInterval(recoveryIntervalId);
      cleanupCurrent();
      stopWebSpeech();
      stopMediaRecorder();
    };
  }, [speechRecognitionAvailable, sttChunkMs, sttDisabled, sttLang, sttProviderOrder, isMicrophoneEnabled]);

  return null;
}

// Markdown Parser
function parseBold(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

function MarkdownRenderer({ text }: { text: string }) {
  const lines = text.split("\n");
  
  return (
    <div className="space-y-4 text-slate-200">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        
        // Headers
        if (trimmed.startsWith("### ")) {
          return <h3 key={idx} className="text-base font-bold text-white mt-6 mb-2">{trimmed.slice(4)}</h3>;
        }
        if (trimmed.startsWith("## ")) {
          return <h2 key={idx} className="text-lg font-bold text-white mt-8 mb-3 border-b border-white/10 pb-2">{trimmed.slice(3)}</h2>;
        }
        if (trimmed.startsWith("# ")) {
          return <h1 key={idx} className="text-xl font-bold text-white mt-10 mb-4">{trimmed.slice(2)}</h1>;
        }
        
        // Checklist: - [ ] or - [x]
        const checkboxMatch = trimmed.match(/^-\s+\[([ xX])\]\s+(.*)$/);
        if (checkboxMatch) {
          const checked = checkboxMatch[1].toLowerCase() === "x";
          const taskContent = checkboxMatch[2];
          return (
            <div key={idx} className="flex items-start gap-3 my-2 pl-2">
              <input
                type="checkbox"
                readOnly
                checked={checked}
                className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-850 text-blue-500 focus:ring-0 focus:ring-offset-0 pointer-events-none"
              />
              <span className={`text-sm ${checked ? "line-through text-slate-500" : "text-slate-200"}`}>
                {parseBold(taskContent)}
              </span>
            </div>
          );
        }
        
        // Bullet list
        if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          return (
            <li key={idx} className="text-sm text-slate-200 ml-4 list-disc my-1 pl-1">
              {parseBold(trimmed.slice(2))}
            </li>
          );
        }
        
        // Numbered list
        const numMatch = trimmed.match(/^\d+\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="text-sm text-slate-200 pl-2 my-1 flex gap-2">
              <span className="font-semibold text-blue-400 select-none shrink-0">{trimmed.split(".")[0]}.</span>
              <span>{parseBold(numMatch[1])}</span>
            </div>
          );
        }

        // Empty line
        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }

        // Standard paragraph
        return (
          <p key={idx} className="text-sm text-slate-300 leading-relaxed my-2 pl-1">
            {parseBold(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

interface MeetingSummaryDashboardProps {
  captions: string[];
  roomName: string;
  onClose: () => void;
  meetingId: string | null;
}

function MeetingSummaryDashboard({ captions, roomName, onClose, meetingId }: MeetingSummaryDashboardProps) {
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateSummary = async () => {
    if (captions.length === 0) {
      setError("No transcripts are available to summarize.");
      return;
    }
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript: captions }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Summary generation failed (${response.status})`);
      }

      const data = (await response.json()) as { minutes: string };
      setSummaryText(data.minutes);

      // Save summary & parse checklist actions to Supabase database
      if (meetingId) {
        void (async () => {
          try {
            const { data: existing } = await supabase
              .from("meeting_summaries")
              .select("id")
              .eq("meeting_id", meetingId)
              .maybeSingle();

            if (!existing) {
              const { data: summary, error: sumError } = await supabase
                .from("meeting_summaries")
                .insert({
                  meeting_id: meetingId,
                  markdown_content: data.minutes,
                  executive_summary: "AI Generated Meeting Minutes",
                  key_decisions: [],
                })
                .select("id")
                .maybeSingle();

              if (sumError) throw sumError;

              if (summary) {
                const lines = data.minutes.split("\n");
                const actionsToInsert: any[] = [];
                lines.forEach((line) => {
                  const trimmedLine = line.trim();
                  const checkboxMatch = trimmedLine.match(/^-\s+\[([ xX])\]\s+(.*)$/);
                  if (checkboxMatch) {
                    const checked = checkboxMatch[1].toLowerCase() === "x";
                    const taskContent = checkboxMatch[2];
                    actionsToInsert.push({
                      summary_id: summary.id,
                      task: taskContent,
                      assignee: "Unassigned",
                      priority: "Medium",
                      is_completed: checked,
                    });
                  }
                });

                if (actionsToInsert.length > 0) {
                  await supabase.from("action_items").insert(actionsToInsert);
                }
              }
            }
          } catch (err) {
            console.warn("Failed to persist summary to Supabase:", err);
          }
        })();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (captions.length > 0) {
      void generateSummary();
    }
  }, []);

  const downloadMarkdown = () => {
    if (!summaryText) return;
    const blob = new Blob([summaryText], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `minutes_${roomName.toLowerCase().replace(/[^a-z0-9]/g, "_")}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = () => {
    if (!summaryText) return;
    void navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="h-screen w-full bg-[#0B0F19] text-white overflow-hidden flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-white/10 px-8 py-5 flex items-center justify-between shrink-0 bg-white/[0.02] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg">
            D
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide">Meeting Concluded</h1>
            <p className="text-xs text-white/50">Room: {roomName}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-semibold text-white hover:bg-white/10 transition"
        >
          Exit Dashboard
        </button>
      </header>

      {/* Main Layout */}
      <main className="flex-1 min-h-0 flex p-8 gap-8">
        {/* Left Column: AI Minutes (scrollable) */}
        <section className="flex-1 flex flex-col min-w-0 rounded-[2rem] border border-white/10 bg-white/[0.02] backdrop-blur-xl shadow-2xl p-8">
          <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-blue-400">✨</span> AI Meeting Minutes
              </h2>
              <p className="text-xs text-white/50 mt-0.5">Generated in real-time by Draftmin AI</p>
            </div>
            {summaryText && (
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition flex items-center gap-1.5"
                >
                  {copied ? (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-green-400 shrink-0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className="text-green-400">Copied!</span>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      <span>Copy Minutes</span>
                    </>
                  )}
                </button>
                <button
                  onClick={downloadMarkdown}
                  className="h-9 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition flex items-center gap-1.5"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 shrink-0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  <span>Download .md</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto mt-6 pr-2 min-h-0">
            {isGenerating && (
              <div className="h-full w-full flex flex-col items-center justify-center gap-4 py-20">
                <span className="relative flex h-10 w-10 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-10 w-10 bg-blue-500 flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </span>
                </span>
                <div className="text-center space-y-1">
                  <h3 className="text-sm font-semibold text-white">Generating AI Summary...</h3>
                  <p className="text-xs text-white/50 max-w-sm">
                    Llama 3.3 is analyzing the speaker transcripts to compile your key decisions, arguments, and action items.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 text-center max-w-md mx-auto my-12">
                <h3 className="text-sm font-semibold text-rose-300">Analysis Failed</h3>
                <p className="text-xs text-rose-200/60 mt-2">{error}</p>
                <button
                  onClick={generateSummary}
                  className="mt-4 h-9 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white hover:bg-rose-700 transition"
                >
                  Retry Generation
                </button>
              </div>
            )}

            {captions.length === 0 && !isGenerating && !error && (
              <div className="h-full w-full flex flex-col items-center justify-center gap-3 py-20 text-center">
                <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                  ⚠️
                </div>
                <h3 className="text-sm font-semibold text-white">No transcript recorded</h3>
                <p className="text-xs text-white/50 max-w-xs">
                  No speech was transcribed during this meeting. Speak clearly into the microphone in your next meeting to generate minutes!
                </p>
              </div>
            )}

            {summaryText && !isGenerating && !error && (
              <div className="animate-in fade-in duration-500">
                <MarkdownRenderer text={summaryText} />
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Info & Live Transcript */}
        <aside className="w-80 flex flex-col gap-6 shrink-0 min-h-0">
          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl shadow-lg shrink-0">
            <h3 className="text-sm font-bold text-white">Meeting Info</h3>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-white/5">
                <span className="text-white/40">Participants</span>
                <span className="text-white/80 font-medium font-mono">
                  {Array.from(new Set(captions.map(c => {
                    const colonIdx = c.indexOf(":");
                    return colonIdx !== -1 ? c.substring(0, colonIdx).trim() : "Guest";
                  }))).length || 1}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pb-2 border-b border-white/5">
                <span className="text-white/40">Transcript blocks</span>
                <span className="text-white/80 font-medium font-mono">{captions.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-white/40">Date & Time</span>
                <span className="text-white/80 font-medium font-mono">
                  {new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 min-h-0 rounded-[1.5rem] border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl shadow-lg flex flex-col">
            <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5 shrink-0">
              Raw Transcript ({captions.length})
            </h3>
            <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-3 min-h-0 text-xs">
              {captions.map((caption, index) => {
                const colonIdx = caption.indexOf(":");
                const speaker = colonIdx !== -1 ? caption.substring(0, colonIdx).trim() : "Unknown";
                const text = colonIdx !== -1 ? caption.substring(colonIdx + 1).trim() : caption;
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="font-semibold text-blue-400 font-mono">{speaker}</div>
                    <div className="rounded-xl border border-white/5 bg-white/[0.01] p-3 text-white/80 leading-relaxed font-sans">
                      {text}
                    </div>
                  </div>
                );
              })}
              {captions.length === 0 && (
                <div className="text-center text-white/40 py-12">
                  No transcripts captured.
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function RoomDisconnectionListener({ onDisconnect }: { onDisconnect: () => void }) {
  const room = useRoomContext();
  useEffect(() => {
    if (!room) return;
    const handleDisconnected = () => {
      onDisconnect();
    };
    room.on("disconnected", handleDisconnected);
    return () => {
      room.off("disconnected", handleDisconnected);
    };
  }, [room, onDisconnect]);
  return null;
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
  const [showSummaryScreen, setShowSummaryScreen] = useState(false);
  const [meetingId, setMeetingId] = useState<string | null>(null);

  // Sync active meeting with Supabase
  useEffect(() => {
    async function syncMeeting() {
      try {
        let { data: meeting, error: fetchErr } = await supabase
          .from("meetings")
          .select("id")
          .eq("room_name", roomName)
          .maybeSingle();

        if (fetchErr) throw fetchErr;

        if (!meeting) {
          const { data: newMeeting, error: insertError } = await supabase
            .from("meetings")
            .insert({
              room_name: roomName,
              title: roomName + " Meeting",
              is_active: true,
            })
            .select("id")
            .single();

          if (insertError) throw insertError;
          meeting = newMeeting;
        }

        if (meeting) {
          setMeetingId(meeting.id);
        }
      } catch (err) {
        console.warn("Failed to sync meeting session with Supabase:", err);
      }
    }

    void syncMeeting();
  }, [roomName]);

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
        setError(null);
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
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
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

  if (showSummaryScreen) {
    return (
      <MeetingSummaryDashboard
        captions={captions}
        roomName={roomName}
        meetingId={meetingId}
        onClose={() => {
          window.location.href = "/meeting";
        }}
      />
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
              facingMode: "user",
            }
          : false
      }
      connect
      onMediaDeviceFailure={handleMediaFailure}
    >
      <RoomDisconnectionListener onDisconnect={() => setShowSummaryScreen(true)} />
      <RoomTranscriptionController
        sttDisabled={sttDisabled}
        sttLang={sttLang}
        sttChunkMs={sttChunkMs}
        speechRecognitionAvailable={speechRecognitionAvailable}
        sttProviderOrder={sttProviderOrder}
        onCaptionsChange={setCaptions}
        onInterimCaptionChange={setInterimCaption}
        onCaptionErrorChange={setCaptionError}
        meetingId={meetingId}
      />
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
              meetingId={meetingId}
            />
          ) : undefined
        }
        controls={
          <MeetingControls
            activePanel={activePanel}
            onTogglePanel={(panel) => setActivePanel((current) => (current === panel ? null : panel))}
            onDeviceError={(error) => setDeviceError(error ? error.message : null)}
          />
        }
      >
        <div className="h-full w-full flex flex-col min-h-0">
          {deviceError ? (() => {
            const friendly = getFriendlyDeviceErrorMessage(deviceError);
            return (
              <div className="px-5 pt-5 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="relative rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200 backdrop-blur-md flex gap-3 items-start justify-between shadow-[0_4px_20px_rgba(245,158,11,0.05)]">
                  <div className="flex gap-3">
                    <span className="mt-0.5 text-amber-400 shrink-0">
                      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                        <path
                          d="M12 9v4m0 4h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <div className="space-y-1">
                      <div className="font-semibold text-white">{friendly.title}</div>
                      <p className="text-amber-200/80 text-xs leading-relaxed">{friendly.description}</p>
                      <p className="text-amber-300/90 text-xs leading-relaxed font-medium mt-1">{friendly.suggestion}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeviceError(null)}
                    className="text-amber-400/60 hover:text-white transition p-1 hover:bg-white/5 rounded-lg shrink-0"
                    aria-label="Dismiss error"
                  >
                    <IconClose />
                  </button>
                </div>
              </div>
            );
          })() : null}
          <div className="flex-1 min-h-0">
            <MeetingStage />
          </div>
        </div>
      </MeetingLayout>
    </LiveKitRoom>
  );
}
