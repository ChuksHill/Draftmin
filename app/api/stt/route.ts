import { NextResponse } from "next/server";

type SttProvider = "deepgram" | "whisper";

function parseProviderOrder(value: string | null | undefined): SttProvider[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter((entry): entry is SttProvider => entry === "deepgram" || entry === "whisper");
}

function normalizeLang(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  // Providers typically accept BCP-47. Whisper (OpenAI) expects ISO-639-1 in many examples.
  // We keep the raw tag for Deepgram and best-effort map for Whisper.
  const [base] = trimmed.split("-");
  return { raw: trimmed, base: base?.toLowerCase() || undefined };
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
    results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> };
  };

  const transcript = data.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? "";
  return transcript;
}

async function transcribeWithWhisper(params: {
  audio: ArrayBuffer;
  contentType: string;
  langBase?: string;
}): Promise<string> {
  const groqApiKey = process.env.GROQ_API_KEY;
  if (groqApiKey) {
    try {
      const model = "whisper-large-v3";
      const form = new FormData();
      form.set("model", model);
      form.set("temperature", "0");
      form.set("response_format", "json");
      if (params.langBase) form.set("language", params.langBase);

      const file = new File([params.audio], "audio.webm", { type: params.contentType || "audio/webm" });
      form.set("file", file);

      const response = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: form,
      });

      if (response.ok) {
        const data = (await response.json()) as { text?: string };
        return data.text?.trim() ?? "";
      }
      
      const errorText = await response.text().catch(() => "");
      console.warn(`Groq Whisper error (${response.status}): ${errorText}. Falling back to OpenAI Whisper.`);
    } catch (e) {
      console.warn("Groq Whisper failed, falling back to OpenAI:", e);
    }
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing both GROQ_API_KEY and OPENAI_API_KEY");

  const model = process.env.OPENAI_WHISPER_MODEL?.trim() || "whisper-1";

  const form = new FormData();
  form.set("model", model);
  form.set("temperature", "0");
  form.set("response_format", "json");
  if (params.langBase) form.set("language", params.langBase);

  const file = new File([params.audio], "audio.webm", { type: params.contentType || "audio/webm" });
  form.set("file", file);

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Whisper error (${response.status}): ${text || response.statusText}`);
  }

  const data = (await response.json()) as { text?: string };
  return data.text?.trim() ?? "";
}

export async function POST(request: Request) {
  try {
    const disabled = (process.env.NEXT_PUBLIC_STT_DISABLED ?? "").trim();
    if (disabled) {
      return NextResponse.json({ error: "STT disabled" }, { status: 503 });
    }

    const contentTypeHeader = request.headers.get("content-type") ?? "application/octet-stream";
    const contentType = contentTypeHeader.split(";")[0]?.trim() || "application/octet-stream";
    const lang = normalizeLang(request.headers.get("x-stt-lang"));

    const requestedProviderRaw = request.headers.get("x-stt-provider")?.trim().toLowerCase();
    const requestedProvider: SttProvider | undefined =
      requestedProviderRaw === "deepgram" || requestedProviderRaw === "whisper" ? requestedProviderRaw : undefined;
    const requestedOrder = parseProviderOrder(request.headers.get("x-stt-provider-order"));

    const envOrderPrimary = parseProviderOrder(process.env.STT_HYBRID_PROVIDER_ORDER);
    const envOrderFallback = parseProviderOrder(process.env.NEXT_PUBLIC_STT_PROVIDER_ORDER);
    const envOrder = envOrderPrimary.length > 0 ? envOrderPrimary : envOrderFallback;

    const providerOrder: SttProvider[] =
      requestedProvider ? [requestedProvider] : requestedOrder.length > 0 ? requestedOrder : envOrder.length > 0 ? envOrder : ["deepgram", "whisper"];

    const audio = await request.arrayBuffer();
    if (audio.byteLength === 0) {
      return NextResponse.json({ error: "Empty audio payload" }, { status: 400 });
    }

    const errors: Array<{ provider: SttProvider; message: string }> = [];
    for (const provider of providerOrder) {
      try {
        const text =
          provider === "deepgram"
            ? await transcribeWithDeepgram({ audio, contentType, lang: lang?.raw })
            : await transcribeWithWhisper({ audio, contentType, langBase: lang?.base });

        return NextResponse.json({ provider, text });
      } catch (error) {
        errors.push({ provider, message: error instanceof Error ? error.message : String(error) });
      }
    }

    return NextResponse.json(
      {
        error: "All STT providers failed",
        errors,
      },
      { status: 502 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
