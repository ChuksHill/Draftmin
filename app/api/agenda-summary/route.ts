import { NextResponse } from "next/server";

type AgendaSummaryRequest = {
  agendaTitle?: string;
  transcript?: string[];
  meetingContext?: { meetingType?: string };
};

async function requestSummary(messages: { role: "system" | "user"; content: string }[]) {
  const callGroq = async () => {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages,
        temperature: 0.2,
        max_tokens: 280,
      }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const err = new Error(text || `Groq API responded with status ${response.status}`);
      (err as Error & { status?: number }).status = response.status;
      throw err;
    }
    const data = await response.json();
    return String(data.choices?.[0]?.message?.content ?? "").trim();
  };

  const callOpenAI = async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
    const model = (process.env.OPENAI_SUMMARY_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 280 }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || `OpenAI API responded with status ${response.status}`);
    }
    const data = await response.json();
    return String(data.choices?.[0]?.message?.content ?? "").trim();
  };

  if (process.env.GROQ_API_KEY?.trim()) {
    try {
      return await callGroq();
    } catch (err) {
      console.warn("Groq agenda summary failed, falling back to OpenAI:", err);
    }
  }
  return callOpenAI();
}

export async function POST(request: Request) {
  try {
    const { agendaTitle, transcript, meetingContext } = (await request.json()) as AgendaSummaryRequest;
    const title = agendaTitle?.trim();
    const lines = transcript?.map((line) => line.trim()).filter(Boolean) ?? [];

    if (!title) return NextResponse.json({ error: "Agenda title is required." }, { status: 400 });
    if (!lines.length) {
      return NextResponse.json({
        summary: "No participant discussion was captured for this agenda item.",
      });
    }

    const messages = [
      {
        role: "system" as const,
        content: "You summarize live meeting discussion for a single agenda item. Use only the transcript. Be concise, factual, and attribute participant points when names are present.",
      },
      {
        role: "user" as const,
        content: `Agenda item: ${title}
Meeting type: ${meetingContext?.meetingType || "general"}

Transcript:
${lines.join("\n")}

Write 2-4 short sentences summarizing what participants said about this agenda item. If the transcript does not contain relevant discussion, say that no relevant participant discussion was captured.`,
      },
    ];

    const summary = await requestSummary(messages);
    return NextResponse.json({ summary: summary || "No relevant participant discussion was captured." });
  } catch (error) {
    console.error("Agenda summary generation failed:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
