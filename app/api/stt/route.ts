import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Whisper accepts these containers. We map whatever the browser sent to the
// closest supported format so the filename extension matches the bytes.
const MIME_TO_EXT: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "mp4",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/aac": "aac",
  "audio/flac": "flac",
};

function resolveExt(contentType: string): string {
  const base = contentType.split(";")[0].trim().toLowerCase();
  return MIME_TO_EXT[base] ?? "webm";
}

async function transcribeWithWhisper(
  audioBuffer: ArrayBuffer,
  contentType: string,
  lang: string
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");

  const ext = resolveExt(contentType);
  const mimeBase = contentType.split(";")[0].trim() || "audio/webm";

  const blob = new Blob([audioBuffer], { type: mimeBase });
  const form = new FormData();
  form.set("model", "whisper-1");
  form.set("language", lang.split("-")[0]); // "en-US" → "en"
  form.set("file", blob, `audio.${ext}`);   // correct extension for Whisper

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`Whisper ${response.status}: ${text}`);

  try {
    const data = JSON.parse(text);
    return (data.text ?? "").trim();
  } catch {
    throw new Error("Invalid Whisper response: " + text);
  }
}

// Known Whisper hallucination patterns on silence/noise — discard these.
const HALLUCINATION_RE =
  /^(thanks? for watching|thank you\.?|you\.?|\.+|\s*)*$/i;

export async function POST(request: Request) {
  try {
    const rawContentType =
      request.headers.get("content-type") ?? "audio/webm";
    const lang =
      request.headers.get("x-stt-lang") ?? "en";

    const audio = await request.arrayBuffer();

    console.log("[stt]", {
      size: audio.byteLength,
      contentType: rawContentType,
      lang,
    });

    // Reject obviously-empty payloads before hitting Whisper
    if (audio.byteLength < 1_000) {
      return NextResponse.json(
        { error: "Audio chunk too small" },
        { status: 400 }
      );
    }

    const text = await transcribeWithWhisper(audio, rawContentType, lang);

    // Filter Whisper hallucinations (silent-chunk artifacts)
    if (!text || HALLUCINATION_RE.test(text)) {
      console.log("[stt] discarded hallucination:", JSON.stringify(text));
      return NextResponse.json({ text: "" });
    }
    
    console.log("[stt] result:", text);
    return NextResponse.json({ text });
  } catch (error) {
    console.error("[stt] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
