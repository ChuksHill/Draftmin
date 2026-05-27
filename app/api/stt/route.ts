import { NextResponse } from "next/server";

async function transcribeWithWhisper(
  audio: ArrayBuffer,
  contentType: string
) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const form = new FormData();

  form.set("model", "whisper-1");

  form.set(
    "file",
    new File(
      [audio],
      "audio.webm",
      {
        type: contentType || "audio/webm",
      }
    )
  );

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

  if (!response.ok) {
    const text = await response.text();

    throw new Error(
      `Whisper failed: ${response.status} ${text}`
    );
  }

  const data = await response.json();

  return data.text || "";
}

export async function POST(request: Request) {
  try {
    const contentTypeHeader =
      request.headers.get("content-type") ??
      "audio/webm";

    const contentType =
      contentTypeHeader.split(";")[0];

    const audio = await request.arrayBuffer();

    console.log("[stt-debug]", {
      size: audio.byteLength,
      contentType,
    });

    // IMPORTANT:
    // DO NOT FILTER ANYTHING YET

    const text = await transcribeWithWhisper(
      audio,
      contentType
    );

    console.log("[stt-result]", text);

    return NextResponse.json({
      text,
    });
  } catch (error) {
    console.error("[stt-error]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      {
        status: 500,
      }
    );
  }
}