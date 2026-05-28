import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function transcribeWithWhisper(
  audioBuffer: ArrayBuffer,
  contentType: string
) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  // ✅ SAFE BLOB (better than File in Vercel Node)
  const blob = new Blob([audioBuffer], {
    type: contentType || "audio/webm",
  });

  const form = new FormData();
  form.set("model", "whisper-1");

  form.set("file", blob, "audio.webm");

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    }
  );

  const text = await response.text();

  if (!response.ok) {
    // 🔥 IMPORTANT: better debugging
    throw new Error(
      `Whisper failed ${response.status}: ${text}`
    );
  }

  try {
    const data = JSON.parse(text);
    return data.text || "";
  } catch {
    throw new Error("Invalid Whisper response: " + text);
  }
}

export async function POST(request: Request) {
  try {
    const contentType =
      request.headers.get("content-type")?.split(";")[0] ||
      "audio/webm";

    const audio = await request.arrayBuffer();

    console.log("[stt-debug]", {
      size: audio.byteLength,
      contentType,
    });

    // ❗ CRITICAL GUARD (prevents Whisper crashes)
    if (audio.byteLength < 1200) {
      return NextResponse.json(
        { error: "Audio chunk too small" },
        { status: 400 }
      );
    }

    const text = await transcribeWithWhisper(
      audio,
      contentType
    );

    console.log("[stt-result]", text);

    return NextResponse.json({ text });
  } catch (error) {
    console.error("[stt-error]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}