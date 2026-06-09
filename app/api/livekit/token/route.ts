import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

function sanitizeRoomName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "draftmin-room";
}

function sanitizeIdentity(identity: string): string {
  return identity
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64) || "guest";
}

export async function GET(request: Request) {
  try {
    const livekitUrl = process.env.LIVEKIT_URL || process.env.LIVEKIT_SERVER_URL;
    const livekitApiKey = process.env.LIVEKIT_API_KEY;
    const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

    if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
      return NextResponse.json(
        { error: "Missing LiveKit environment variables." },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const rawRoom = url.searchParams.get("room") ?? "draftmin-room";
    const rawIdentity = url.searchParams.get("identity") ?? `attendee-${Math.random().toString(36).slice(2, 8)}`;
    const isHost = url.searchParams.get("host") === "1";

    const roomName = sanitizeRoomName(rawRoom);
    const identity = sanitizeIdentity(rawIdentity);

    const accessToken = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity,
      ttl: "4h", // Extended for long meetings
      metadata: JSON.stringify({ 
        isHost: isHost ? "1" : "0",
        displayName: identity 
      }),
    });

    accessToken.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: isHost, // Host gets admin privileges
    });

    const jwt = await accessToken.toJwt();

    return NextResponse.json({
      url: livekitUrl,
      token: jwt,
      room: roomName,
      identity,
      isHost,
    });
  } catch (error) {
    console.error("LiveKit token error:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}