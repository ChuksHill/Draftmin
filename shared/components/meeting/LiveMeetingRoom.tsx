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

/* ─────────────────────────────────────────────────────────────────────────
   STT types & utilities (unchanged)
───────────────────────────────────────────────────────────────────────── */
type SttProvider = "deepgram" | "whisper" | "webspeech";
type SimpleSpeechRecognitionAlternative = { transcript?: string };
type SimpleSpeechRecognitionResult = { isFinal: boolean; [index: number]: SimpleSpeechRecognitionAlternative };
type SimpleSpeechRecognitionResultList = { length: number; [index: number]: SimpleSpeechRecognitionResult };
type SimpleSpeechRecognitionEvent = Event & { readonly resultIndex: number; readonly results: SimpleSpeechRecognitionResultList };
type SimpleSpeechRecognition = {
  continuous: boolean; interimResults: boolean; lang: string; maxAlternatives: number;
  onresult?: (event: SimpleSpeechRecognitionEvent) => void;
  onerror?: (event: { error?: string; message?: string }) => void;
  onend?: () => void; start: () => void; stop: () => void;
};
type SimpleSpeechRecognitionConstructor = new () => SimpleSpeechRecognition;
type TokenResponse = { url: string; token: string; room: string; identity: string };

function parseSttProviderOrder(value: string | undefined | null): SttProvider[] {
  const normalized = (value ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const order = normalized.filter((e): e is SttProvider => e === "deepgram" || e === "whisper" || e === "webspeech");
  return order.length > 0 ? order : ["webspeech"];
}
function parsePositiveInt(value: string | undefined | null, fallback: number) {
  const p = Number.parseInt((value ?? "").trim(), 10);
  return Number.isFinite(p) && p > 0 ? p : fallback;
}

const DEFAULT_STT_PROVIDER_ORDER = parseSttProviderOrder(process.env.NEXT_PUBLIC_STT_PROVIDER_ORDER);
const DEFAULT_STT_LANG = (process.env.NEXT_PUBLIC_STT_LANG ?? "en-US").trim() || "en-US";
const DEFAULT_STT_CHUNK_MS = parsePositiveInt(process.env.NEXT_PUBLIC_STT_CHUNK_MS, 4000);
const STT_DISABLED = Boolean((process.env.NEXT_PUBLIC_STT_DISABLED ?? "").trim());

export type LiveMeetingRoomProps = {
  roomName: string; identity: string; title?: string;
  startWithMic?: boolean; startWithCamera?: boolean;
};

/* ─────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────── */
function identityToDisplay(identity: string): string {
  // Strip trailing 6-char random suffix, then humanise dashes → spaces + title-case
  const base = identity.replace(/-[a-z0-9]{6}$/, "");
  return base
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Participant tile — modern redesign
───────────────────────────────────────────────────────────────────────── */
function ParticipantTile({ trackRef }: { trackRef: any }) {
  const participant = trackRef.participant;
  const isLocal = participant?.isLocal;
  const isSpeaking = participant?.isSpeaking;
  const isMicOn = participant?.isMicrophoneEnabled;
  const isCamOn = trackRef.publication?.isSubscribed && !trackRef.publication?.isMuted;
  const identity = participant?.identity ?? "unknown";
  const displayName = identityToDisplay(identity);
  const initials = getInitials(displayName);

  return (
    <div
      className={[
        "relative h-full w-full overflow-hidden rounded-2xl bg-[#111318] transition-all duration-300",
        isSpeaking
          ? "ring-2 ring-violet-500/70 shadow-[0_0_0_2px_rgba(139,92,246,0.2),0_0_30px_rgba(139,92,246,0.12)]"
          : "ring-1 ring-white/[0.06]",
      ].join(" ")}
    >
      {/* Video or avatar */}
      {isCamOn && trackRef.publication?.track ? (
        <VideoTrack
          trackRef={trackRef as any}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1c1f2e] to-[#0e0f15]">
          <div className="flex flex-col items-center gap-3">
            <div
              className={[
                "h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-semibold transition-all",
                isSpeaking
                  ? "bg-violet-600/25 text-violet-200 ring-1 ring-violet-500/40"
                  : "bg-white/[0.07] text-white/60 ring-1 ring-white/[0.08]",
              ].join(" ")}
            >
              {initials}
            </div>
            <span className="text-xs text-white/30">{displayName}</span>
          </div>
        </div>
      )}

      {/* Vignette gradient for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent pointer-events-none" />

      {/* Bottom info bar */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-white/90 truncate">
          {displayName}{isLocal ? " (You)" : ""}
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {/* Speaking bars */}
          {isSpeaking && (
            <div className="flex items-end gap-[2px] h-4">
              {[3, 5, 4, 6, 3].map((h, i) => (
                <div
                  key={i}
                  className="w-[2px] rounded-full bg-violet-400 animate-pulse"
                  style={{ height: `${h}px`, animationDelay: `${i * 80}ms` }}
                />
              ))}
            </div>
          )}
          {/* Mic indicator */}
          <div
            className={[
              "h-6 w-6 rounded-full flex items-center justify-center",
              isMicOn ? "bg-white/10" : "bg-red-500/20",
            ].join(" ")}
          >
            <svg viewBox="0 0 24 24" fill="none" className={`h-3 w-3 ${isMicOn ? "text-white/60" : "text-red-400"}`}>
              {isMicOn ? (
                <>
                  <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M19 10v1a7 7 0 01-14 0v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </>
              ) : (
                <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3zM19 10v1a7 7 0 01-14 0v-1M3 3l18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Meeting stage — grid + speaker modes + screen share
───────────────────────────────────────────────────────────────────────── */
function MeetingStage({ viewMode }: { viewMode: "grid" | "speaker" }) {
  const screenTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]);
  const cameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const participants = useParticipants();

  const isScreenSharing = screenTracks.length > 0;
  const count = cameraTracks.length;

  // Dynamic grid class based on participant count
  const gridCols =
    count === 1 ? "grid-cols-1" :
    count === 2 ? "grid-cols-2" :
    count <= 4  ? "grid-cols-2" :
    count <= 6  ? "grid-cols-3" :
                  "grid-cols-4";

  // For a single participant — center it nicely
  const singleStyle = count === 1 ? "max-w-2xl mx-auto" : "";

  /* ── Screen share layout ── */
  if (isScreenSharing) {
    return (
      <div className="h-full w-full flex flex-col lg:flex-row gap-2 p-3 pt-20">
        {/* Main screen */}
        <div className="flex-1 min-w-0 relative rounded-2xl overflow-hidden ring-1 ring-white/[0.08] bg-black">
          <VideoTrack trackRef={screenTracks[0] as any} className="h-full w-full object-contain" />
          <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur px-3 py-1.5 text-xs text-white">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            {identityToDisplay(screenTracks[0].participant.identity)}'s screen
          </div>
        </div>
        {/* Camera strip */}
        <div className="flex flex-row lg:flex-col gap-2 lg:w-56 overflow-x-auto lg:overflow-y-auto pb-2 lg:pb-0 shrink-0">
          {cameraTracks.map((t) => (
            <div key={t.participant.identity} className="shrink-0 w-48 lg:w-full h-28 lg:h-36">
              <ParticipantTile trackRef={t} />
            </div>
          ))}
        </div>
        <RoomAudioRenderer />
      </div>
    );
  }

  /* ── Speaker view ── */
  if (viewMode === "speaker" && count > 1) {
    // Find the active speaker (first speaking participant, or first in list)
    const speakerParticipant = participants.find((p) => p.isSpeaking) ?? participants[0];
    const speakerTrack = cameraTracks.find((t) => t.participant.identity === speakerParticipant?.identity) ?? cameraTracks[0];
    const otherTracks = cameraTracks.filter((t) => t !== speakerTrack);

    return (
      <div className="h-full w-full flex flex-col gap-2 p-3 pt-20 pb-28">
        {/* Main speaker */}
        <div className="flex-1 min-h-0 rounded-2xl overflow-hidden">
          <ParticipantTile trackRef={speakerTrack} />
        </div>
        {/* Thumbnails strip */}
        {otherTracks.length > 0 && (
          <div className="h-28 flex gap-2 overflow-x-auto shrink-0">
            {otherTracks.map((t) => (
              <div key={t.participant.identity} className="w-44 shrink-0 h-full">
                <ParticipantTile trackRef={t} />
              </div>
            ))}
          </div>
        )}
        <RoomAudioRenderer />
      </div>
    );
  }

  /* ── Grid view (default) ── */
  return (
    <div className={`h-full w-full p-3 pt-20 pb-28 grid ${gridCols} auto-rows-fr gap-2 overflow-hidden`}>
      <div className={`contents ${singleStyle}`}>
        {cameraTracks.map((t) => (
          <ParticipantTile key={t.participant.identity} trackRef={t} />
        ))}
      </div>
      <RoomAudioRenderer />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Side panel (chat / participants / captions)
───────────────────────────────────────────────────────────────────────── */
function SidePanel({
  activePanel, onClose, captions, interimCaption, captionError,
  speechRecognitionAvailable, providerOrder, meetingId,
}: {
  activePanel: Exclude<MeetingPanel, null>; onClose: () => void;
  captions: string[]; interimCaption: string; captionError: string | null;
  speechRecognitionAvailable: boolean; providerOrder: SttProvider[]; meetingId: string | null;
}) {
  const { localParticipant } = useLocalParticipant();
  const identity = localParticipant?.identity ?? "Guest";
  const displayName = identityToDisplay(identity);
  const participants = useParticipants();
  const { chatMessages, send, isSending } = useChat();
  const [draft, setDraft] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const panelTitle =
    activePanel === "participants" ? `People (${participants.length})`
    : activePanel === "chat" ? "Chat"
    : "Live Captions";

  return (
    <div className="h-full flex flex-col bg-[#0d0f14]">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06] shrink-0">
        <span className="text-sm font-semibold text-white">{panelTitle}</span>
        <button
          type="button"
          onClick={onClose}
          className="h-8 w-8 rounded-xl border border-white/[0.08] bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition grid place-items-center"
        >
          <IconClose />
        </button>
      </div>

      {/* Participants */}
      {activePanel === "participants" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {participants.map((p) => (
            <div key={p.identity} className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.03] px-3 py-2.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600/40 to-violet-600/40 grid place-items-center text-xs font-semibold text-white/80 shrink-0">
                {getInitials(identityToDisplay(p.identity))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white truncate">
                  {identityToDisplay(p.identity)}
                  {p.isLocal && <span className="text-white/30 ml-1">(You)</span>}
                </div>
                <div className="text-xs text-white/30 mt-0.5">{p.isSpeaking ? "Speaking…" : "In meeting"}</div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className={`h-2 w-2 rounded-full ${p.isMicrophoneEnabled ? "bg-emerald-400" : "bg-red-500"}`} />
                <div className={`h-2 w-2 rounded-full ${p.isCameraEnabled ? "bg-emerald-400" : "bg-white/20"}`} />
              </div>
            </div>
          ))}
          {participants.length === 0 && (
            <p className="text-sm text-white/30 text-center py-8">No participants yet.</p>
          )}
        </div>
      )}

      {/* Chat */}
      {activePanel === "chat" && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {chatMessages.length === 0 && (
              <p className="text-sm text-white/25 text-center py-8">No messages yet. Say hello!</p>
            )}
            {chatMessages.map((msg) => {
              let text = msg.message;
              let attachment: any = null;
              try {
                if (msg.message.startsWith("{")) {
                  const parsed = JSON.parse(msg.message);
                  text = parsed.text;
                  attachment = parsed.attachment;
                }
              } catch { /* ignore */ }
              const isImage = attachment?.type?.startsWith("image/");
              const isOwn = msg.from?.isLocal;
              return (
                <div key={`${msg.timestamp}-${msg.message}`} className={`flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}>
                  <span className="text-[10px] text-white/30 px-1">
                    {msg.from?.isLocal ? "You" : identityToDisplay(msg.from?.identity ?? "Unknown")}
                  </span>
                  <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm text-white ${isOwn ? "bg-blue-600/80 rounded-br-sm" : "bg-white/[0.08] rounded-bl-sm"}`}>
                    {text && <p className="leading-relaxed whitespace-pre-wrap break-words">{text}</p>}
                    {attachment && (
                      <div className="mt-1.5">
                        {isImage ? (
                          <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-white/10">
                            <img src={attachment.url} alt={attachment.name} className="w-full h-auto max-h-40 object-cover" />
                          </a>
                        ) : (
                          <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 rounded-xl bg-white/10 hover:bg-white/15 transition">
                            <div className="h-8 w-8 rounded-lg bg-blue-500/20 grid place-items-center shrink-0">
                              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-blue-400" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs text-white truncate">{attachment.name}</div>
                              <div className="text-[10px] text-white/40">{attachment.size ? `${(attachment.size / 1024).toFixed(0)} KB` : ""}</div>
                            </div>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat input */}
          <div className="border-t border-white/[0.06] p-3 space-y-2 shrink-0">
            {selectedFile && (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2">
                <span className="text-xs text-white/60 truncate">{selectedFile.name}</span>
                <button type="button" onClick={() => setSelectedFile(null)} className="text-white/30 hover:text-white transition shrink-0">
                  <IconClose />
                </button>
              </div>
            )}
            {uploadError && <p className="text-xs text-red-400 px-1">{uploadError}</p>}
            <div className="flex gap-2">
              <label className="h-10 w-10 rounded-xl border border-white/[0.08] bg-white/[0.04] grid place-items-center cursor-pointer hover:bg-white/[0.08] transition shrink-0">
                {isUploading ? (
                  <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white/40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                  </svg>
                )}
                <input type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) { if (f.size > 52428800) { setUploadError("File exceeds 50MB."); return; } setUploadError(null); setSelectedFile(f); } }} className="hidden" accept="image/*,application/pdf" disabled={isUploading} />
              </label>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key !== "Enter" || e.shiftKey) return;
                  e.preventDefault();
                  const msg = draft.trim();
                  if (!msg && !selectedFile) return;
                  setIsUploading(true); setUploadError(null);
                  let attachmentInfo = null;
                  try {
                    if (selectedFile) {
                      const ext = selectedFile.name.split(".").pop() || "";
                      const path = `${meetingId || "general"}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
                      const { error: upErr } = await supabase.storage.from("chat_attachments").upload(path, selectedFile, { cacheControl: "3600", upsert: false });
                      if (upErr) throw upErr;
                      const { data: { publicUrl } } = supabase.storage.from("chat_attachments").getPublicUrl(path);
                      attachmentInfo = { name: selectedFile.name, url: publicUrl, type: selectedFile.type, size: selectedFile.size };
                    }
                    const finalMsg = attachmentInfo ? JSON.stringify({ text: msg || `Shared: ${attachmentInfo.name}`, attachment: attachmentInfo }) : msg;
                    await send(finalMsg);
                    if (meetingId) void supabase.from("chat_history").insert({ meeting_id: meetingId, sender_identity: identity, message_text: finalMsg });
                    setDraft(""); setSelectedFile(null);
                  } catch { setUploadError("Failed to send. Try again."); }
                  finally { setIsUploading(false); }
                }}
                placeholder={isUploading ? "Uploading…" : "Message (Enter to send)"}
                disabled={isUploading}
                className="h-10 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-blue-500/40 focus:ring-1 focus:ring-blue-500/20 transition"
              />
              <button
                type="button"
                disabled={isSending || isUploading || (!draft.trim() && !selectedFile)}
                onClick={async () => {
                  const msg = draft.trim();
                  if (!msg && !selectedFile) return;
                  try { await send(msg); setDraft(""); } catch { /* ignore */ }
                }}
                className="h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 transition grid place-items-center shrink-0"
              >
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Captions */}
      {activePanel === "captions" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4 text-xs text-white/40 leading-relaxed">
            Live captions use hybrid speech-to-text. Allow microphone access and speak clearly for best results.
          </div>
          {!speechRecognitionAvailable && providerOrder.includes("webspeech") && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
              Browser speech recognition unavailable in this browser.
            </div>
          )}
          {captionError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
              <div className="font-semibold">Error</div>
              <p className="mt-1 text-red-200/70">{captionError}</p>
            </div>
          )}
          {interimCaption && (
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3 text-xs text-violet-200 italic">
              {interimCaption}
            </div>
          )}
          {captions.map((c, i) => {
            const colonIdx = c.indexOf(":");
            const speaker = colonIdx !== -1 ? c.substring(0, colonIdx).trim() : "";
            const text = colonIdx !== -1 ? c.substring(colonIdx + 1).trim() : c;
            return (
              <div key={i} className="space-y-1">
                {speaker && <div className="text-[10px] text-blue-400 font-medium px-1">{speaker}</div>}
                <div className="rounded-xl border border-white/[0.05] bg-white/[0.03] p-3 text-sm text-white/80 leading-relaxed">{text}</div>
              </div>
            );
          })}
          {captions.length === 0 && !interimCaption && (
            <p className="text-sm text-white/25 text-center py-8">Speak into your microphone to start transcription.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Transcription controller (logic unchanged, kept intact)
───────────────────────────────────────────────────────────────────────── */
type RoomTranscriptionControllerProps = {
  sttDisabled: boolean; sttLang: string; sttChunkMs: number;
  speechRecognitionAvailable: boolean; sttProviderOrder: SttProvider[];
  onCaptionsChange: (updater: (current: string[]) => string[]) => void;
  onInterimCaptionChange: (caption: string) => void;
  onCaptionErrorChange: (error: string | null) => void;
  meetingId: string | null;
};

function RoomTranscriptionController({
  sttDisabled, sttLang, sttChunkMs, speechRecognitionAvailable,
  sttProviderOrder, onCaptionsChange, onInterimCaptionChange, onCaptionErrorChange, meetingId,
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
      const payload = JSON.stringify({ type: "caption", sender: localParticipant.identity, text });
      void localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true, topic: "captions" });
    } catch { /* ignore */ }
  }, [localParticipant]);

  const handleSpeechFinalized = useCallback((text: string) => {
    const speakerDisplay = identityToDisplay(identity);
    const speakerText = `${speakerDisplay}: ${text}`;
    onCaptionsChange((c) => [...c, speakerText]);
    broadcastCaption(text);
    if (meetingId) {
      void supabase.from("transcripts").insert({ meeting_id: meetingId, speaker_name: speakerDisplay, transcript_text: text });
    }
  }, [identity, onCaptionsChange, broadcastCaption, meetingId]);

  useEffect(() => {
    if (!room) return;
    const handleData = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === "caption" && data.sender !== localParticipant.identity) {
          const display = identityToDisplay(data.sender);
          const speakerText = `${display}: ${data.text}`;
          onCaptionsChange((c) => c.includes(speakerText) ? c : [...c, speakerText]);
        }
      } catch { /* ignore */ }
    };
    room.on("dataReceived", handleData);
    return () => { room.off("dataReceived", handleData); };
  }, [localParticipant, room, onCaptionsChange]);

  useEffect(() => {
    if (typeof window === "undefined" || sttDisabled || !isMicrophoneEnabled) {
      onInterimCaptionChange(""); return;
    }
    let cancelled = false;
    let currentStop: (() => void) | null = null;
    let currentIndex = 0;
    const failures = new Map<SttProvider, number>();

    const stopWS = () => {
      const r = recognitionRef.current; recognitionRef.current = null;
      if (!r) return;
      try { r.onresult = undefined; r.onend = undefined; r.onerror = undefined; r.stop?.(); } catch { /* ignore */ }
    };
    const stopMR = () => {
      const rec = recorderRef.current; recorderRef.current = null;
      try { if (rec && rec.state !== "inactive") rec.stop(); } catch { /* ignore */ }
      const s = mediaStreamRef.current; mediaStreamRef.current = null;
      try { s?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    };
    const cleanupCurrent = () => { currentStop?.(); currentStop = null; activeProviderRef.current = null; };

    const startWS = (): (() => void) => {
      const win = window as any;
      const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition;
      if (!SR) throw new Error("Browser speech recognition unavailable.");
      const r = new SR() as SimpleSpeechRecognition;
      r.continuous = true; r.interimResults = true; r.lang = sttLang; r.maxAlternatives = 1;
      r.onresult = (e: SimpleSpeechRecognitionEvent) => {
        let interim = "";
        const final: string[] = [];
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0]?.transcript?.trim();
          if (!t) continue;
          if (e.results[i].isFinal) final.push(t); else interim = t;
        }
        if (interim) onInterimCaptionChange(interim);
        if (final.length) { final.forEach(handleSpeechFinalized); onInterimCaptionChange(""); }
      };
      r.onerror = (e: any) => { const m = e.error ?? String(e.message ?? "STT error"); onCaptionErrorChange(m); };
      r.onend = () => { if (!recognitionRef.current) return; try { r.start(); } catch { /* ignore */ } };
      r.start(); recognitionRef.current = r;
      return () => stopWS();
    };

    const transcribeChunk = async (provider: Exclude<SttProvider, "webspeech">, blob: Blob) => {
      const res = await fetch("/api/stt", { method: "POST", headers: { "x-stt-provider": provider, "x-stt-lang": sttLang }, body: blob });
      if (!res.ok) throw new Error(await res.text().catch(() => `STT ${res.status}`));
      const d = await res.json() as { text?: string; error?: string };
      if (d.error) throw new Error(d.error);
      return (d.text ?? "").trim();
    };

    const startServerStt = async (provider: Exclude<SttProvider, "webspeech">): Promise<() => void> => {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("getUserMedia not supported.");
      if (typeof MediaRecorder === "undefined") throw new Error("MediaRecorder not supported.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (cancelled) { stream.getTracks().forEach((t) => t.stop()); throw new Error("Cancelled"); }
      mediaStreamRef.current = stream;
      const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"].find((t) => MediaRecorder.isTypeSupported(t));
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (!e.data?.size) return;
        transcriptionQueueRef.current = transcriptionQueueRef.current.then(async () => {
          if (cancelled || activeProviderRef.current !== provider) return;
          const text = await transcribeChunk(provider, e.data);
          if (text) { handleSpeechFinalized(text); onInterimCaptionChange(""); failures.set(provider, 0); }
        }).catch((err) => {
          const n = (failures.get(provider) ?? 0) + 1; failures.set(provider, n);
          onCaptionErrorChange(err instanceof Error ? err.message : String(err));
          if (n >= 2) void switchProvider(`${provider} failed`);
        });
      };
      recorder.start();
      const id = setInterval(() => {
        if (cancelled) { clearInterval(id); return; }
        try { if (recorder.state === "recording") { recorder.stop(); recorder.start(); } } catch { /* ignore */ }
      }, sttChunkMs);
      return () => { clearInterval(id); stopMR(); };
    };

    const startProvider = async (p: SttProvider): Promise<() => void> => {
      onCaptionErrorChange(null); onInterimCaptionChange("");
      if (p === "webspeech") { stopMR(); return startWS(); }
      stopWS(); return await startServerStt(p);
    };

    const supports = (p: SttProvider) =>
      p === "webspeech" ? speechRecognitionAvailable : Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined";

    async function activate(index: number, ctx?: string) {
      cleanupCurrent();
      for (let i = index; i < sttProviderOrder.length; i++) {
        const p = sttProviderOrder[i];
        if (!supports(p)) continue;
        try {
          const stop = await startProvider(p);
          if (cancelled) { stop(); return; }
          currentStop = stop; currentIndex = i; activeProviderRef.current = p; return;
        } catch (e) {
          onCaptionErrorChange(ctx ?? (e instanceof Error ? e.message : String(e)));
        }
      }
      onCaptionErrorChange("No STT provider available. Enable mic permissions or try Chrome/Edge.");
    }

    async function switchProvider(reason?: string) {
      await activate(Math.min(currentIndex + 1, sttProviderOrder.length), reason);
    }

    void activate(0);
    const recoveryId = setInterval(() => { if (!cancelled && currentIndex > 0) void activate(0); }, 60000);
    return () => { cancelled = true; clearInterval(recoveryId); cleanupCurrent(); stopWS(); stopMR(); };
  }, [speechRecognitionAvailable, sttChunkMs, sttDisabled, sttLang, sttProviderOrder, isMicrophoneEnabled]);

  return null;
}

/* ─────────────────────────────────────────────────────────────────────────
   Markdown renderer (unchanged)
───────────────────────────────────────────────────────────────────────── */
function parseBold(text: string) {
  return text.split(/(\*\*.*?\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
      : part
  );
}

function MarkdownRenderer({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-slate-200">
      {text.split("\n").map((line, idx) => {
        const t = line.trim();
        if (t.startsWith("### ")) return <h3 key={idx} className="text-sm font-bold text-white mt-5 mb-1">{t.slice(4)}</h3>;
        if (t.startsWith("## ")) return <h2 key={idx} className="text-base font-bold text-white mt-6 mb-2 border-b border-white/10 pb-1.5">{t.slice(3)}</h2>;
        if (t.startsWith("# ")) return <h1 key={idx} className="text-lg font-bold text-white mt-8 mb-3">{t.slice(2)}</h1>;
        const cbm = t.match(/^-\s+\[([ xX])\]\s+(.*)$/);
        if (cbm) {
          const checked = cbm[1].toLowerCase() === "x";
          return (
            <div key={idx} className="flex items-start gap-2.5 my-1.5 pl-1">
              <input type="checkbox" readOnly checked={checked} className="mt-0.5 h-3.5 w-3.5 rounded border-slate-600 pointer-events-none" />
              <span className={`text-sm ${checked ? "line-through text-slate-500" : "text-slate-200"}`}>{parseBold(cbm[2])}</span>
            </div>
          );
        }
        if (t.startsWith("- ") || t.startsWith("* ")) return <li key={idx} className="text-sm text-slate-200 ml-4 list-disc my-0.5">{parseBold(t.slice(2))}</li>;
        const nm = t.match(/^(\d+)\.\s+(.*)/);
        if (nm) return <div key={idx} className="text-sm text-slate-200 pl-1 my-0.5 flex gap-2"><span className="text-blue-400 font-semibold shrink-0">{nm[1]}.</span><span>{parseBold(nm[2])}</span></div>;
        if (!t) return <div key={idx} className="h-1.5" />;
        return <p key={idx} className="text-sm text-slate-300 leading-relaxed">{parseBold(t)}</p>;
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Meeting summary dashboard (unchanged logic, minor style update)
───────────────────────────────────────────────────────────────────────── */
function MeetingSummaryDashboard({ captions, roomName, onClose, meetingId }: {
  captions: string[]; roomName: string; onClose: () => void; meetingId: string | null;
}) {
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateSummary = async () => {
    if (!captions.length) { setError("No transcripts available."); return; }
    setIsGenerating(true); setError(null);
    try {
      const res = await fetch("/api/summary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transcript: captions }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `${res.status}`); }
      const d = await res.json() as { minutes: string };
      setSummaryText(d.minutes);
      if (meetingId) {
        void (async () => {
          try {
            const { data: ex } = await supabase.from("meeting_summaries").select("id").eq("meeting_id", meetingId).maybeSingle();
            if (!ex) {
              const { data: s, error: se } = await supabase.from("meeting_summaries").insert({ meeting_id: meetingId, markdown_content: d.minutes, executive_summary: "AI Generated", key_decisions: [] }).select("id").maybeSingle();
              if (se) throw se;
              if (s) {
                const actions = d.minutes.split("\n").reduce<any[]>((acc, line) => {
                  const m = line.trim().match(/^-\s+\[([ xX])\]\s+(.*)/);
                  if (m) acc.push({ summary_id: s.id, task: m[2], assignee: "Unassigned", priority: "Medium", is_completed: m[1].toLowerCase() === "x" });
                  return acc;
                }, []);
                if (actions.length) await supabase.from("action_items").insert(actions);
              }
            }
          } catch { /* ignore */ }
        })();
      }
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setIsGenerating(false); }
  };

  useEffect(() => { if (captions.length) void generateSummary(); }, []);

  return (
    <div className="h-screen w-full bg-[#09090e] text-white flex flex-col">
      <header className="border-b border-white/[0.06] px-8 py-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 grid place-items-center font-bold text-white">D</div>
          <div>
            <h1 className="text-sm font-bold text-white">Meeting ended</h1>
            <p className="text-xs text-white/40 mt-0.5">Room: {roomName}</p>
          </div>
        </div>
        <button onClick={onClose} className="h-9 rounded-xl border border-white/[0.08] bg-white/5 px-4 text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition">
          Back to home
        </button>
      </header>
      <main className="flex-1 min-h-0 flex p-6 gap-6">
        <section className="flex-1 flex flex-col min-w-0 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] shrink-0">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2"><span className="text-blue-400">✦</span> AI Meeting Minutes</h2>
              <p className="text-xs text-white/30 mt-0.5">Generated by Draftmin AI</p>
            </div>
            {summaryText && (
              <div className="flex gap-2">
                <button onClick={() => { navigator.clipboard.writeText(summaryText); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="h-8 rounded-xl border border-white/[0.08] bg-white/5 px-3 text-xs text-white/60 hover:text-white hover:bg-white/10 transition">
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button onClick={() => { const b = new Blob([summaryText], { type: "text/markdown" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `minutes_${roomName}.md`; a.click(); }}
                  className="h-8 rounded-xl border border-white/[0.08] bg-white/5 px-3 text-xs text-white/60 hover:text-white hover:bg-white/10 transition">
                  Download .md
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto mt-4 pr-1 min-h-0">
            {isGenerating && (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <div className="relative flex h-10 w-10">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-40" />
                  <span className="relative inline-flex rounded-full h-10 w-10 bg-blue-600 items-center justify-center">
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  </span>
                </div>
                <p className="text-sm text-white/40">Generating summary…</p>
              </div>
            )}
            {error && (
              <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center">
                <p className="text-sm text-red-300">{error}</p>
                <button onClick={generateSummary} className="mt-3 h-8 rounded-xl bg-red-600 px-4 text-xs font-medium text-white hover:bg-red-500 transition">Retry</button>
              </div>
            )}
            {summaryText && !isGenerating && <MarkdownRenderer text={summaryText} />}
            {!captions.length && !isGenerating && !error && (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm font-medium text-white/40">No transcript recorded</p>
                <p className="text-xs text-white/25">Enable captions during your next meeting to generate AI minutes.</p>
              </div>
            )}
          </div>
        </section>
        <aside className="w-72 flex flex-col gap-4 shrink-0">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Meeting info</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between"><span className="text-white/40">Transcript blocks</span><span className="text-white/70 font-mono">{captions.length}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Date</span><span className="text-white/70">{new Date().toLocaleDateString()}</span></div>
            </div>
          </div>
          <div className="flex-1 min-h-0 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col">
            <h3 className="text-sm font-semibold text-white mb-3 shrink-0">Raw transcript</h3>
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2 text-xs">
              {captions.map((c, i) => {
                const col = c.indexOf(":");
                const spk = col !== -1 ? c.substring(0, col).trim() : "?";
                const txt = col !== -1 ? c.substring(col + 1).trim() : c;
                return (
                  <div key={i}><div className="text-blue-400 font-medium">{spk}</div><div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-2 text-white/60 mt-0.5">{txt}</div></div>
                );
              })}
              {!captions.length && <p className="text-white/25 text-center py-4">Nothing transcribed.</p>}
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
    room.on("disconnected", onDisconnect);
    return () => { room.off("disconnected", onDisconnect); };
  }, [room, onDisconnect]);
  return null;
}

/* ─────────────────────────────────────────────────────────────────────────
   Device error message helper
───────────────────────────────────────────────────────────────────────── */
function getFriendlyError(msg: string): { title: string; body: string } {
  const m = msg.toLowerCase();
  if (m.includes("permission") || m.includes("notallowed"))
    return { title: "Camera or Microphone Blocked", body: "Click the lock icon in your browser's address bar and allow camera/microphone access." };
  if (m.includes("in use") || m.includes("readable") || m.includes("concurrent"))
    return { title: "Device In Use", body: "Another app (Zoom, Teams, etc.) is using your camera or mic. Close it and try again." };
  if (m.includes("notfound") || m.includes("no device"))
    return { title: "No Device Found", body: "No camera or microphone detected. Plug one in and refresh." };
  return { title: "Device Error", body: msg };
}

/* ─────────────────────────────────────────────────────────────────────────
   Main LiveMeetingRoom
───────────────────────────────────────────────────────────────────────── */
export function LiveMeetingRoom({
  roomName, identity, title = "Meeting",
  startWithMic = true, startWithCamera = false,
}: LiveMeetingRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<MeetingPanel>(null);
  const [captions, setCaptions] = useState<string[]>([]);
  const [interimCaption, setInterimCaption] = useState("");
  const [captionError, setCaptionError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "speaker">("grid");

  /* ── Fullscreen ─────────────────────────────────────────────────────── */
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  /* ── Auto-hide controls ─────────────────────────────────────────────── */
  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 4000);
  }, []);

  useEffect(() => {
    revealControls();
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); };
  }, []);

  /* ── Supabase meeting sync ──────────────────────────────────────────── */
  useEffect(() => {
    async function syncMeeting() {
      try {
        let { data: meeting, error: fe } = await supabase.from("meetings").select("id").eq("room_name", roomName).maybeSingle();
        if (fe) throw fe;
        if (!meeting) {
          const { data: nm, error: ie } = await supabase.from("meetings").insert({ room_name: roomName, title: `${roomName} Meeting`, is_active: true }).select("id").single();
          if (ie) throw ie;
          meeting = nm;
        }
        if (meeting) setMeetingId(meeting.id);
      } catch { /* ignore */ }
    }
    void syncMeeting();
  }, [roomName]);

  /* ── Token fetch ────────────────────────────────────────────────────── */
  useEffect(() => {
    const controller = new AbortController();
    async function loadToken() {
      try {
        setError(null);
        const res = await fetch(
          `/api/livekit/token?room=${encodeURIComponent(roomName)}&identity=${encodeURIComponent(identity)}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(await res.text() || "Could not get LiveKit token");
        setTokenData(await res.json() as TokenResponse);
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : String(e));
      }
    }
    void loadToken();
    return () => controller.abort();
  }, [identity, roomName]);

  const speechRecognitionAvailable =
    typeof window !== "undefined" &&
    Boolean((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition);

  /* ── Loading ─────────────────────────────────────────────────────────── */
  if (!tokenData && !error) {
    return (
      <div className="h-screen w-full bg-[#09090e] text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative flex h-12 w-12 mx-auto">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-30" />
            <span className="relative inline-flex h-12 w-12 rounded-full bg-blue-600 items-center justify-center">
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </span>
          </div>
          <p className="text-sm text-white/40">Connecting to room…</p>
        </div>
      </div>
    );
  }

  /* ── Summary screen ─────────────────────────────────────────────────── */
  if (showSummary) {
    return <MeetingSummaryDashboard captions={captions} roomName={roomName} meetingId={meetingId} onClose={() => { window.location.href = "/meeting"; }} />;
  }

  /* ── Error ─────────────────────────────────────────────────────────── */
  if (error || !tokenData) {
    return (
      <div className="h-screen w-full bg-[#09090e] text-white flex items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-base font-semibold text-white">Unable to join</p>
          <p className="mt-2 text-sm text-white/40">{error ?? "No session returned from LiveKit."}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-screen w-full" onMouseMove={revealControls} onTouchStart={revealControls}>
      <LiveKitRoom
        serverUrl={tokenData.url}
        token={tokenData.token}
        audio={startWithMic ? { autoGainControl: true, echoCancellation: true, noiseSuppression: true } : false}
        video={startWithCamera ? { facingMode: "user" } : false}
        connect
        onMediaDeviceFailure={(failure, kind) => {
          const label = kind === "videoinput" ? "camera" : kind === "audioinput" ? "microphone" : "media device";
          setDeviceError(`Could not access your ${label}. ${(failure as any)?.message ?? ""}`);
        }}
      >
        <RoomDisconnectionListener onDisconnect={() => setShowSummary(true)} />
        <RoomTranscriptionController
          sttDisabled={STT_DISABLED} sttLang={DEFAULT_STT_LANG} sttChunkMs={DEFAULT_STT_CHUNK_MS}
          speechRecognitionAvailable={speechRecognitionAvailable} sttProviderOrder={DEFAULT_STT_PROVIDER_ORDER}
          onCaptionsChange={setCaptions} onInterimCaptionChange={setInterimCaption}
          onCaptionErrorChange={setCaptionError} meetingId={meetingId}
        />

        <MeetingLayout
          controlsVisible={controlsVisible}
          onCloseSidebar={() => setActivePanel(null)}
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
                providerOrder={DEFAULT_STT_PROVIDER_ORDER}
                meetingId={meetingId}
              />
            ) : undefined
          }
          controls={
            <MeetingControls
              activePanel={activePanel}
              onTogglePanel={(p) => setActivePanel((c) => (c === p ? null : p))}
              onDeviceError={(e) => setDeviceError(e ? e.message : null)}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
              viewMode={viewMode}
              onToggleView={() => setViewMode((v) => (v === "grid" ? "speaker" : "grid"))}
            />
          }
        >
          {/* Device error toast */}
          {deviceError && (() => {
            const { title: errTitle, body: errBody } = getFriendlyError(deviceError);
            return (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-md px-4 animate-in fade-in slide-in-from-top-3 duration-300">
                <div className="rounded-2xl border border-amber-500/20 bg-[#1a1407]/90 backdrop-blur-xl p-4 flex gap-3 items-start shadow-2xl">
                  <div className="h-5 w-5 text-amber-400 mt-0.5 shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-200">{errTitle}</p>
                    <p className="mt-0.5 text-xs text-amber-200/60 leading-relaxed">{errBody}</p>
                  </div>
                  <button type="button" onClick={() => setDeviceError(null)} className="text-white/30 hover:text-white transition shrink-0 mt-0.5"><IconClose /></button>
                </div>
              </div>
            );
          })()}

          <MeetingStage viewMode={viewMode} />
        </MeetingLayout>
      </LiveKitRoom>
    </div>
  );
}