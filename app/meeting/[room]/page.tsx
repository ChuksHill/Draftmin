import { LiveMeetingRoom } from "@/shared/components/meeting/LiveMeetingRoom";
import { AuthGuard } from "@/shared/components/auth/AuthGuard";

export const metadata = { title: "Meeting – Draftmin" };

export default async function MeetingRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ room: string }>;
  searchParams: Promise<{ name?: string; mic?: string; cam?: string; type?: string; title?: string; agenda?: string }>;
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

  return (
    <AuthGuard>
      <LiveMeetingRoom
        key={`${room}-${identity}`}
        roomName={room}
        identity={identity}
        title={`${displayName} • Draftmin`}
        startWithMic={resolvedSearchParams.mic !== "0"}
        startWithCamera={resolvedSearchParams.cam === "1"}
        meetingType={resolvedSearchParams.type || "general"}
        initialAgenda={resolvedSearchParams.agenda}
      />
    </AuthGuard>
  );
}
