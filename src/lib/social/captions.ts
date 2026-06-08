import OpenAI from "openai";
import { EVENTS } from "@/lib/events";

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export type CaptionInput = {
  type: "event" | "brand" | "meme" | "manual";
  city?: string;             // event city slug
  brandName?: string;        // for brand posts
  platform: "facebook" | "instagram" | "both";
  hint?: string;             // optional extra context (e.g., dropbox file name)
  tone?: string;
};

function eventInfo(city?: string) {
  if (!city) return null;
  return EVENTS.find(e => e.slug === city) || null;
}

export async function generateCaption(input: CaptionInput): Promise<string> {
  if (!openai) return fallbackCaption(input);
  const sys = `You write short, punchy social posts for Tequila Fest USA — a multi-city tequila festival. Tone: ${input.tone || "fun, energetic, festival vibes"}. Always include 3-6 relevant hashtags at the end. Keep under 280 characters total. No emojis overload — 1-3 max.`;
  const ev = eventInfo(input.city);
  let user = "";
  if (input.type === "event" && ev) {
    user = `Write a post promoting the Tequila Fest USA stop in ${ev.city} on ${ev.date} at ${ev.venue}. Drive ticket sales. Link will be added separately. Platform: ${input.platform}.`;
  } else if (input.type === "brand") {
    user = `Write a post featuring the tequila brand "${input.brandName || "a featured tequila brand"}". Tie it loosely back to Tequila Fest USA. Platform: ${input.platform}.`;
  } else if (input.type === "meme") {
    user = `Write a short, funny caption to go with a tequila meme image. Keep it light. Tie loosely to Tequila Fest USA. Platform: ${input.platform}.`;
  } else {
    user = `Write a social post for Tequila Fest USA. Hint: ${input.hint || "(no hint)"}. Platform: ${input.platform}.`;
  }
  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.85,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: user },
      ],
    });
    return (resp.choices?.[0]?.message?.content || "").trim() || fallbackCaption(input);
  } catch {
    return fallbackCaption(input);
  }
}

function fallbackCaption(input: CaptionInput): string {
  const ev = eventInfo(input.city);
  if (input.type === "event" && ev) {
    return `🪩 Tequila Fest USA hits ${ev.city} on ${ev.date}! Tickets at tequilafestusa.com #TequilaFestUSA #${ev.city.replace(/\s+/g, "")} #Tequila`;
  }
  if (input.type === "brand") {
    return `Featuring ${input.brandName || "a great tequila"} 🥃 See you at Tequila Fest USA — tequilafestusa.com #TequilaFestUSA #Tequila`;
  }
  if (input.type === "meme") {
    return `Tequila o'clock 🕒🥃 #TequilaFestUSA #TequilaMemes #Tequila`;
  }
  return `Tequila Fest USA — tequilafestusa.com #TequilaFestUSA`;
}
