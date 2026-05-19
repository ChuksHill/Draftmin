import { LiveMeetingRoom } from "@/shared/components/meeting/LiveMeetingRoom";
import { AuthGuard } from "@/shared/components/auth/AuthGuard";

export const metadata = { title: "Meeting - Draftmin" };

export default async function MeetingRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ room: string }>;
  searchParams: Promise<{ identity?: string; name?: string; mic?: string; cam?: string }>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const room = resolvedParams.room;
  const identity = resolvedSearchParams.identity ?? `guest-${room}-${Math.floor(1000 + Math.random() * 9000)}`;
  const title = resolvedSearchParams.name ? `${resolvedSearchParams.name} • Draftmin` : "Draftmin Meeting";

  return (
    <AuthGuard>
      <LiveMeetingRoom
        key={`${room}:${identity}`}
        roomName={room}
        identity={identity}
        title={title}
        startWithMic={resolvedSearchParams.mic !== "0"}
        startWithCamera={resolvedSearchParams.cam === "1"}
      />
    </AuthGuard>
  );
}