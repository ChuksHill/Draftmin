import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

const LIVEKIT_URL =
  process.env.LIVEKIT_URL || process.env.LIVEKIT_SERVER_URL;

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

export async function GET(request: Request) {
  try {
    if (
      !LIVEKIT_URL ||
      !LIVEKIT_API_KEY ||
      !LIVEKIT_API_SECRET
    ) {
      return NextResponse.json(
        {
          error:
            "Missing LiveKit environment variables.",
        },
        { status: 500 }
      );
    }

    const url = new URL(request.url);

    const roomName =
      url.searchParams.get("room") ??
      "draftmin-room";

    const identity =
      url.searchParams.get("identity") ??
      `attendee-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    const accessToken = new AccessToken(
      LIVEKIT_API_KEY,
      LIVEKIT_API_SECRET,
      {
        identity,
        ttl: "1h",
      }
    );

    accessToken.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
    });

    // ✅ IMPORTANT: await the JWT
    const jwt = await accessToken.toJwt();

    return NextResponse.json({
      url: LIVEKIT_URL,
      token: jwt,
      room: roomName,
      identity,
    });
  } catch (error) {
    console.error("LiveKit token error:", error);

    return NextResponse.json(
      {
        error: "Failed to generate token",
      },
      { status: 500 }
    );
  }
}