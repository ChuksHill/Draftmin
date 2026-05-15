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

  useEffect(() => {
    const id = setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);

    return () => clearInterval(id);
  }, []);

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
