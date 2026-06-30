"use client";

import React from "react";
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
import { RoomEvent, Track } from "livekit-client";
import { motion, AnimatePresence } from "framer-motion";
import { MeetingLayout } from "@/shared/components/layout/meeting-layout/MeetingLayout";
import { MeetingHeader } from "@/shared/components/layout/meeting-layout/MeetingHeader";
import { MeetingControls, MeetingPanel } from "@/shared/components/layout/meeting-layout/MeetingControls";

/* ─── Types ─────────────────────────────────────────────────────────────── */
type SttProvider = "deepgram" | "whisper" | "webspeech";
type TokenResponse = { url: string; token: string; room: string; identity: string; isHost: boolean };

type ToastItem = {
  id: string;
  type: "join" | "leave" | "chat" | "error" | "info";
  title: string;
  body?: string;
};

type DMMessage = { from: string; text: string; timestamp: number };
type AgendaItem = {
  id: string;
  title: string;
  position: number;
  is_completed: boolean;
  decision_summary: string | null;
  decided_by?: string[] | null;
};
type PersistedChatMessage = {
  id: number;
  created_at: string;
  sender_identity: string;
  message_text: string;
};

/* ─── STT env ────────────────────────────────────────────────────────────── */
function parseSttOrder(v?: string | null): SttProvider[] {
  const o = (v ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)
    .filter((e): e is SttProvider => e === "deepgram" || e === "whisper" || e === "webspeech");
  return o.length ? o : ["webspeech"];
}
function parsePosInt(v?: string | null, fb = 4000) {
  const p = Number.parseInt((v ?? "").trim(), 10);
  return Number.isFinite(p) && p > 0 ? p : fb;
}
const DEFAULT_STT_ORDER = parseSttOrder(process.env.NEXT_PUBLIC_STT_PROVIDER_ORDER);
const DEFAULT_STT_LANG = (process.env.NEXT_PUBLIC_STT_LANG ?? "en-US").trim() || "en-US";
const DEFAULT_STT_CHUNK_MS = parsePosInt(process.env.NEXT_PUBLIC_STT_CHUNK_MS, 10000);
const STT_DISABLED = Boolean((process.env.NEXT_PUBLIC_STT_DISABLED ?? "").trim());

export type LiveMeetingRoomProps = {
  roomName: string; identity: string; title?: string;
  startWithMic?: boolean; startWithCamera?: boolean;
  meetingType?: string;
  initialAgenda?: string;
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */
function identityToDisplay(identity: string) {
  return identity.replace(/-[a-z0-9]{6}$/, "").split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function getInitials(name: string) {
  const p = name.trim().split(/\s+/).filter(Boolean);
  return !p.length ? "?" : (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}
function parseAgendaText(source?: string | null) {
  return (source ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean);
}
function agendaItemsFromTitles(titles: string[], idPrefix: string): AgendaItem[] {
  return titles.map((item, index) => ({
    id: `${idPrefix}-${index}`,
    title: item,
    position: index + 1,
    is_completed: false,
    decision_summary: "",
    decided_by: [],
  }));
}
function isUsableTranscriptText(text: string) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed || /^[\s.,!?;:-]+$/.test(trimmed)) return false;

  const normalized = trimmed.toLowerCase();
  const hallucinationMarkers = [
    "use proper punctuation",
    "capitalize names and acronyms",
    "learn more at",
    "please subscribe",
    "subscribe to my channel",
    "subtitles by",
    "amara.org",
    "to be continued",
    "u.s. department of defense",
    "u.s. department of health and human services",
    "u.s. money reserve",
  ];
  if (hallucinationMarkers.some((marker) => normalized.includes(marker))) return false;

  const words = normalized.match(/[a-z0-9']+/g) ?? [];
  if (!words.length) return false;
  if (words.length === 1 && words[0].length <= 2) return false;
  if (words.length > 8 && new Set(words).size / words.length < 0.35) return false;

  return true;
}

/* ─── Toast system ───────────────────────────────────────────────────────── */
function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  const icon = { join: "👋", leave: "🚪", chat: "💬", error: "⚠️", info: "ℹ️" };
  const color = {
    join: "border-emerald-200 bg-emerald-50",
    leave: "border-stone-200 bg-white",
    chat: "border-blue-200 bg-blue-50",
    error: "border-red-200 bg-red-50",
    info: "border-stone-200 bg-white",
  };
  const textColor = {
    join: "text-emerald-800",
    leave: "text-stone-700",
    chat: "text-blue-800",
    error: "text-red-800",
    info: "text-stone-700",
  };
  return (
    <div className="absolute top-20 right-3 sm:right-4 z-50 flex flex-col gap-2 pointer-events-none" style={{ maxWidth: 320 }}>
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: -20, scale: 0.9, x: 20 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
            className={`flex items-start gap-3 rounded-2xl border shadow-lg px-4 py-3 pointer-events-auto ${color[t.type]}`}
          >
            <span className="text-base leading-none mt-0.5">{icon[t.type]}</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${textColor[t.type]} leading-tight`}>{t.title}</p>
              {t.body && <p className={`text-xs mt-0.5 ${t.type === 'error' ? 'text-red-600' : 'text-stone-500'}`}>{t.body}</p>}
            </div>
            <button type="button" onClick={() => onDismiss(t.id)} className="text-stone-400 hover:text-stone-600 transition ml-1 mt-0.5 shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─── Notification system ────────────────────────────────────────────────── */
function NotificationSystem({
  onToast,
  onDMReceived,
  localIdentity,
  isHost,
  meetingId,
  recordParticipantJoin,
}: {
  onToast: (t: Omit<ToastItem, "id">) => void;
  onDMReceived: (from: string, text: string, timestamp: number) => void;
  localIdentity: string;
  isHost: boolean;
  meetingId?: string;
  recordParticipantJoin?: (meetingId: string, isSpeaking: boolean) => void;
}) {
  const room = useRoomContext();

  useEffect(() => {
    if (!room) return;

    const onJoin = (p: any) => {
      onToast({ type: "join", title: `${identityToDisplay(p.identity)} joined the meeting` });
      if (recordParticipantJoin) {
        void recordParticipantJoin(meetingId ?? "", false);
      }
    };
    const onLeave = (p: any) => {
      onToast({ type: "leave", title: `${identityToDisplay(p.identity)} left the meeting` });
    };
    const onData = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === "dm" && data.to === localIdentity) {
          onDMReceived(data.from, data.text, data.timestamp ?? Date.now());
          onToast({ type: "chat", title: `DM from ${identityToDisplay(data.from)}`, body: data.text.slice(0, 60) });
        }
        // Listen for host ending meeting
        if (data.type === "end-meeting" && data.from !== localIdentity) {
          onToast({ type: "info", title: "Meeting ended by host", body: "The host has ended the meeting for everyone." });
          setTimeout(() => room.disconnect(true), 3000);
        }
      } catch { /* ignore */ }
    };

    room.on(RoomEvent.ParticipantConnected, onJoin);
    room.on(RoomEvent.ParticipantDisconnected, onLeave);
    room.on(RoomEvent.DataReceived, onData);
    return () => {
      room.off(RoomEvent.ParticipantConnected, onJoin);
      room.off(RoomEvent.ParticipantDisconnected, onLeave);
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room, localIdentity, onToast, onDMReceived, isHost]);

  return null;
}

/* ─── Participant tile ───────────────────────────────────────────────────── */
function ParticipantTile({ trackRef, onClick }: { trackRef: any; onClick?: () => void }) {
  const participant = trackRef.participant;
  const isSpeaking = participant?.isSpeaking;
  const isMicOn = participant?.isMicrophoneEnabled;
  const isCamOn = trackRef.publication?.isSubscribed && !trackRef.publication?.isMuted;
  const displayName = identityToDisplay(participant?.identity ?? "unknown");
  const initials = getInitials(displayName);
  const isLocal = participant?.isLocal;

  return (
    <div
      onClick={onClick}
      className={[
        "relative h-full w-full overflow-hidden rounded-2xl bg-stone-100 transition-all duration-300 select-none",
        isSpeaking ? "ring-2 ring-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.15)]" : "ring-1 ring-stone-200",
        onClick ? "cursor-pointer" : "",
      ].join(" ")}
    >
      {isCamOn && trackRef.publication?.track ? (
        <VideoTrack trackRef={trackRef as any} className="h-full w-full object-cover scale-x-[-1]" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-50">
          <div className={`h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-semibold transition-all ${isSpeaking ? "bg-blue-100 text-blue-700 ring-1 ring-blue-300" : "bg-white text-stone-500 ring-1 ring-stone-200"}`}>
            {initials}
          </div>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-white truncate">{displayName}{isLocal ? " (You)" : ""}</span>
        <div className="flex items-center gap-2 shrink-0">
          {isSpeaking && (
            <div className="flex items-end gap-[2px] h-4">
              {[3, 5, 4, 6, 3].map((h, i) => (
                <div key={i} className="w-[2px] rounded-full bg-blue-400 animate-pulse" style={{ height: `${h}px`, animationDelay: `${i * 80}ms` }} />
              ))}
            </div>
          )}
          <div className={`h-6 w-6 rounded-full flex items-center justify-center ${isMicOn ? "bg-white/20" : "bg-red-500/30"}`}>
            <svg viewBox="0 0 24 24" fill="none" className={`h-3 w-3 ${isMicOn ? "text-white" : "text-red-400"}`} stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {isMicOn ? <><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" /><path d="M19 10v1a7 7 0 01-14 0v-1" /></>
                : <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3zM19 10v1a7 7 0 01-14 0v-1M3 3l18 18" />}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Meeting stage ──────────────────────────────────────────────────────── */
function MeetingStage({
  viewMode, focusedIdentity, onTileClick,
}: {
  viewMode: "grid" | "speaker"; focusedIdentity: string | null; onTileClick: (identity: string) => void;
}) {
  const screenTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }]);
  const cameraTracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: true }]);
  const participants = useParticipants();
  const count = cameraTracks.length;
  const isScreenSharing = screenTracks.length > 0;

  const gridCols = count === 1 ? "grid-cols-1" : count === 2 ? "grid-cols-1 sm:grid-cols-2" : count <= 4 ? "grid-cols-2" : count <= 6 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4";

  if (isScreenSharing) {
    return (
      <div className="h-full w-full flex flex-col lg:flex-row gap-2 p-2 sm:p-3 pt-[68px] pb-[84px]">
        <div className="flex-1 min-w-0 relative rounded-2xl overflow-hidden ring-1 ring-stone-200 bg-stone-900">
          <VideoTrack trackRef={screenTracks[0] as any} className="h-full w-full object-contain" />
          <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/70 backdrop-blur px-3 py-1.5 text-xs text-white">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            {identityToDisplay(screenTracks[0].participant.identity)}{"'s screen"}
          </div>
        </div>
        <div className="flex flex-row lg:flex-col gap-2 lg:w-52 overflow-x-auto lg:overflow-y-auto pb-2 lg:pb-0 shrink-0">
          <AnimatePresence>
            {cameraTracks.map((t) => (
              <motion.div
                key={t.participant.identity}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="shrink-0 w-44 lg:w-full h-28 lg:h-32"
              >
                <ParticipantTile trackRef={t} onClick={() => onTileClick(t.participant.identity)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <RoomAudioRenderer />
      </div>
    );
  }

  /* Speaker view */
  if ((viewMode === "speaker" || focusedIdentity) && count > 1) {
    const speakerIdentity = focusedIdentity ?? (participants.find((p) => p.isSpeaking)?.identity ?? participants[0]?.identity);
    const mainTrack = cameraTracks.find((t) => t.participant.identity === speakerIdentity) ?? cameraTracks[0];
    const others = cameraTracks.filter((t) => t !== mainTrack);
    return (
      <div className="h-full w-full flex flex-col gap-2 p-2 sm:p-3 pt-[68px] pb-[84px]">
        <div className="flex-1 min-h-0 rounded-2xl overflow-hidden">
          <ParticipantTile trackRef={mainTrack} onClick={() => onTileClick(mainTrack.participant.identity)} />
        </div>
        {others.length > 0 && (
          <div className="h-24 sm:h-28 flex gap-2 overflow-x-auto shrink-0">
            <AnimatePresence>
              {others.map((t) => (
                <motion.div
                  key={t.participant.identity}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className="w-36 sm:w-44 shrink-0 h-full"
                >
                  <ParticipantTile trackRef={t} onClick={() => onTileClick(t.participant.identity)} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
        <RoomAudioRenderer />
      </div>
    );
  }

  /* Grid view */
  return (
    <div className={`h-full w-full p-2 sm:p-3 pt-[68px] pb-[84px] grid ${gridCols} auto-rows-fr gap-2 overflow-hidden relative`}>
      <AnimatePresence>
        {cameraTracks.map((t) => (
          <motion.div
            key={t.participant.identity}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="h-full w-full overflow-hidden relative"
          >
            <ParticipantTile trackRef={t} onClick={() => onTileClick(t.participant.identity)} />
          </motion.div>
        ))}
      </AnimatePresence>
      <RoomAudioRenderer />
    </div>
  );
}

/* ─── Chat view ───────────────────────────────────────────────────────────── */
function ChatView({
  dmTarget, dmMessages, onSendDM, meetingId, onClose,
}: {
  dmTarget: string | null; dmMessages: Record<string, DMMessage[]>;
  onSendDM: (to: string, text: string) => void; meetingId: string | null; onClose: () => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const identity = localParticipant?.identity ?? "";
  const { chatMessages, send } = useChat();
  const [draft, setDraft] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [persistedMessages, setPersistedMessages] = useState<PersistedChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"everyone" | "dm">(dmTarget ? "dm" : "everyone");

  useEffect(() => { if (dmTarget) setTab("dm"); }, [dmTarget]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, persistedMessages, dmMessages, tab]);

  useEffect(() => {
    if (!meetingId) {
      setPersistedMessages([]);
      return;
    }

    async function loadChatHistory() {
      const { data, error } = await supabase
        .from("chat_history")
        .select("id, created_at, sender_identity, message_text")
        .eq("meeting_id", meetingId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) {
        setUploadError(`Could not load chat history: ${error.message}`);
        return;
      }
      setPersistedMessages((data ?? []) as PersistedChatMessage[]);
    }

    void loadChatHistory();
    const channel = supabase
      .channel(`meeting-chat-${meetingId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_history", filter: `meeting_id=eq.${meetingId}` },
        (payload) => {
          const next = payload.new as PersistedChatMessage;
          setPersistedMessages((prev) => prev.some((msg) => msg.id === next.id) ? prev : [...prev, next]);
        }
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [meetingId]);

  const dmList = dmTarget ? (dmMessages[dmTarget] ?? []) : [];

  const handleSend = async () => {
    const msg = draft.trim();
    if (!msg && !selectedFile) return;
    setIsUploading(true); setUploadError(null);

    try {
      let attachmentInfo: { name: string; url: string; type: string; size: number } | null = null;

      if (selectedFile) {
        const ext = selectedFile.name.split(".").pop() || "bin";
        const path = `${meetingId ?? "general"}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("chat_attachments").upload(path, selectedFile, { cacheControl: "3600", upsert: false });
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
        const { data: { publicUrl } } = supabase.storage.from("chat_attachments").getPublicUrl(path);
        attachmentInfo = { name: selectedFile.name, url: publicUrl, type: selectedFile.type, size: selectedFile.size };
      }

      if (tab === "dm" && dmTarget) {
        const text = msg || `Shared: ${attachmentInfo?.name ?? "file"}`;
        const payload = { text, attachment: attachmentInfo };
        onSendDM(dmTarget, JSON.stringify(payload));
      } else {
        const payload = attachmentInfo
          ? JSON.stringify({ text: msg || `Shared: ${attachmentInfo.name}`, attachment: attachmentInfo })
          : msg;
        await send(payload);

        if (meetingId) {
          void supabase.from("chat_history").insert({
            meeting_id: meetingId,
            sender_identity: identity,
            message_text: payload,
          });
        }
      }

      setDraft(""); setSelectedFile(null);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Failed to send. Try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const renderMessage = (msg: any, key: string | number) => {
    let text = msg.message ?? msg.text ?? "";
    let attachment: any = null;
    try {
      if (text.startsWith("{")) {
        const p = JSON.parse(text);
        text = p.text;
        attachment = p.attachment;
      }
    } catch { /* ignore */ }
    const isOwn = msg.from?.isLocal ?? msg.from === identity;
    const senderName = msg.from?.isLocal ? "You" : identityToDisplay(msg.from?.identity ?? msg.from ?? "Unknown");
    const isImg = attachment?.type?.startsWith("image/");
    return (
      <div key={key} className={`flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`}>
        <span className="text-[10px] text-slate-500 px-1">{isOwn ? "You" : senderName}</span>
        <div className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm break-words ${isOwn ? "bg-blue-600 text-white rounded-br-sm" : "bg-slate-100 text-slate-800 border border-slate-200 rounded-bl-sm"}`}>
          {text && <p className="leading-relaxed whitespace-pre-wrap">{text}</p>}
          {attachment && (
            <div className="mt-1.5">
              {isImg ? (
                <a href={attachment.url} target="_blank" rel="noopener noreferrer" className={`block rounded-xl overflow-hidden border ${isOwn ? "border-white/10" : "border-slate-200"}`}>
                  <img src={attachment.url} alt={attachment.name} className="w-full h-auto max-h-40 object-cover" />
                </a>
              ) : (
                <a href={attachment.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-xl transition ${isOwn ? "bg-white/10 hover:bg-white/15" : "bg-white border border-slate-200 hover:bg-slate-50"}`}>
                  <div className={`h-8 w-8 rounded-lg grid place-items-center shrink-0 ${isOwn ? "bg-blue-500/20 text-blue-100" : "bg-blue-50 text-blue-600"}`}>
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs truncate ${isOwn ? "text-white/90" : "text-slate-700"}`}>{attachment.name}</div>
                    {attachment.size && <div className={`text-[10px] ${isOwn ? "text-white/60" : "text-slate-500"}`}>{(attachment.size / 1024).toFixed(0)} KB</div>}
                  </div>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const liveOnlyMessages = chatMessages.filter((msg: any) => {
    const text = msg.message ?? msg.text ?? "";
    const from = msg.from?.identity ?? msg.from ?? identity;
    return !persistedMessages.some((saved) => saved.sender_identity === from && saved.message_text === text);
  });
  const everyoneMessages = [
    ...persistedMessages.map((msg) => ({ id: msg.id, from: msg.sender_identity, message: msg.message_text })),
    ...liveOnlyMessages,
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-slate-200 shrink-0">
        <button type="button" onClick={() => setTab("everyone")}
          className={`flex-1 py-2.5 text-xs font-medium transition ${tab === "everyone" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
          Everyone
        </button>
        {dmTarget && (
          <button type="button" onClick={() => setTab("dm")}
            className={`flex-1 py-2.5 text-xs font-medium transition truncate px-2 ${tab === "dm" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-700"}`}>
            DM: {identityToDisplay(dmTarget)}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0 flex flex-col justify-start">
        {tab === "everyone" ? (
          everyoneMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center my-auto">
              <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4 text-slate-400">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-700">No messages yet</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-[200px] leading-relaxed">Be the first to say hello or send a file to the team!</p>
            </div>
          ) : (
            everyoneMessages.map((m, i) => renderMessage(m, (m as any).id ?? `live-${i}`))
          )
        ) : (
          dmList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center my-auto">
              <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-4 text-slate-400">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-700">Private Chat</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-[220px] leading-relaxed">This is the start of your private direct message history with {identityToDisplay(dmTarget ?? "")}.</p>
            </div>
          ) : (
            dmList.map((m, i) => renderMessage({ from: m.from, message: m.text }, i))
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-200 p-3 space-y-2 shrink-0">
        {selectedFile && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-xs text-slate-600 truncate">{selectedFile.name}</span>
            <button type="button" onClick={() => setSelectedFile(null)} className="text-slate-400 hover:text-slate-600 transition shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
        )}
        {uploadError && <p className="text-xs text-red-500 px-1">{uploadError}</p>}
        <div className="flex gap-2">
          {tab === "everyone" && (
            <label className="h-10 w-10 rounded-xl border border-stone-200 bg-stone-50 grid place-items-center cursor-pointer hover:bg-stone-100 transition shrink-0">
              {isUploading
                ? <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                : <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-stone-500" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>
              }
              <input type="file" onChange={(e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 52428800) { setUploadError("File exceeds 50 MB."); return; } setUploadError(null); setSelectedFile(f); e.target.value = ""; }} className="hidden" accept="image/*,application/pdf,text/plain,.doc,.docx,.txt" disabled={isUploading} />
            </label>
          )}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); } }}
            placeholder={isUploading ? "Uploading…" : tab === "dm" ? `Message ${identityToDisplay(dmTarget ?? "")}…` : "Message everyone… (Enter)"}
            disabled={isUploading}
            className="h-10 flex-1 rounded-xl border border-stone-200 bg-stone-50 px-3 text-sm text-stone-800 placeholder:text-stone-300 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition min-w-0"
          />
          <button type="button" disabled={isUploading || (!draft.trim() && !selectedFile)} onClick={() => void handleSend()}
            className="h-10 w-10 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition grid place-items-center shrink-0">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Participants panel ─────────────────────────────────────────────────── */
function ChatToastListener({
  activePanel,
  onToast,
}: {
  activePanel: MeetingPanel;
  onToast: (t: Omit<ToastItem, "id">) => void;
}) {
  const { localParticipant } = useLocalParticipant();
  const { chatMessages } = useChat();
  const seenRef = useRef(0);

  useEffect(() => {
    if (chatMessages.length <= seenRef.current) {
      seenRef.current = chatMessages.length;
      return;
    }

    const nextMessages = chatMessages.slice(seenRef.current);
    seenRef.current = chatMessages.length;
    if (activePanel === "chat") return;

    nextMessages.forEach((msg: any) => {
      const fromIdentity = msg.from?.identity ?? msg.from;
      if (!fromIdentity || fromIdentity === localParticipant?.identity) return;
      const raw = msg.message ?? msg.text ?? "";
      let body = raw;
      try {
        if (raw.startsWith("{")) {
          const parsed = JSON.parse(raw);
          body = parsed.text || parsed.attachment?.name || "Shared a document";
        }
      } catch { /* ignore */ }
      onToast({ type: "chat", title: `Chat from ${identityToDisplay(fromIdentity)}`, body: body.slice(0, 80) });
    });
  }, [activePanel, chatMessages, localParticipant?.identity, onToast]);

  return null;
}

function ParticipantsPanel({ onDM }: { onDM: (identity: string) => void }) {
  const participants = useParticipants();
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
      {participants.map((p) => (
        <div key={p.identity} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 grid place-items-center text-xs font-semibold text-white shrink-0">
            {getInitials(identityToDisplay(p.identity))}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm text-slate-800 font-medium truncate">
              {identityToDisplay(p.identity)}{p.isLocal && <span className="text-slate-400 font-normal ml-1 text-xs">(You)</span>}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`h-1.5 w-1.5 rounded-full ${p.isMicrophoneEnabled ? "bg-emerald-500" : "bg-red-500"}`} />
              <span className={`h-1.5 w-1.5 rounded-full ${p.isCameraEnabled ? "bg-emerald-500" : "bg-white/20"}`} />
              {p.isSpeaking && <span className="text-[10px] text-blue-400">Speaking</span>}
            </div>
          </div>
          {!p.isLocal && (
            <button type="button" onClick={() => onDM(p.identity)}
              className="h-7 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[10px] text-slate-500 hover:text-slate-800 hover:border-blue-200 hover:bg-blue-50 transition shrink-0">
              DM
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Captions panel ─────────────────────────────────────────────────────── */
function CaptionsPanel({
  captions, interimCaption, captionError, speechRecognitionAvailable, providerOrder,
}: {
  captions: string[]; interimCaption: string; captionError: string | null;
  speechRecognitionAvailable: boolean; providerOrder: SttProvider[];
}) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [captions, interimCaption]);

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
        <span className="text-slate-500 leading-relaxed">Live captions appear here. Speak clearly with your mic on for best results.</span>
        <div className="flex items-center gap-2 shrink-0 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200">
          <span className={`relative flex h-2 w-2`}>
            {!captionError && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${captionError ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
          </span>
          <span className={`font-medium ${captionError ? 'text-red-400' : 'text-emerald-400'}`}>
            {captionError ? 'STT Inactive' : 'STT Active'}
          </span>
        </div>
      </div>
      {!speechRecognitionAvailable && providerOrder.includes("webspeech") && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300">
          Browser speech recognition not available. Enable Deepgram or Whisper via environment variables for better results.
        </div>
      )}
      {captions.map((c, i) => {
        const col = c.indexOf(":");
        const speaker = col !== -1 ? c.substring(0, col).trim() : "";
        const text = col !== -1 ? c.substring(col + 1).trim() : c;
        return (
          <div key={i} className="space-y-1">
            {speaker && <div className="text-[10px] text-blue-600 font-medium px-1">{speaker}</div>}
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 leading-relaxed">{text}</div>
          </div>
        );
      })}
      {interimCaption && (
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-300 italic">{interimCaption}</div>
      )}
      {!captions.length && !interimCaption && (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="relative flex items-center justify-center mb-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 animate-pulse" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
                <line x1="12" x2="12" y1="19" y2="22" />
              </svg>
            </div>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          </div>
          <h3 className="text-sm font-semibold text-slate-700">Listening for speech...</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-[200px] leading-relaxed">Speak into your microphone to generate real-time captions.</p>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

/* ─── Side panel ─────────────────────────────────────────────────────────── */
function AgendaPanel({
  agendaItems,
  captions,
  isHost,
  summaryStatus,
  onUpdateAgendaItem,
}: {
  agendaItems: AgendaItem[];
  captions: string[];
  isHost: boolean;
  summaryStatus: Record<string, "generating" | "error">;
  onUpdateAgendaItem: (id: string, patch: Partial<Pick<AgendaItem, "is_completed" | "decision_summary">>) => void;
}) {
  const latestTranscript = captions.slice(-10).join(" ");
  const suggestedSummary = (title: string) => {
    const words = title.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
    const hits = captions
      .filter((line) => words.some((word) => line.toLowerCase().includes(word)))
      .slice(-3);
    if (!hits.length) return "";
    return hits
      .map((line) => {
        const text = line.includes(":") ? line.split(":").slice(1).join(":").trim() : line;
        return text.replace(/\s+/g, " ").slice(0, 140);
      })
      .join(" ");
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3">
        <p className="text-xs font-semibold text-blue-700">Agenda progress</p>
        <p className="mt-1 text-xs text-blue-600 leading-relaxed">
          The host can complete each item to attach an AI summary of what participants discussed.
        </p>
      </div>
      {agendaItems.length ? (
        agendaItems.map((item, index) => {
          const suggestion = suggestedSummary(item.title);
          return (
            <div key={item.id} className="rounded-2xl border border-stone-100 bg-stone-50 p-3 space-y-3">
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => onUpdateAgendaItem(item.id, { is_completed: !item.is_completed })}
                  disabled={!isHost}
                  className={`mt-0.5 h-6 w-6 rounded-full border-2 grid place-items-center shrink-0 transition ${item.is_completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-stone-300 bg-white text-transparent hover:border-blue-300"
                    } ${isHost ? "" : "cursor-not-allowed opacity-60"}`}
                  aria-label={item.is_completed ? "Mark agenda item untreated" : "Mark agenda item treated"}
                  title={isHost ? undefined : "Only the host can complete agenda items"}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Item {index + 1}</p>
                  <p className={`mt-0.5 text-sm font-medium leading-snug ${item.is_completed ? "text-stone-500" : "text-stone-800"}`}>
                    {item.title}
                  </p>
                </div>
              </div>
              {summaryStatus[item.id] === "generating" ? (
                <div className="rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs text-blue-600">
                  Drafting AI discussion summary...
                </div>
              ) : item.is_completed ? (
                <div className="rounded-xl border border-emerald-100 bg-white px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">Participant summary</p>
                  <p className="mt-1 text-xs leading-relaxed text-stone-600">
                    {(item.decision_summary ?? "").trim() || "No participant discussion was captured for this agenda item."}
                  </p>
                  {summaryStatus[item.id] === "error" && (
                    <p className="mt-2 text-[11px] text-red-500">AI summary failed. The host can edit the note manually.</p>
                  )}
                </div>
              ) : (
                <textarea
                  value={item.decision_summary ?? ""}
                  onChange={(e) => onUpdateAgendaItem(item.id, { decision_summary: e.target.value })}
                  placeholder={suggestion || "AI summary will appear here when the host completes this agenda item."}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-700 placeholder:text-stone-300 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              )}

            </div>
          );
        })
      ) : (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="h-12 w-12 rounded-2xl bg-stone-100 border border-stone-200 grid place-items-center text-stone-400 mb-4">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6h11M9 12h11M9 18h11" />
              <path d="M4 6h.01M4 12h.01M4 18h.01" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-stone-700">No agenda shared</h3>
          <p className="text-xs text-stone-400 mt-1 max-w-[220px] leading-relaxed">Create the meeting with agenda items so progress can be tracked here.</p>
        </div>
      )}
      {latestTranscript && (
        <div className="rounded-xl border border-stone-100 bg-white p-3">
          <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide">Latest discussion</p>
          <p className="mt-1 text-xs text-stone-500 leading-relaxed">{latestTranscript.slice(0, 420)}</p>
        </div>
      )}
    </div>
  );
}

function SidePanel({
  activePanel, onClose, captions, interimCaption, captionError,
  speechRecognitionAvailable, providerOrder, meetingId,
  dmTarget, dmMessages, onSendDM, onDMParticipant,
  agendaItems, isHost, summaryStatus, onUpdateAgendaItem,
}: {
  activePanel: Exclude<MeetingPanel, null>; onClose: () => void;
  captions: string[]; interimCaption: string; captionError: string | null;
  speechRecognitionAvailable: boolean; providerOrder: SttProvider[]; meetingId: string | null;
  dmTarget: string | null; dmMessages: Record<string, DMMessage[]>;
  onSendDM: (to: string, text: string) => void; onDMParticipant: (identity: string) => void;
  agendaItems: AgendaItem[];
  isHost: boolean;
  summaryStatus: Record<string, "generating" | "error">;
  onUpdateAgendaItem: (id: string, patch: Partial<Pick<AgendaItem, "is_completed" | "decision_summary">>) => void;
}) {
  const panelTitle = activePanel === "participants" ? "People" : activePanel === "chat" ? "Chat" : activePanel === "agenda" ? "Agenda" : "Live Captions";

  return (
    <div className="h-full flex flex-col bg-transparent">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 shrink-0">
        <span className="text-sm font-semibold text-slate-800">{panelTitle}</span>
        <button type="button" onClick={onClose} className="h-8 w-8 rounded-xl border border-slate-200 bg-slate-50 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition grid place-items-center">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
      </div>
      <div className="flex-1 min-h-0 flex flex-col relative">
        <AnimatePresence mode="wait">
          {activePanel === "participants" && (
            <motion.div
              key="participants"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex flex-col"
            >
              <ParticipantsPanel onDM={(identity) => { onDMParticipant(identity); }} />
            </motion.div>
          )}
          {activePanel === "chat" && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex flex-col"
            >
              <ChatView dmTarget={dmTarget} dmMessages={dmMessages} onSendDM={onSendDM} meetingId={meetingId} onClose={onClose} />
            </motion.div>
          )}
          {activePanel === "agenda" && (
            <motion.div
              key="agenda"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex flex-col"
            >
              <AgendaPanel agendaItems={agendaItems} captions={captions} isHost={isHost} summaryStatus={summaryStatus} onUpdateAgendaItem={onUpdateAgendaItem} />
            </motion.div>
          )}
          {activePanel === "captions" && (
            <motion.div
              key="captions"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex flex-col"
            >
              <CaptionsPanel captions={captions} interimCaption={interimCaption} captionError={captionError} speechRecognitionAvailable={speechRecognitionAvailable} providerOrder={providerOrder} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── STT controller (fixed race conditions) ─────────────────────────────── */
type STTProps = {
  sttDisabled: boolean; sttLang: string; sttChunkMs: number;
  speechRecognitionAvailable: boolean; sttProviderOrder: SttProvider[];
  onCaptionsChange: (fn: (c: string[]) => string[]) => void;
  onInterimChange: (t: string) => void; onErrorChange: (e: string | null) => void;
  meetingId: string | null;
};

function RoomTranscriptionController({ sttDisabled, sttLang, sttChunkMs, speechRecognitionAvailable, sttProviderOrder, onCaptionsChange, onInterimChange, onErrorChange, meetingId }: STTProps) {
  const { localParticipant, isMicrophoneEnabled } = useLocalParticipant();
  const room = useRoomContext();
  const identity = localParticipant?.identity ?? "Guest";
  const recRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const activeProviderRef = useRef<SttProvider | null>(null);
  const cancelledRef = useRef(false);
  const processingQueueRef = useRef<Promise<void>>(Promise.resolve());

  const broadcast = useCallback((text: string) => {
    if (!localParticipant) return;
    try {
      const payload = JSON.stringify({ type: "caption", sender: localParticipant.identity, text });
      void localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true, topic: "captions" });
    } catch { /* ignore */ }
  }, [localParticipant]);

  const finalize = useCallback((text: string) => {
    const cleanText = text.replace(/\s+/g, " ").trim();
    if (!isUsableTranscriptText(cleanText) || cancelledRef.current) return;
    const display = identityToDisplay(identity);
    const line = `${display}: ${cleanText}`;
    onCaptionsChange((c) => [...c, line]);
    broadcast(cleanText);
    // Save to Supabase immediately for persistence
    if (meetingId) {
      void supabase.from("transcripts").insert({
        meeting_id: meetingId,
        speaker_name: display,
        transcript_text: cleanText
      });
    }
  }, [identity, onCaptionsChange, broadcast, meetingId]);

  // Receive remote captions
  useEffect(() => {
    if (!room) return;
    const handler = (payload: Uint8Array) => {
      if (cancelledRef.current) return;
      try {
        const d = JSON.parse(new TextDecoder().decode(payload));
        const cleanText = String(d.text ?? "").replace(/\s+/g, " ").trim();
        if (d.type === "caption" && d.sender !== identity && isUsableTranscriptText(cleanText)) {
          const line = `${identityToDisplay(d.sender)}: ${cleanText}`;
          onCaptionsChange((c) => c.includes(line) ? c : [...c, line]);
        }
      } catch { /* ignore */ }
    };
    room.on(RoomEvent.DataReceived, handler);
    return () => { room.off(RoomEvent.DataReceived, handler); };
  }, [room, identity, onCaptionsChange]);

  useEffect(() => {
    if (sttDisabled || !isMicrophoneEnabled) { onInterimChange(""); return; }
    cancelledRef.current = false;

    const stopAll = () => {
      // Stop Web Speech
      const r = recRef.current; recRef.current = null;
      if (r) {
        r.onresult = undefined;
        r.onend = undefined;
        r.onerror = undefined;
        try { r.stop(); } catch { /* ignore */ }
      }
      // Stop MediaRecorder
      const rec = recorderRef.current; recorderRef.current = null;
      if (rec && rec.state !== "inactive") {
        rec.ondataavailable = null;
        try { rec.stop(); } catch { /* ignore */ }
      }
      // Stop stream
      const s = streamRef.current; streamRef.current = null;
      if (s) {
        try { s.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
      }
    };

    let currentProviderIndex = 0;
    let currentStop: (() => void) | null = null;

    const startWS = (): (() => void) => {
      const win = window as any;
      const SR = win.SpeechRecognition ?? win.webkitSpeechRecognition;
      if (!SR) throw new Error("Browser speech recognition unavailable.");
      const r = new SR();
      r.continuous = true; r.interimResults = true; r.lang = sttLang; r.maxAlternatives = 1;
      r.onresult = (e: any) => {
        if (cancelledRef.current) return;
        let interim = "";
        const finals: string[] = [];
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0]?.transcript?.trim();
          if (!t) continue;
          if (e.results[i].isFinal) finals.push(t); else interim = t;
        }
        if (interim) onInterimChange(interim);
        if (finals.length) { finals.forEach(finalize); onInterimChange(""); }
      };
      r.onerror = (e: any) => {
        if (cancelledRef.current) return;
        // Don't show error for intentional stops
        if (e.error !== "aborted") {
          onErrorChange(e.error ?? "STT error");
        }
      };
      r.onend = () => {
        if (cancelledRef.current || !recRef.current) return;
        try { r.start(); } catch { /* ignore */ }
      };
      r.start(); recRef.current = r;
      return () => {
        recRef.current = null;
        r.onresult = undefined;
        r.onend = undefined;
        r.onerror = undefined;
        try { r.stop(); } catch { /* ignore */ }
      };
    };

    const transcribeChunk = async (provider: "deepgram" | "whisper", blob: Blob) => {
      const res = await fetch("/api/stt", {
        method: "POST",
        headers: {
          "x-stt-provider": provider,
          "x-stt-lang": sttLang,
          "content-type": blob.type || "audio/webm"
        },
        body: blob
      });
      if (!res.ok) {
        const bodyText = await res.text().catch(() => "");
        try {
          const parsed = JSON.parse(bodyText) as { error?: string; errors?: Array<{ provider?: string; message?: string }> };
          if (parsed?.errors?.length) {
            const details = parsed.errors.map((e) => `${e.provider ?? "provider"}: ${e.message ?? "unknown error"}`).join(" | ");
            throw new Error(details);
          }
          throw new Error(parsed?.error || bodyText || `STT ${res.status}`);
        } catch {
          throw new Error(bodyText || `STT ${res.status}`);
        }
      }
      const d = await res.json() as { text?: string; error?: string };
      if (d.error) throw new Error(d.error);
      const text = (d.text ?? "").replace(/\s+/g, " ").trim();
      return isUsableTranscriptText(text) ? text : "";
    };

    const shouldSendAudioChunk = async (blob: Blob) => {
      if (blob.size < 1800) return false;
      const AudioContextCtor = (window as any).AudioContext ?? (window as any).webkitAudioContext;
      if (!AudioContextCtor) return true;

      try {
        const arrayBuffer = await blob.arrayBuffer();
        const ctx = new AudioContextCtor() as AudioContext;
        const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
        const data = decoded.getChannelData(0);
        const step = Math.max(1, Math.floor(data.length / 8000));
        let sumSquares = 0;
        let peak = 0;
        let activeSamples = 0;
        let samples = 0;

        for (let i = 0; i < data.length; i += step) {
          const value = Math.abs(data[i]);
          peak = Math.max(peak, value);
          sumSquares += value * value;
          if (value > 0.012) activeSamples++;
          samples++;
        }

        await ctx.close().catch(() => undefined);

        if (!samples) return false;
        const rms = Math.sqrt(sumSquares / samples);
        const activeRatio = activeSamples / samples;
        return rms >= 0.006 || peak >= 0.045 || activeRatio >= 0.015;
      } catch {
        return blob.size > 5000;
      }
    };

    const startServerSTT = async (provider: "deepgram" | "whisper"): Promise<() => void> => {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("getUserMedia not supported.");
      if (typeof MediaRecorder === "undefined") throw new Error("MediaRecorder not supported.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (cancelledRef.current) { stream.getTracks().forEach((t) => t.stop()); throw new Error("Cancelled"); }
      streamRef.current = stream;

      const mime = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4"
      ].find((t) => MediaRecorder.isTypeSupported(t));

      const failures = { count: 0 };
      const MAX_FAILURES = 3;
      let currentRecorder: MediaRecorder | null = null;
      let recordingTimeout: ReturnType<typeof setTimeout> | null = null;

      const recordChunk = () => {
        if (cancelledRef.current) return;
        try {
          const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
          currentRecorder = recorder;
          recorder.ondataavailable = (e) => {
            if (!e.data?.size || cancelledRef.current) return;
            const chunkBlob = e.data;
            processingQueueRef.current = processingQueueRef.current.then(async () => {
              if (cancelledRef.current || activeProviderRef.current !== provider) return;
              try {
                if (!(await shouldSendAudioChunk(chunkBlob))) return;
                const text = await transcribeChunk(provider, chunkBlob);
                if (text && !cancelledRef.current) {
                  finalize(text);
                  onInterimChange("");
                  failures.count = 0;
                }
              } catch (err) {
                if (cancelledRef.current) return;
                failures.count++;
                onErrorChange(err instanceof Error ? err.message : String(err));
                if (failures.count >= MAX_FAILURES) {
                  failures.count = 0;
                  setTimeout(() => { if (!cancelledRef.current) activate(currentProviderIndex + 1); }, 0);
                }
              }
            });
          };
          recorder.start();
          recordingTimeout = setTimeout(() => {
            if (recorder.state !== "inactive") {
              try { recorder.stop(); } catch { /* ignore */ }
            }
            recordChunk(); // Start next chunk
          }, sttChunkMs);
        } catch (err) {
          if (!cancelledRef.current) {
            onErrorChange(err instanceof Error ? err.message : String(err));
            setTimeout(() => { activate(currentProviderIndex + 1); }, 0);
          }
        }
      };

      recordChunk();

      return () => {
        if (recordingTimeout) clearTimeout(recordingTimeout);
        if (currentRecorder && currentRecorder.state !== "inactive") {
          currentRecorder.ondataavailable = null;
          try { currentRecorder.stop(); } catch { /* ignore */ }
        }
        currentRecorder = null;
        const s = streamRef.current;
        if (s) { streamRef.current = null; try { s.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ } }
      };
    };

    const supports = (p: SttProvider) =>
      p === "webspeech" ? speechRecognitionAvailable
        : typeof navigator.mediaDevices?.getUserMedia === "function" && typeof MediaRecorder !== "undefined";

    const activate = async (idx: number) => {
      if (cancelledRef.current) return;
      currentStop?.();
      currentStop = null;
      activeProviderRef.current = null;
      onErrorChange(null);
      onInterimChange("");

      for (let i = idx; i < sttProviderOrder.length; i++) {
        if (cancelledRef.current) return;
        const p = sttProviderOrder[i];
        if (!supports(p)) continue;
        try {
          const stop = p === "webspeech" ? (() => { stopServerSTT(); return startWS(); })() : await startServerSTT(p as "deepgram" | "whisper");
          if (cancelledRef.current) { stop(); return; }
          currentStop = stop;
          currentProviderIndex = i;
          activeProviderRef.current = p;
          return;
        } catch (e) {
          if (cancelledRef.current) return;
          onErrorChange(e instanceof Error ? e.message : String(e));
        }
      }
      if (!cancelledRef.current) {
        onErrorChange("No STT provider available. Check mic permissions.");
      }
    };

    const stopServerSTT = () => {
      const rec = recorderRef.current; recorderRef.current = null;
      if (rec) {
        rec.ondataavailable = null;
        try { if (rec.state !== "inactive") rec.stop(); } catch { /* ignore */ }
      }
      const s = streamRef.current; streamRef.current = null;
      if (s) {
        try { s.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
      }
    };

    void activate(0);
    const retryId = setInterval(() => {
      if (!cancelledRef.current && currentProviderIndex > 0) void activate(0);
    }, 60_000);

    return () => {
      cancelledRef.current = true;
      clearInterval(retryId);
      currentStop?.();
      stopAll();
    };
  }, [speechRecognitionAvailable, sttChunkMs, sttDisabled, sttLang, sttProviderOrder, isMicrophoneEnabled, finalize, onErrorChange, onInterimChange]);

  return null;
}

/* ─── Markdown renderer ──────────────────────────────────────────────────── */
function parseBold(text: string) {
  return text.split(/(\*\*.*?\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={i} className="font-semibold text-stone-800">{part.slice(2, -2)}</strong>
      : part
  );
}

function MarkdownRenderer({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-stone-700">
      {text.split("\n").map((line, idx) => {
        const t = line.trim();
        if (t.startsWith("### ")) return <h3 key={idx} className="text-sm font-bold text-stone-800 mt-5 mb-1">{t.slice(4)}</h3>;
        if (t.startsWith("## ")) return <h2 key={idx} className="text-base font-bold text-stone-800 mt-6 mb-2 border-b border-stone-200 pb-1.5">{t.slice(3)}</h2>;
        if (t.startsWith("# ")) return <h1 key={idx} className="text-lg font-bold text-stone-800 mt-8 mb-3">{t.slice(2)}</h1>;
        const cbm = t.match(/^-\s+\[([ xX])\]\s+(.*)$/);
        if (cbm) {
          const checked = cbm[1].toLowerCase() === "x";
          return <div key={idx} className="flex items-start gap-2.5 my-1.5 pl-1"><input type="checkbox" readOnly checked={checked} className="mt-0.5 h-3.5 w-3.5 rounded border-stone-300 pointer-events-none" /><span className={`text-sm ${checked ? "line-through text-stone-400" : "text-stone-700"}`}>{parseBold(cbm[2])}</span></div>;
        }
        if (t.startsWith("- ") || t.startsWith("* ")) return <li key={idx} className="text-sm text-stone-700 ml-4 list-disc my-0.5">{parseBold(t.slice(2))}</li>;
        const nm = t.match(/^(\d+)\.\s+(.*)/);
        if (nm) return <div key={idx} className="text-sm text-stone-700 pl-1 my-0.5 flex gap-2"><span className="text-blue-600 font-semibold shrink-0">{nm[1]}.</span><span>{parseBold(nm[2])}</span></div>;
        if (t.startsWith("|")) return <div key={idx} className="text-xs text-stone-500 font-mono bg-stone-50 rounded px-2 py-0.5 my-0.5 overflow-x-auto">{t}</div>;
        if (!t) return <div key={idx} className="h-1.5" />;
        return <p key={idx} className="text-sm text-stone-600 leading-relaxed">{parseBold(t)}</p>;
      })}
    </div>
  );
}

/* ─── Meeting summary dashboard ──────────────────────────────────────────── */
function MeetingSummaryDashboard({ captions, roomName, onClose, meetingId, isHost, initialMeetingType }: {
  captions: string[]; roomName: string; onClose: () => void; meetingId: string | null; isHost: boolean;
  initialMeetingType?: string;
}) {
  const [summaryText, setSummaryText] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [meetingType, setMeetingType] = useState<"general" | "board" | "standup" | "retro" | "workshop" | "client">(
    (initialMeetingType as "general" | "board" | "standup" | "retro" | "workshop" | "client") || "general"
  );
  const [showTypeSelector, setShowTypeSelector] = useState(false);

  const saveSummaryToSupabase = useCallback(async (minutes: string) => {
    if (!meetingId || saved) return;
    try {
      const { data: existing } = await supabase
        .from("meeting_summaries")
        .select("id")
        .eq("meeting_id", meetingId)
        .maybeSingle();

      if (existing) { setSaved(true); return; }

      const { data: summaryData, error: se } = await supabase
        .from("meeting_summaries")
        .insert({
          meeting_id: meetingId,
          markdown_content: minutes,
          executive_summary: "AI Generated",
          key_decisions: []
        })
        .select("id")
        .single();

      if (se) { console.warn("Summary save error:", se); return; }
      setSaved(true);

      if (summaryData) {
        const actionItems = minutes.split("\n").reduce<any[]>((acc, line) => {
          const m = line.trim().match(/^\|\s*\d+\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/);
          if (m) acc.push({
            summary_id: summaryData.id,
            task: m[1].trim(),
            assignee: m[2].trim() || "Unassigned",
            priority: m[4].trim() || "Medium",
            is_completed: false
          });
          const cb = line.trim().match(/^-\s+\[([ xX])\]\s+(.*)/);
          if (cb) acc.push({
            summary_id: summaryData.id,
            task: cb[2].trim(),
            assignee: "Unassigned",
            priority: "Medium",
            is_completed: cb[1].toLowerCase() === "x"
          });
          return acc;
        }, []);

        if (actionItems.length > 0) {
          await supabase.from("action_items").insert(actionItems);
        }
      }
    } catch (e) {
      console.warn("Failed to store summary:", e);
    }
  }, [meetingId, saved]);

  const generate = useCallback(async (force = false) => {
    setIsGenerating(true); setError(null);
    try {
      if (meetingId && !force) {
        const { data: existing, error: fetchErr } = await supabase
          .from("meeting_summaries")
          .select("markdown_content")
          .eq("meeting_id", meetingId)
          .maybeSingle();
        if (fetchErr) console.warn("Summary fetch error:", fetchErr);
        if (existing?.markdown_content) {
          setSummaryText(existing.markdown_content);
          setSaved(true);
          return;
        }
      }

      // Fetch full transcripts from Supabase if we have meetingId
      let finalTranscript = captions;
      let participantList: string[] = [];
      if (meetingId) {
        const { data: dbTranscripts } = await supabase
          .from("transcripts")
          .select("speaker_name, transcript_text")
          .eq("meeting_id", meetingId)
          .order("created_at", { ascending: true });

        if (dbTranscripts && dbTranscripts.length > 0) {
          finalTranscript = dbTranscripts.map(t => `${t.speaker_name}: ${t.transcript_text}`);
        }

        const { data: dbParticipants } = await supabase
          .from("meeting_participants")
          .select("display_name, is_host")
          .eq("meeting_id", meetingId);

        if (dbParticipants) {
          participantList = dbParticipants.map(p => `${p.display_name}${p.is_host ? " (Host)" : ""}`);
        }
      }

      if (!finalTranscript.length && !participantList.length) {
        setError("No transcript or participants found for this meeting.");
        return;
      }
      // If no transcript, create a placeholder so summary still generates
      if (!finalTranscript.length) {
        finalTranscript = ["(No speech was recorded during this meeting.)"];
      }

      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: finalTranscript,
          participants: participantList,
          meetingContext: {
            language: process.env.NEXT_PUBLIC_MEETING_LANGUAGE || undefined,
            region: process.env.NEXT_PUBLIC_MEETING_REGION || undefined,
            meetingType,
          }
        })
      });
      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        let message = errorText || `${res.status}`;
        try {
          const parsed = JSON.parse(errorText) as { error?: string };
          message = parsed.error || message;
        } catch { /* response was not JSON */ }
        throw new Error(message);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");
      const decoder = new TextDecoder();
      let fullText = "";
      setSummaryText("");

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setSummaryText(fullText);
        }
      } catch (err) {
        console.warn("Stream interrupted:", err);
      } finally {
        void saveSummaryToSupabase(fullText);
      }
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { setIsGenerating(false); }
  }, [captions, meetingId, saveSummaryToSupabase, meetingType]);

  useEffect(() => { void generate(); }, []);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <header className="border-b border-stone-200 pb-4 mb-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 grid place-items-center font-bold text-white shadow-sm shrink-0">D</div>
            <div>
              <h1 className="text-sm font-bold text-stone-800">Meeting ended</h1>
              <p className="text-xs text-stone-400 font-mono mt-0.5 truncate max-w-[200px]">{roomName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-emerald-600 hidden sm:inline">✓ Saved to Supabase</span>}
            {isHost && (
              <span className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5 hidden sm:inline">
                Host
              </span>
            )}
            <button onClick={onClose} className="h-9 rounded-xl border border-stone-200 bg-white px-4 text-xs font-medium text-stone-600 hover:text-stone-800 hover:bg-stone-50 transition">
              ← Home
            </button>
          </div>
        </header>

        <main className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 sm:gap-6 overflow-auto">
          <section className="flex-1 flex flex-col min-w-0 rounded-2xl border border-stone-200 bg-white p-5 min-h-[400px] lg:min-h-0 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 shrink-0 gap-3 flex-wrap">
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-stone-800 flex items-center gap-2"><span className="text-blue-600">✦</span> AI Meeting Minutes</h2>
                <p className="text-xs text-stone-400 mt-0.5 hidden sm:block">Secretary-quality · Powered by Groq + Llama 3.3</p>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap items-center">
                {/* Meeting Type Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowTypeSelector(v => !v)}
                    className="h-8 rounded-xl border border-stone-200 bg-white px-3 text-xs text-stone-600 hover:text-stone-800 hover:bg-stone-50 transition flex items-center gap-1.5"
                  >
                    <span>📋</span>
                    <span className="capitalize">{meetingType === 'standup' ? 'Stand-up' : meetingType === 'retro' ? 'Retro' : meetingType.charAt(0).toUpperCase() + meetingType.slice(1)}</span>
                    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  {showTypeSelector && (
                    <div className="absolute right-0 top-10 z-50 w-44 rounded-xl border border-stone-200 bg-white shadow-lg overflow-hidden">
                      {([
                        { value: 'general', label: '📝 General Meeting' },
                        { value: 'board', label: '🏛️ Board Meeting' },
                        { value: 'standup', label: '⚡ Stand-up' },
                        { value: 'retro', label: '🔄 Retrospective' },
                        { value: 'workshop', label: '🛠️ Workshop' },
                        { value: 'client', label: '🤝 Client Meeting' },
                      ] as const).map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => { setMeetingType(opt.value); setShowTypeSelector(false); setSaved(false); }}
                          className={`w-full text-left px-4 py-2.5 text-xs transition ${meetingType === opt.value
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-stone-600 hover:bg-stone-50 hover:text-stone-800'
                            }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {summaryText && (
                  <>
                    <button onClick={() => { navigator.clipboard.writeText(summaryText); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="h-8 rounded-xl border border-stone-200 bg-white px-3 text-xs text-stone-600 hover:text-stone-800 hover:bg-stone-50 transition inline-flex">
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <button onClick={() => { const b = new Blob([summaryText], { type: "text/markdown" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `minutes_${roomName}.md`; a.click(); URL.revokeObjectURL(u); }}
                      className="h-8 rounded-xl border border-stone-200 bg-white px-3 text-xs text-stone-600 hover:text-stone-800 hover:bg-stone-50 transition">
                      Download .md
                    </button>
                    <button onClick={() => { setSaved(false); void generate(true); }} className="h-8 rounded-xl border border-blue-200 bg-blue-50 px-3 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100 transition inline-flex">
                      Regenerate
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto mt-4 pr-1 min-h-0">
              {isGenerating && !summaryText && (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <div className="relative flex h-10 w-10"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-30" /><span className="relative inline-flex rounded-full h-10 w-10 bg-blue-600 items-center justify-center"><svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></span></div>
                  <p className="text-sm text-stone-500">Writing meeting minutes…</p>
                  <p className="text-xs text-stone-400">This may take 15–30 seconds</p>
                </div>
              )}
              {error && !isGenerating && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                  <p className="text-sm text-red-600">{error}</p>
                  <button onClick={() => void generate(true)} className="mt-3 h-8 rounded-xl bg-red-600 px-4 text-xs font-medium text-white hover:bg-red-700 transition">Retry</button>
                </div>
              )}
              {summaryText && <MarkdownRenderer text={summaryText} />}
            </div>
          </section>

          <aside className="flex flex-col gap-4 lg:w-64 shrink-0">
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">Meeting info</h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between gap-2"><span className="text-stone-400">Transcript blocks</span><span className="text-stone-700 font-mono">{captions.length}</span></div>
                <div className="flex justify-between gap-2"><span className="text-stone-400">Saved</span><span className={captions.length && meetingId ? "text-emerald-600" : "text-stone-400"}>{captions.length && meetingId ? "Yes" : "No"}</span></div>
                <div className="flex justify-between gap-2"><span className="text-stone-400">Date</span><span className="text-stone-700">{new Date().toLocaleDateString()}</span></div>
                <div className="flex justify-between gap-2"><span className="text-stone-400">Role</span><span className="text-stone-700">{isHost ? "Host" : "Participant"}</span></div>
              </div>
            </div>
            <div className="flex-1 min-h-[200px] rounded-2xl border border-stone-200 bg-white p-5 flex flex-col shadow-sm">
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 shrink-0">Raw Transcript</h3>
              <div className="flex-1 overflow-y-auto min-h-0 space-y-2 text-xs">
                {captions.map((c, i) => {
                  const col = c.indexOf(":");
                  const spk = col !== -1 ? c.substring(0, col).trim() : "?";
                  const txt = col !== -1 ? c.substring(col + 1).trim() : c;
                  return <div key={i}><div className="text-blue-600 font-medium">{spk}</div><div className="rounded-lg border border-stone-100 bg-stone-50 p-2 text-stone-600 mt-0.5 leading-relaxed">{txt}</div></div>;
                })}
                {!captions.length && <p className="text-stone-400 text-center py-4">Nothing transcribed.</p>}
              </div>
            </div>
          </aside>
        </main>
      </div>
    </div>
  );
}

/* ─── Supabase meeting helper ────────────────────────────────────────────── */
async function ensureMeeting(roomName: string, hostIdentity: string, title?: string, meetingType?: string, initialAgenda?: string): Promise<string | null> {
  try {
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr) console.warn("ensureMeeting getUser error:", userErr);
    const hostId = user?.id ?? null;

    const { data: existing } = await supabase
      .from("meetings")
      .select("id, host_id, settings")
      .eq("room_name", roomName)
      .maybeSingle();

    if (existing?.id) {
      const currentSettings = (existing.settings ?? {}) as Record<string, unknown>;
      await supabase.from("meetings").update({
        is_active: true,
        host_id: existing.host_id ?? hostId,
        title: title?.trim() || roomName,
        settings: { ...currentSettings, meeting_type: meetingType || currentSettings.meeting_type || "general", host_identity: hostIdentity },
      }).eq("id", existing.id);
      return existing.id;
    }

    const { data: created, error } = await supabase
      .from("meetings")
      .insert({
        room_name: roomName,
        title: title?.trim() || roomName,
        host_id: hostId,
        is_active: true,
        settings: { meeting_type: meetingType || "general", host_identity: hostIdentity, mute_on_entry: false, screen_share_disabled: false },
      })
      .select("id")
      .single();

    if (error) { console.warn("Meeting create error:", error); return null; }
    return created?.id ?? null;
  } catch (e) {
    console.warn("ensureMeeting failed:", e);
    return null;
  }
}

/* ─── Error Boundary Component ───────────────────────────────────────────── */
class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback?: React.ReactNode }> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center">
          <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="font-semibold text-stone-800">Something went wrong</p>
            <p className="mt-2 text-sm text-stone-500">{this.state.error?.message || "Unknown error"}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 h-10 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 transition"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─── Main export ────────────────────────────────────────────────────────── */
function formatLiveKitConnectionError(error: Error) {
  const message = error.message || "LiveKit connection failed.";
  if (/401|unauthori[sz]ed|authorization|not allowed|invalid token|permission/i.test(message)) {
    return "LiveKit rejected the join token. Check that LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET all belong to the same LiveKit Cloud project.";
  }
  return message;
}

export function LiveMeetingRoom({ roomName, identity, title = "Meeting", startWithMic = true, startWithCamera = false, meetingType = "general", initialAgenda }: LiveMeetingRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasJoinedRoomRef = useRef(false);
  const toastTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const [tokenData, setTokenData] = useState<TokenResponse | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
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
  const [focusedIdentity, setFocusedIdentity] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [dmMessages, setDmMessages] = useState<Record<string, DMMessage[]>>({});
  const [dmTarget, setDmTarget] = useState<string | null>(null);
  const [meetingEndedByHost, setMeetingEndedByHost] = useState(false);
  const [resolvedIsHost, setResolvedIsHost] = useState<boolean | null>(null);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>(() => agendaItemsFromTitles(parseAgendaText(initialAgenda), "local-initial"));
  const [agendaSummaryStatus, setAgendaSummaryStatus] = useState<Record<string, "generating" | "error">>({});
  const seededAgendaRef = useRef(false);

  /* Host determination */
  useEffect(() => {
    async function determineHost() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setResolvedIsHost(false);
          return;
        }

        const { data: meeting } = await supabase
          .from("meetings")
          .select("id, host_id")
          .eq("room_name", roomName)
          .maybeSingle();

        if (!meeting) {
          // No meeting exists yet. This user is starting it, so they are the host.
          setResolvedIsHost(true);
        } else {
          setResolvedIsHost(meeting.host_id === user.id);
        }
      } catch (e) {
        console.error("Failed to determine host:", e);
        setResolvedIsHost(false);
      }
    }
    void determineHost();
  }, [roomName]);

  const recordParticipantJoin = useCallback(async (mId: string, isH: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const display = identityToDisplay(identity);

      // Check if participant already recorded for this meeting
      const { data: existing } = await supabase
        .from("meeting_participants")
        .select("id")
        .eq("meeting_id", mId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from("meeting_participants").insert({
          meeting_id: mId,
          user_id: user.id,
          display_name: display,
          is_host: isH
        });
      }
    } catch (e) {
      console.warn("Failed to record participant join:", e);
    }
  }, [identity]);

  const addToast = useCallback((t: Omit<ToastItem, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev.slice(-4), { ...t, id }]);
    const timer = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
      toastTimersRef.current.delete(id);
    }, 4500);
    toastTimersRef.current.set(id, timer);
  }, []);

  // Cleanup toast timers on unmount
  useEffect(() => {
    return () => {
      toastTimersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) { clearTimeout(timer); toastTimersRef.current.delete(id); }
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const handleDMReceived = useCallback((from: string, text: string, timestamp: number) => {
    setDmMessages((prev) => ({
      ...prev,
      [from]: [...(prev[from] ?? []), { from, text, timestamp }],
    }));
  }, []);

  /* Fullscreen */
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  }, []);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", h);
    return () => document.removeEventListener("fullscreenchange", h);
  }, []);

  /* Auto-hide controls */
  const revealControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 4000);
  }, []);

  useEffect(() => { revealControls(); return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current); }; }, []);

  /* Meeting sync */
  useEffect(() => {
    const initialTitles = parseAgendaText(initialAgenda);
    if (!initialTitles.length) return;
    setAgendaItems((items) => items.length ? items : agendaItemsFromTitles(initialTitles, "local-initial"));
  }, [initialAgenda]);

  useEffect(() => {
    void ensureMeeting(roomName, identity, title, meetingType, initialAgenda).then((mId) => {
      setMeetingId(mId);
      if (mId && hasJoinedRoomRef.current) {
        void recordParticipantJoin(mId, resolvedIsHost ?? false);
      }
    });
  }, [roomName, identity, title, meetingType, initialAgenda, resolvedIsHost, recordParticipantJoin]);

  useEffect(() => {
    if (!meetingId) return;
    seededAgendaRef.current = false;

    async function loadAgenda() {
      const { data, error } = await supabase
        .from("meeting_agenda_items")
        .select("id, title, position, is_completed, decision_summary, decided_by")
        .eq("meeting_id", meetingId)
        .order("position", { ascending: true });

      if (error) {
        console.warn("Agenda load error:", error);
      }

      if (data?.length) {
        setAgendaItems(data as AgendaItem[]);
        return;
      }

      const { data: meeting, error: meetingError } = await supabase
        .from("meetings")
        .select("agenda")
        .eq("id", meetingId)
        .maybeSingle();

      if (meetingError) console.warn("Meeting agenda fallback error:", meetingError);

      const initialTitles = parseAgendaText(initialAgenda);
      const fallbackTitles = initialTitles.length
        ? initialTitles
        : parseAgendaText(meeting?.agenda);

      if (!fallbackTitles.length) {
        setAgendaItems([]);
        return;
      }

      setAgendaItems(agendaItemsFromTitles(fallbackTitles, `local-${meetingId}`));

      if (seededAgendaRef.current) return;
      seededAgendaRef.current = true;

      const { data: inserted, error: insertError } = await supabase
        .from("meeting_agenda_items")
        .insert(fallbackTitles.map((item, index) => ({
          meeting_id: meetingId,
          title: item,
          position: index + 1,
        })))
        .select("id, title, position, is_completed, decision_summary, decided_by")
        .order("position", { ascending: true });

      if (insertError) {
        console.warn("Agenda fallback seed error:", insertError);
        return;
      }
      if (inserted?.length) {
        setAgendaItems((current) => (inserted as AgendaItem[]).map((row) => {
          const localMatch = current.find((item) => item.title === row.title && item.id.startsWith("local-"));
          return localMatch
            ? {
              ...row,
              is_completed: row.is_completed || localMatch.is_completed,
              decision_summary: row.decision_summary || localMatch.decision_summary,
            }
            : row;
        }));
      }
    }

    void loadAgenda();
    const channel = supabase
      .channel(`meeting-agenda-${meetingId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "meeting_agenda_items", filter: `meeting_id=eq.${meetingId}` },
        () => void loadAgenda()
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [meetingId, initialAgenda]);

  const updateAgendaItem = useCallback((id: string, patch: Partial<Pick<AgendaItem, "is_completed" | "decision_summary">>) => {
    const togglesCompletion = Object.prototype.hasOwnProperty.call(patch, "is_completed");
    if (togglesCompletion && !(resolvedIsHost ?? false)) return;

    const currentItem = agendaItems.find((item) => item.id === id);
    setAgendaItems((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));

    if (!id.startsWith("local-")) {
      void supabase.from("meeting_agenda_items").update(patch).eq("id", id);
    }

    if (!togglesCompletion || !patch.is_completed || !currentItem) return;
    if ((patch.decision_summary ?? currentItem.decision_summary ?? "").trim()) return;

    setAgendaSummaryStatus((prev) => ({ ...prev, [id]: "generating" }));

    void (async () => {
      try {
        let transcriptLines = captions;
        if (meetingId) {
          const { data: dbTranscripts, error } = await supabase
            .from("transcripts")
            .select("speaker_name, transcript_text")
            .eq("meeting_id", meetingId)
            .order("created_at", { ascending: true });

          if (error) console.warn("Agenda summary transcript load error:", error);
          if (dbTranscripts?.length) {
            transcriptLines = dbTranscripts.map((line) => `${line.speaker_name}: ${line.transcript_text}`);
          }
        }

        const response = await fetch("/api/agenda-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agendaTitle: currentItem.title,
            transcript: transcriptLines,
            meetingContext: { meetingType },
          }),
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || `Agenda summary failed with status ${response.status}`);
        }

        const { summary } = (await response.json()) as { summary?: string };
        const decision_summary = summary?.trim() || "No relevant participant discussion was captured.";
        setAgendaItems((items) => items.map((item) => item.id === id ? { ...item, decision_summary } : item));
        if (!id.startsWith("local-")) {
          await supabase.from("meeting_agenda_items").update({ decision_summary }).eq("id", id);
        }
        setAgendaSummaryStatus((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } catch (error) {
        console.warn("Agenda summary generation failed:", error);
        setAgendaSummaryStatus((prev) => ({ ...prev, [id]: "error" }));
      }
    })();
  }, [agendaItems, captions, meetingId, meetingType, resolvedIsHost]);

  /* DM sender */
  const [dmLocalParticipant, setDmLocalParticipant] = useState<any>(null);
  const sendDM = useCallback((to: string, text: string) => {
    if (!dmLocalParticipant) return;
    const payload = JSON.stringify({ type: "dm", from: dmLocalParticipant.identity, to, text, timestamp: Date.now() });
    try { void dmLocalParticipant.publishData(new TextEncoder().encode(payload), { reliable: true, topic: "dm" }); }
    catch { /* ignore */ }
    setDmMessages((prev) => ({
      ...prev,
      [to]: [...(prev[to] ?? []), { from: dmLocalParticipant.identity, text, timestamp: Date.now() }],
    }));
  }, [dmLocalParticipant]);

  /* Host end meeting */
  const endMeeting = useCallback(async () => {
    if (!(resolvedIsHost ?? false) || !dmLocalParticipant) return;

    // Update meeting status in Supabase
    if (meetingId) {
      await supabase
        .from("meetings")
        .update({
          is_active: false,
          ended_at: new Date().toISOString()
        })
        .eq("id", meetingId);
    }

    // Broadcast end meeting to all participants
    const payload = JSON.stringify({ type: "end-meeting", from: identity, timestamp: Date.now() });
    try { void dmLocalParticipant.publishData(new TextEncoder().encode(payload), { reliable: true, topic: "meeting-control" }); }
    catch { /* ignore */ }
    setShowSummary(true);
  }, [resolvedIsHost, dmLocalParticipant, identity, meetingId]);

  const handleLeave = useCallback(() => {
    if (resolvedIsHost ?? false) {
      void endMeeting();
    } else {
      setShowSummary(true);
    }
  }, [resolvedIsHost, endMeeting]);

  const handleLiveKitConnected = useCallback(() => {
    hasJoinedRoomRef.current = true;
    setConnectionError(null);
    if (meetingId) {
      void recordParticipantJoin(meetingId, resolvedIsHost ?? false);
    }
  }, [meetingId, resolvedIsHost, recordParticipantJoin]);

  const handleLiveKitDisconnected = useCallback(() => {
    if (hasJoinedRoomRef.current) setShowSummary(true);
  }, []);

  const handleLiveKitError = useCallback((error: Error) => {
    const message = formatLiveKitConnectionError(error);
    if (!hasJoinedRoomRef.current) {
      setConnectionError(message);
      return;
    }
    addToast({ type: "error", title: "LiveKit connection issue", body: message });
  }, [addToast]);

  // Listen for host ending meeting
  useEffect(() => {
    if ((resolvedIsHost ?? false) || !dmLocalParticipant) return;
    const room = dmLocalParticipant.room;
    if (!room) return;

    const handler = (payload: Uint8Array) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === "end-meeting" && data.from !== identity) {
          setMeetingEndedByHost(true);
          addToast({ type: "info", title: "Meeting ended by host", body: "The host has ended the meeting." });
          setTimeout(() => setShowSummary(true), 3000);
        }
      } catch { /* ignore */ }
    };

    room.on(RoomEvent.DataReceived, handler);
    return () => { room.off(RoomEvent.DataReceived, handler); };
  }, [resolvedIsHost, dmLocalParticipant, identity, addToast]);

  /* Token fetch */
  useEffect(() => {
    const controller = new AbortController();
    hasJoinedRoomRef.current = false;
    setTokenData(null);
    setTokenError(null);
    setConnectionError(null);
    fetch(`/api/livekit/token?room=${encodeURIComponent(roomName)}&identity=${encodeURIComponent(identity)}&host=${resolvedIsHost ? "1" : "0"}`, { signal: controller.signal })
      .then((res) => { if (!res.ok) throw new Error("Could not get token"); return res.json(); })
      .then((d) => setTokenData(d as TokenResponse))
      .catch((e) => { if (e?.name !== "AbortError") setTokenError(e instanceof Error ? e.message : String(e)); });
    return () => controller.abort();
  }, [identity, roomName, resolvedIsHost]);

  const speechRecognitionAvailable = typeof window !== "undefined" && Boolean((window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition);

  if (showSummary) return (
    <MeetingSummaryDashboard
      captions={captions}
      roomName={roomName}
      meetingId={meetingId}
      isHost={resolvedIsHost ?? false}
      initialMeetingType={meetingType}
      onClose={() => { window.location.href = "/meeting"; }}
    />
  );

  if ((resolvedIsHost === null || !tokenData) && !tokenError && !connectionError) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative flex h-12 w-12 mx-auto"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-30" /><span className="relative inline-flex h-12 w-12 rounded-full bg-blue-600 items-center justify-center"><svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></span></div>
          <p className="text-sm text-stone-500">Connecting…</p>
        </div>
      </div>
    );
  }

  if (tokenError || connectionError || !tokenData) {
    return (
      <div className="min-h-screen bg-stone-50 text-stone-800 flex items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
          <p className="font-semibold">Unable to join</p>
          <p className="mt-2 text-sm text-stone-600">{tokenError ?? connectionError ?? "No session returned."}</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div ref={containerRef} className="h-[100dvh] w-full bg-[#111111]" onMouseMove={revealControls} onTouchStart={revealControls}>
        <LiveKitRoom
          serverUrl={tokenData.url}
          token={tokenData.token}
          audio={startWithMic ? { autoGainControl: true, echoCancellation: true, noiseSuppression: true } : false}
          video={startWithCamera ? { facingMode: "user" } : false}
          connect
          onConnected={handleLiveKitConnected}
          onDisconnected={handleLiveKitDisconnected}
          onError={handleLiveKitError}
          onMediaDeviceFailure={(failure, kind) => {
            const label = kind === "videoinput" ? "camera" : kind === "audioinput" ? "microphone" : "device";
            setDeviceError(`Could not access your ${label}. ${(failure as any)?.message ?? ""}`);
          }}
        >
          <LocalParticipantCapture onReady={setDmLocalParticipant} />

          <NotificationSystem onToast={addToast} onDMReceived={handleDMReceived} localIdentity={identity} isHost={resolvedIsHost ?? false} />
          <ChatToastListener activePanel={activePanel} onToast={addToast} />
          <RoomTranscriptionController
            sttDisabled={STT_DISABLED} sttLang={DEFAULT_STT_LANG} sttChunkMs={DEFAULT_STT_CHUNK_MS}
            speechRecognitionAvailable={speechRecognitionAvailable} sttProviderOrder={DEFAULT_STT_ORDER}
            onCaptionsChange={setCaptions} onInterimChange={setInterimCaption}
            onErrorChange={setCaptionError} meetingId={meetingId}
          />

          <MeetingLayout
            controlsVisible={controlsVisible}
            header={<MeetingHeader title={title} />}
            onCloseSidebar={() => setActivePanel(null)}
            sidebar={activePanel ? (
              <SidePanel
                activePanel={activePanel}
                onClose={() => setActivePanel(null)}
                captions={captions} interimCaption={interimCaption} captionError={captionError}
                speechRecognitionAvailable={speechRecognitionAvailable} providerOrder={DEFAULT_STT_ORDER}
                meetingId={meetingId} dmTarget={dmTarget} dmMessages={dmMessages}
                onSendDM={sendDM}
                onDMParticipant={(id) => { setDmTarget(id); setActivePanel("chat"); }}
                agendaItems={agendaItems}
                isHost={resolvedIsHost ?? false}
                summaryStatus={agendaSummaryStatus}
                onUpdateAgendaItem={updateAgendaItem}
              />
            ) : undefined}
            controls={
              <MeetingControls
                activePanel={activePanel}
                onTogglePanel={(p) => { setActivePanel((c) => c === p ? null : p); if (p !== "chat") setDmTarget(null); }}
                onDeviceError={(e) => setDeviceError(e?.message ?? null)}
                isFullscreen={isFullscreen} onToggleFullscreen={toggleFullscreen}
                viewMode={viewMode} onToggleView={() => { setViewMode((v) => v === "grid" ? "speaker" : "grid"); setFocusedIdentity(null); }}
                isHost={resolvedIsHost ?? false}
                onEndMeeting={endMeeting}
                onLeave={handleLeave}
              />
            }
          >
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            {deviceError && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-sm px-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 shadow-lg p-4 flex gap-3 items-start">
                  <span className="text-amber-600 mt-0.5 shrink-0">⚠</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-amber-800">Device issue</p>
                    <p className="mt-0.5 text-xs text-amber-700 leading-relaxed">{deviceError}</p>
                  </div>
                  <button type="button" onClick={() => setDeviceError(null)} className="text-amber-600 hover:text-amber-800 transition">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                  </button>
                </div>
              </div>
            )}

            {meetingEndedByHost && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 w-full max-w-sm px-4">
                <div className="rounded-2xl border border-blue-200 bg-blue-50 shadow-lg p-4 flex gap-3 items-start">
                  <span className="text-blue-600 mt-0.5 shrink-0">📢</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-blue-800">Meeting ended by host</p>
                    <p className="mt-0.5 text-xs text-blue-700">Redirecting to summary…</p>
                  </div>
                </div>
              </div>
            )}

            <MeetingStage
              viewMode={viewMode}
              focusedIdentity={focusedIdentity}
              onTileClick={(id) => {
                setFocusedIdentity((c) => {
                  const next = c === id ? null : id;
                  if (next) setViewMode("speaker");
                  return next;
                });
              }}
            />
          </MeetingLayout>
        </LiveKitRoom>
      </div>
    </ErrorBoundary>
  );
}

/* Helper: capture localParticipant ref outside LiveKitRoom context */
function LocalParticipantCapture({ onReady }: { onReady: (p: any) => void }) {
  const { localParticipant } = useLocalParticipant();
  useEffect(() => { if (localParticipant) onReady(localParticipant); }, [localParticipant, onReady]);
  return null;
}
