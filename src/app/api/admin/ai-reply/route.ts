import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const { name, email, subject, message } = await req.json();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 503 });
  }

  const db = supabaseAdmin as any;

  // Pull active knowledge base
  const { data: kb } = await db.from("knowledge_base").select("title, content, category").eq("active", true);
  const kbText = (kb || []).map((k: any) => `### ${k.title}\n${k.content}`).join("\n\n");

  const systemPrompt = `You are a friendly, professional customer support agent for Tequila Fest USA, a national tequila festival touring 4 cities in 2026 (Cincinnati, Cleveland, Columbus, Phoenix).

Your job is to draft a helpful, warm reply to a customer support message. Be concise, friendly, and on-brand. Sign off as "The Tequila Fest USA Team".

Use the following knowledge base to answer accurately:

${kbText}

Guidelines:
- Keep replies under 150 words unless more detail is genuinely needed
- Always be warm and positive — this is a fun event brand
- If you don't know the specific answer, acknowledge and say the team will follow up
- Never make up ticket prices, dates, or policies not in the knowledge base
- Format as plain text (no markdown)`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Customer: ${name} <${email}>\nSubject: ${subject}\n\nMessage:\n${message}\n\nWrite a helpful reply:` },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content || "";
    return NextResponse.json({ reply });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "AI request failed" }, { status: 500 });
  }
}
