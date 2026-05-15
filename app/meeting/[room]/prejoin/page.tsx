import { PreJoinScreen } from "@/shared/components/meeting/PreJoinScreen";

export const metadata = {
  title: "Join meeting - Draftmin",
};

export default function MeetingPreJoinPage({ params }: { params: { room: string } }) {
  return <PreJoinScreen roomName={params.room} />;
}

