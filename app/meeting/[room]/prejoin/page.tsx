import { redirect } from "next/navigation";

export default async function MeetingPreJoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ room: string }>;
  searchParams: Promise<{ title?: string; type?: string; agenda?: string; host?: string; name?: string; mic?: string; cam?: string }>;
}) {
  const { room } = await params;
  const sp = await searchParams;

  // Build redirect params — pass through whatever was given, default mic/cam to on
  const query = new URLSearchParams();
  if (sp.name) query.set("name", sp.name);
  query.set("mic", sp.mic ?? "1");
  query.set("cam", sp.cam ?? "1");
  if (sp.host) query.set("host", sp.host);
  if (sp.title) query.set("title", sp.title);
  if (sp.type) query.set("type", sp.type);
  if (sp.agenda) query.set("agenda", sp.agenda);

  redirect(`/meeting/${encodeURIComponent(room)}?${query.toString()}`);
}
