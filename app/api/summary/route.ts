import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { transcript } = (await request.json()) as { transcript: string[] };

    if (!transcript || transcript.length === 0) {
      return NextResponse.json(
        { error: "Transcript is empty or missing." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const transcriptText = transcript.join("\n");

    const systemPrompt = `You are Draftmin AI, an expert executive secretary and meeting analyst. Your task is to transform a speaker-attributed raw meeting transcript into highly structured, professional, and action-oriented meeting minutes.

Format your output using clean, elegant Markdown. Do NOT include word-for-word transcripts. Instead, capture:

1. 📅 **Executive Summary**: A concise 2-3 sentence overview of the meeting's purpose, main discussions, and overall sentiment.
2. 🔑 **Key Discussion Points**: Group the main topics discussed. For each topic, summarize the arguments, different perspectives, and consensus. Be specific about who said what if clear from the transcript.
3. 🎯 **Key Decisions Made**: A bulleted list of all formal or informal agreements and decisions reached during the meeting, noting who was involved.
4. 🚀 **Action Items & Next Steps**: A structured checklist of clear, actionable next steps. Every action item must include:
   - **Task**: The specific, actionable task.
   - **Assignee**: The participant responsible (if mentioned, otherwise "Unassigned").
   - **Priority/Timeline**: Priority (High/Medium/Low) or tentative timeline if mentioned.

Maintain an objective, formal, and professional executive tone. Keep the minutes clear, structured, and easy to read.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Here is the speaker-attributed transcript of our meeting:\n\n${transcriptText}\n\nPlease generate the structured meeting minutes.`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Groq API responded with status ${response.status}`);
    }

    const data = await response.json() as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const minutes = data.choices?.[0]?.message?.content;
    if (!minutes) {
      throw new Error("Groq API returned an empty completion response.");
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
