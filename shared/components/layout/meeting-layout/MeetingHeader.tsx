"use client";

import { useEffect, useState } from "react";
import {
  useConnectionQualityIndicator,
  useConnectionState,
  useParticipants,
  useRoomContext,
} from "@livekit/components-react";

type MeetingHeaderProps = {
  title?: string;
};

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function MeetingHeader({ title = "Draftmin Meeting" }: MeetingHeaderProps) {
  const room = useRoomContext();
  const connectionState = useConnectionState(room);
  const { quality } = useConnectionQualityIndicator({ participant: room.localParticipant });
  const participants = useParticipants({ room });

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);

    return () => clearInterval(id);
  }, []);

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const connectionLabel = String(connectionState);
  const isConnected = connectionLabel.toLowerCase().includes("connected");

  return (
    <div className="flex w-full items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="truncate text-sm font-semibold text-white">{title}</div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-white/60 min-w-0">
            <span className="h-1 w-1 rounded-full bg-white/40" />
            <span className="truncate">{room.name}</span>
          </div>
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-xs text-white/60">
          <span className="inline-flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-400" : "bg-amber-400"}`} />
            <span className="capitalize">{connectionLabel}</span>
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline">Quality: {String(quality).toLowerCase()}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-white/70">
        <button
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 hover:bg-white/10 active:scale-95 transition"
        >
          {copied ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002-2h2a2 2 0 002 2m0 0h2a2 2 0 012 2v3m-6 4H8m4 4H8m8-8h-2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <span>Copy Link</span>
            </>
          )}
        </button>
        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
          {formatDuration(elapsedSeconds)}
        </div>
        <div className="hidden sm:block rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
          {participants.length} participants
        </div>
      </div>
    </div>
  );
}
