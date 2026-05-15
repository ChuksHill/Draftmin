import { LiveMeetingRoom } from "@/shared/components/meeting/LiveMeetingRoom";

export const metadata = {
  title: "Meeting - Draftmin",
};

export default function MeetingRoomPage({
  params,
  searchParams,
}: {
  params: { room: string };
  searchParams: { identity?: string; name?: string; mic?: string; cam?: string };
}) {
  const identity = searchParams.identity ?? `guest-${params.room}`;
  const title = searchParams.name ? `${searchParams.name} • Draftmin` : "Draftmin Meeting";

  return (
    <LiveMeetingRoom
      key={`${params.room}:${identity}`}
      roomName={params.room}
      identity={identity}
      title={title}
      startWithMic={searchParams.mic !== "0"}
      startWithCamera={searchParams.cam === "1"}
    />
  );
}

