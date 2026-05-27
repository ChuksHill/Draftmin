import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { transcript } = (await request.json()) as { transcript: string[] };

    if (!transcript?.length) {
      return NextResponse.json({ error: "Transcript is empty or missing." }, { status: 400 });
    }

    const transcriptText = transcript.join("\n");
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });

    const systemPrompt = `You are a highly experienced corporate secretary with 20+ years of writing formal board-level and executive meeting minutes for Fortune 500 companies. You write with precision, authority, and completeness. Every sentence you write could stand in a court of law as an accurate record.

Your minutes must:
- Sound written by a human professional secretary, not an AI
- Use formal past tense ("The team discussed...", "It was agreed that...", "Ms. Smith proposed...")
- Capture the substance of discussions — not just bullet points, but the actual reasoning, positions, and debates
- Include all decisions with clear attribution
- Present action items in a structured table
- Be formatted in clean, professional Markdown`;

    const userPrompt = `Please produce complete, formal meeting minutes from the following transcript.

MEETING DATE: ${dateStr}
MEETING TIME: ${timeStr}

TRANSCRIPT:
${transcriptText}

---

Write the minutes in this exact format:

# MEETING MINUTES

**Date:** ${dateStr}
**Time:** ${timeStr}
**Record Prepared By:** Draftmin AI Secretary
**Status:** Official Record — Pending Approval

---

## 1. ATTENDANCE

*List all speakers identified in the transcript. If a name is unclear, note "Participant [N]". Include any identified roles or titles.*

---

## 2. CALL TO ORDER

*Who opened the meeting, time, purpose, and quorum confirmation if applicable.*

---

## 3. PROCEEDINGS

*For each major topic discussed, write a full paragraph as a professional secretary would — capturing the flow of the discussion, positions taken, concerns raised, and how consensus was reached or deferred. Use sub-headings for each agenda item.*

### 3.1 [First Topic — infer from transcript]

### 3.2 [Second Topic]

*(continue as needed)*

---

## 4. DECISIONS RECORDED

*Numbered list of every formal or informal decision made. Be specific and precise.*

1. 
2.

---

## 5. ACTION ITEMS

| # | Action Required | Owner | Target Date | Priority |
|---|-----------------|-------|-------------|----------|
| 1 | | | | High / Medium / Low |

---

## 6. MATTERS FOR FOLLOW-UP

*Items deferred, tabled, or requiring future discussion.*

---

## 7. ADJOURNMENT

*How and at what time the meeting concluded.*

---

*These minutes constitute an accurate record of the meeting proceedings and are subject to approval at the next meeting.*
*Prepared by Draftmin AI Secretary · ${dateStr}*`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ] as const;

    const callGroq = async () => {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
          messages,
          temperature: 0.2,
          max_tokens: 4000,
        }),
      });

      const text = await response.text().catch(() => "");
      if (!response.ok) {
        const err = new Error(text || `Groq API responded with status ${response.status}`);
        (err as any).status = response.status;
        throw err;
      }

      const data = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
      const minutes = data.choices?.[0]?.message?.content;
      if (!minutes) throw new Error("Groq returned an empty response.");
      return minutes;
    };

    const callOpenAI = async () => {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

      const model = (process.env.OPENAI_SUMMARY_MODEL || process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.2,
          max_tokens: 4000,
        }),
      });

      const text = await response.text().catch(() => "");
      if (!response.ok) {
        const err = new Error(text || `OpenAI API responded with status ${response.status}`);
        (err as any).status = response.status;
        throw err;
      }

      const data = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
      const minutes = data.choices?.[0]?.message?.content;
      if (!minutes) throw new Error("OpenAI returned an empty response.");
      return minutes;
    };

    let minutes: string;
    try {
      minutes = await callGroq();
    } catch (err) {
      const status = (err as any)?.status as number | undefined;
      const groqConfigured = Boolean((process.env.GROQ_API_KEY ?? "").trim());
      if (groqConfigured && status !== 429) throw err;
      minutes = await callOpenAI();
    }

    return NextResponse.json({ minutes });
  } catch (error) {
    console.error("AI Summary generation failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
