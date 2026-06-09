import { LiveMeetingRoom } from "@/shared/components/meeting/LiveMeetingRoom";
import { AuthGuard } from "@/shared/components/auth/AuthGuard";

export const metadata = { title: "Meeting – Draftmin" };

export default async function MeetingRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ room: string }>;
  searchParams: Promise<{ name?: string; mic?: string; cam?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const room = decodeURIComponent(resolvedParams.room);

  // Generate a fresh identity server-side.
  // Never read `identity` from the URL — if someone shares the meeting
  // URL from the browser bar it would carry the host's identity and
  // LiveKit would kick the host the moment the guest connects.
  const displayName = resolvedSearchParams.name?.trim() || "Guest";
  const baseIdentity = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) || "guest";
  const suffix = Math.random().toString(36).slice(2, 8);
  const identity = `${baseIdentity}-${suffix}`;

  // The first person to create/join a room is always the host.
  // Subsequent joiners (via invite link) are participants.
  // Host determination is handled by the token endpoint based on the
  // presence of an existing active meeting in Supabase for this room.
  const isHost = true; // ← all direct joins are hosts; invite link joiners pass ?host=0

  return (
    <AuthGuard>
      <LiveMeetingRoom
        key={`${room}-${identity}`}
        roomName={room}
        identity={identity}
        title={`${displayName} • Draftmin`}
        startWithMic={resolvedSearchParams.mic !== "0"}
        startWithCamera={resolvedSearchParams.cam === "1"}
        isHost={isHost}
      />
    </AuthGuard>
  );
}