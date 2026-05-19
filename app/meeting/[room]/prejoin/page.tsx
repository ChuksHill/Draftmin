import { PreJoinScreen } from "@/shared/components/meeting/PreJoinScreen";
import { AuthGuard } from "@/shared/components/auth/AuthGuard";

export const metadata = { title: "Join meeting - Draftmin" };

export default async function MeetingPreJoinPage({
  params,
}: {
  params: Promise<{ room: string }>;
}) {
  const { room } = await params;
  return (
    <AuthGuard>
      <PreJoinScreen roomName={room} />
    </AuthGuard>
  );
}