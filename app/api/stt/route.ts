import { NextResponse } from "next/server";

type SttProvider = "deepgram" | "whisper";

function parseProviderOrder(value: string | null | undefined): SttProvider[] {
  if (!value) return [];
  return value
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter((e): e is SttProvider => e === "deepgram" || e === "whisper");
}

function normalizeLang(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const [base] = trimmed.split("-");
  return { raw: trimmed, base: base?.toLowerCase() };
}
function isUsableTranscriptText(text: string) {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed || /^[\s.,!?;:-]+$/.test(trimmed)) return false;

  const normalized = trimmed.toLowerCase();
  const hallucinationMarkers = [
    "use proper punctuation",
    "capitalize names and acronyms",
    "learn more at",
    "please subscribe",
    "subscribe to my channel",
    "subtitles by",
    "amara.org",
    "to be continued",
    "u.s. department of defense",
    "u.s. department of health and human services",
    "u.s. money reserve",
  ];
  if (hallucinationMarkers.some((marker) => normalized.includes(marker))) return false;

  const words = normalized.match(/[a-z0-9']+/g) ?? [];
  if (!words.length) return false;
  if (words.length === 1 && words[0].length <= 2) return false;
  if (words.length > 8 && new Set(words).size / words.length < 0.35) return false;

  return true;
}
function cleanTranscriptText(text: string) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return isUsableTranscriptText(cleaned) ? cleaned : "";
}

async function transcribeWithDeepgram(params: {
  audio: ArrayBuffer;
  contentType: string;
  lang?: string;
}): Promise<string> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) throw new Error("Missing DEEPGRAM_API_KEY");

  const model = process.env.DEEPGRAM_MODEL?.trim() || "nova-3";
  const url = new URL("https://api.deepgram.com/v1/listen");
  url.searchParams.set("model", model);
  url.searchParams.set("smart_format", "true");
  url.searchParams.set("punctuate", "true");
  url.searchParams.set("numerals", "true");
  url.searchParams.set("filler_words", "false");
  url.searchParams.set("utterances", "false");
  if (params.lang) url.searchParams.set("language", params.lang);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": params.contentType,
    },
    body: params.audio,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Deepgram error (${response.status}): ${text || response.statusText}`);
  }

  const data = (await response.json()) as {
    results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string; confidence?: number }> }> };
  };

  const alternative = data.results?.channels?.[0]?.alternatives?.[0];
  const confidence = alternative?.confidence ?? 1;
  const minConfidence = Number.parseFloat(process.env.STT_DEEPGRAM_MIN_CONFIDENCE ?? "0.55");
  if (Number.isFinite(minConfidence) && confidence < minConfidence) return "";

  return cleanTranscriptText(alternative?.transcript ?? "");
}

async function transcribeWithWhisper(params: {
  audio: ArrayBuffer;
  contentType: string;
  langBase?: string;
}): Promise<string> {
  const buildForm = (model: string) => {
    const form = new FormData();
    form.set("model", model);
    form.set("temperature", "0");
    form.set("response_format", "json");
    const prompt = process.env.WHISPER_TRANSCRIPTION_PROMPT?.trim();
    if (prompt) form.set("prompt", prompt);
    if (params.langBase) form.set("language", params.langBase);

    // Whisper relies heavily on the file extension to determine the decoder
    const ext = params.contentType.includes("mp4") ? "m4a" : params.contentType.includes("ogg") ? "ogg" : "webm";
    const file = new File([params.audio], `audio.${ext}`, { type: params.contentType || "audio/webm" });

    form.set("file", file);
    return form;
  };

  // Try Groq first
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const groqModel = process.env.GROQ_WHISPER_MODEL?.trim() || "whisper-large-v3";
      const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}` },
        body: buildForm(groqModel),
      });
      if (res.ok) {
        const data = (await res.json()) as { text?: string };
        return cleanTranscriptText(data.text ?? "");
      }
      console.warn(`Groq Whisper (${res.status}), falling back to OpenAI.`);
    } catch (e) {
      console.warn("Groq Whisper failed:", e);
    }
  }

  // Fallback to OpenAI
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!openAiKey) throw new Error("Missing both GROQ_API_KEY and OPENAI_API_KEY");
  const openAiModel = process.env.OPENAI_WHISPER_MODEL?.trim() || "whisper-1";

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiKey}` },
    body: buildForm(openAiModel),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Whisper error (${res.status}): ${text || res.statusText}`);
  }

  const data = (await res.json()) as { text?: string };
  return cleanTranscriptText(data.text ?? "");
}

export async function POST(request: Request) {
  try {
    if ((process.env.NEXT_PUBLIC_STT_DISABLED ?? "").trim()) {
      return NextResponse.json({ error: "STT disabled" }, { status: 503 });
    }

    const contentTypeHeader = request.headers.get("content-type") ?? "application/octet-stream";
    const contentType = contentTypeHeader.split(";")[0]?.trim() || "application/octet-stream";
    const lang = normalizeLang(request.headers.get("x-stt-lang"));

    const reqProvider = request.headers.get("x-stt-provider")?.trim().toLowerCase();
    const requestedProvider: SttProvider | undefined =
      reqProvider === "deepgram" || reqProvider === "whisper" ? reqProvider : undefined;

    const envOrder = parseProviderOrder(
      process.env.STT_HYBRID_PROVIDER_ORDER || process.env.NEXT_PUBLIC_STT_PROVIDER_ORDER
    );

    const providerOrder: SttProvider[] =
      requestedProvider ? [requestedProvider]
        : envOrder.length > 0 ? envOrder
          : ["deepgram", "whisper"];

    const audio = await request.arrayBuffer();
    if (audio.byteLength === 0) {
      return NextResponse.json({ error: "Empty audio payload" }, { status: 400 });
    }

    const errors: { provider: SttProvider; message: string }[] = [];

    for (const provider of providerOrder) {
      try {
        const text =
          provider === "deepgram"
            ? await transcribeWithDeepgram({ audio, contentType, lang: lang?.raw })
            : await transcribeWithWhisper({ audio, contentType, langBase: lang?.base });
        return NextResponse.json({ provider, text: cleanTranscriptText(text) });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[stt] provider failed: ${provider}`, message);
        errors.push({ provider, message });
      }
    }

    return NextResponse.json({ error: "All STT providers failed", errors }, { status: 502 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
