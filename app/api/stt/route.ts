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

/* ─── Deepgram ───────────────────────────────────────────────────────────── */
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
  url.searchParams.set("numerals", "true");          // "twenty five" → "25"
  url.searchParams.set("filler_words", "false");      // strip um, uh, er
  url.searchParams.set("disfluencies", "false");      // strip false starts
  url.searchParams.set("profanity_filter", "false");

  // Wait 400 ms of silence before closing an utterance — longer than the 10 ms
  // default. Nigerian English often has natural mid-sentence pauses that the
  // default endpointing cuts short, producing fragmented transcripts.
  url.searchParams.set("endpointing", "400");
  url.searchParams.set("utterance_end_ms", "1200");

  // Deepgram's server-side noise reduction pass
  url.searchParams.set("extra", "noise_reduction:true");

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
    results?: {
      channels?: Array<{
        alternatives?: Array<{ transcript?: string; confidence?: number }>;
      }>;
    };
  };

  const result = data.results?.channels?.[0]?.alternatives?.[0];

  // Reject results where Deepgram itself is not confident — these are almost
  // always background noise that slipped past the VAD filter.
  if (result?.confidence !== undefined && result.confidence < 0.5) {
    return "";
  }

  return result?.transcript?.trim() ?? "";
}

/* ─── Whisper ────────────────────────────────────────────────────────────── */

/**
 * Known Whisper hallucinations — outputs the model produces on silence or
 * very-low-energy audio. Returning empty string for these prevents phantom
 * captions appearing during background noise.
 */
const HALLUCINATIONS = new Set([
  "you", "thank you", "thank you.", "thanks.", "thanks",
  "bye", "bye.", "goodbye", "goodbye.", "see you",
  ".", "..", "...", "okay", "ok", "yes", "no",
  "subtitles by", "transcribed by", "www.", "http",
  "i'll see you", "subscribe", "like and subscribe",
  "i'm sorry", "i'm sorry.", "sorry", "sorry.",
  "hmm", "hmm.", "hm", "hm.",
]);

function isHallucination(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return lower.length < 3 || HALLUCINATIONS.has(lower);
}

async function transcribeWithWhisper(params: {
  audio: ArrayBuffer;
  contentType: string;
  langBase?: string;
}): Promise<string> {
  // Telling Whisper upfront that it's hearing Nigerian English significantly
  // reduces substitution errors — the model adjusts its prior on phoneme
  // sequences to match West African English pronunciation patterns.
  const PROMPT =
    "This is a business meeting conducted in Nigerian English. " +
    "Speakers may use West African English pronunciation, rhythm, and vocabulary. " +
    "Transcribe exactly what is said. Use proper punctuation and capitalisation. " +
    "Do not hallucinate or fill silence with words.";

  const buildForm = (model: string) => {
    const form = new FormData();
    form.set("model", model);
    form.set("temperature", "0");          // deterministic — most accurate
    form.set("response_format", "json");
    form.set("prompt", PROMPT);
    if (params.langBase) form.set("language", params.langBase);
    form.set(
      "file",
      new File([params.audio], "audio.webm", { type: params.contentType || "audio/webm" })
    );
    return form;
  };

  // Try Groq first — faster, free tier, same model
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
        const text = data.text?.trim() ?? "";
        return isHallucination(text) ? "" : text;
      }
      console.warn(`[stt] Groq Whisper ${res.status}, falling back to OpenAI.`);
    } catch (e) {
      console.warn("[stt] Groq Whisper failed:", e);
    }
  }

  // Fallback to OpenAI Whisper
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
  const text = data.text?.trim() ?? "";
  return isHallucination(text) ? "" : text;
}

/* ─── Route handler ──────────────────────────────────────────────────────── */
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

    const reqOrder = parseProviderOrder(request.headers.get("x-stt-provider-order"));
    const envOrder = parseProviderOrder(
      process.env.STT_HYBRID_PROVIDER_ORDER || process.env.NEXT_PUBLIC_STT_PROVIDER_ORDER
    );

    const providerOrder: SttProvider[] =
      requestedProvider ? [requestedProvider]
      : reqOrder.length > 0 ? reqOrder
      : envOrder.length > 0 ? envOrder
      : ["deepgram", "whisper"];

    const audio = await request.arrayBuffer();

    // Skip chunks that are too small — almost certainly silence or noise.
    // 1 000 bytes ≈ 62 ms of 128 kbps audio; real speech at 2.5 s chunks
    // should produce 10–80 KB.
    if (audio.byteLength < 1_000) {
      return NextResponse.json({ provider: "skipped", text: "" });
    }

    const errors: { provider: SttProvider; message: string }[] = [];

    for (const provider of providerOrder) {
      try {
        const text =
          provider === "deepgram"
            ? await transcribeWithDeepgram({ audio, contentType, lang: lang?.raw })
            : await transcribeWithWhisper({ audio, contentType, langBase: lang?.base });
        return NextResponse.json({ provider, text });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[stt] provider failed: ${provider} (${contentType})`, message);
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
