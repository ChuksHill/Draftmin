"use client";

import { useEffect, useState } from "react";
import {
  useConnectionQualityIndicator,
  useConnectionState,
  useParticipants,
  useRoomContext,
} from "@livekit/components-react";

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function MeetingHeader({ title = "Meeting" }: { title?: string }) {
  const room = useRoomContext();
  const connectionState = useConnectionState(room);
  const { quality } = useConnectionQualityIndicator({ participant: room.localParticipant });
  const participants = useParticipants({ room });
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setElapsed((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const copyInvite = () => {
    const url = `${window.location.origin}/meeting/${encodeURIComponent(room.name)}/prejoin`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const isConnected = String(connectionState).toLowerCase().includes("connected");
  const qualityColor =
    ["excellent", "good"].includes(String(quality).toLowerCase())
      ? "text-emerald-400"
      : String(quality).toLowerCase() === "poor"
        ? "text-amber-400"
        : "text-white/40";

  return (
    <div className="flex w-full items-center justify-between gap-2 sm:gap-4">
      {/* Left */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 grid place-items-center font-bold text-xs shrink-0">
          D
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-sm font-semibold text-white truncate max-w-[100px] sm:max-w-none">{title}</span>
            <span className="hidden sm:inline text-white/20">·</span>
            <span className="hidden sm:inline text-xs text-white/40 font-mono truncate">{room.name}</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
            <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isConnected ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
            <span className="text-[10px] text-white/40 capitalize hidden xs:inline">{String(connectionState)}</span>
            <span className="hidden sm:inline text-white/10">·</span>
            <span className={`hidden sm:inline text-[10px] capitalize ${qualityColor}`}>{String(quality).toLowerCase()}</span>
          </div>
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* Duration */}
        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-white/5 border border-white/[0.08] px-3 py-1.5 text-xs text-white/50 font-mono tabular-nums">
          {formatDuration(elapsed)}
        </div>

        {/* Participants count */}
        <div className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/[0.08] px-2 sm:px-3 py-1.5 text-xs text-white/50">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          <span aria-label={`${participants.length} participants`}>{participants.length}</span>
        </div>

        {/* Invite — type="button" fix */}
        <button
          type="button"
          onClick={copyInvite}
          className={[
            "flex items-center gap-1.5 rounded-full border px-2 sm:px-3 py-1.5 text-xs font-medium transition",
            copied
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-white/[0.08] bg-white/5 text-white/60 hover:bg-white/10 hover:text-white",
          ].join(" ")}
          aria-label="Copy invite link"
        >
          {copied ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12" /></svg>
              <span className="hidden xs:inline">Copied!</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
              <span className="hidden xs:inline">Invite</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
