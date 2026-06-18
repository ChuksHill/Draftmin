import { PreJoinScreen } from "@/shared/components/meeting/PreJoinScreen";
import { AuthGuard } from "@/shared/components/auth/AuthGuard";

export const metadata = { title: "Join meeting - Draftmin" };

export default async function MeetingPreJoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ room: string }>;
  searchParams: Promise<{ title?: string; type?: string; agenda?: string }>;
}) {
  const { room } = await params;
  const resolvedSearchParams = await searchParams;
  return (
    <AuthGuard>
      <PreJoinScreen
        roomName={room}
        initialTitle={resolvedSearchParams.title}
        initialMeetingType={resolvedSearchParams.type}
        initialAgenda={resolvedSearchParams.agenda}
      />
    </AuthGuard>
  );
}
