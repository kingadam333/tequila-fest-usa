import OpenAI from "openai";
import { supabaseAdmin } from "@/lib/supabase";
import { EVENTS, PRICING } from "@/lib/events";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// ─── Source-of-truth event details (auto-built from src/lib/events.ts) ──────
function buildEventDetails(): string {
  const rows = EVENTS.map((e) => {
    const parts: string[] = [
      `### ${e.city}, ${e.state} — ${e.date}`,
      `- Venue: ${e.venue} (${e.venueDetail})`,
      `- Address: ${e.venueAddress}`,
      `- Festival hours: ${e.time}`,
      e.samplingHours ? `- Sampling hours: ${e.samplingHours}` : "",
      `- All Inclusive ticket starts at $${e.price}`,
      e.gaTicket ? `- $${e.gaTicket.price} GA Entry available${e.gaTicket.limited ? ` (limited${e.gaTicket.qty ? `, only ${e.gaTicket.qty}` : ""})` : ""}` : "",
      e.foodVendor ? `- Food vendor: ${e.foodVendor.name} — ${e.foodVendor.ticketNote}` : "",
      e.freeParking ? `- Free parking on-site` : "",
    ].filter(Boolean);
    return parts.join("\n");
  }).join("\n\n");
  return rows;
}

// ─── Knowledge Base ────────────────────────────────────────────────────────────
export const KNOWLEDGE_BASE = `
You are the friendly AI support assistant for Tequila Fest USA, a premium tequila tasting festival.

## About Tequila Fest USA
- Official website: tequilafestusa.com
- Support email: help@tequilafestusa.com

## Ticket Types & Pricing (DO NOT invent numbers — these are the only valid ones)
- **All Inclusive (Early Bird / Regular / Late)** — $${PRICING.earlyBird.price} / $${PRICING.regular.price} / $${PRICING.late.price}. Same inclusions, only the purchase price changes by tier.
- **VIP** — $${PRICING.vip.price}. Everything in All Inclusive plus exclusive VIP-only access.
- **GA Entry** — Available at SOME cities only at $5 (see Event Details below). GA Entry is door-entry only — it does NOT include tasting tickets, food, or souvenir.

## What an All Inclusive ticket includes (the SAME at every city)
- **12 tasting tickets** (each redeems for one tequila sample)
- Live music
- Authentic food (specific food vendor varies by city — see Event Details)
- Souvenir item
- Full festival access

Do NOT say "unlimited samples." There is a fixed allotment of 12 tasting tickets per All Inclusive ticket.

## What a GA Entry ticket includes
- Festival entry only. No tasting tickets, no food, no souvenir included.
- Available only at cities listed below as having GA tickets.

## Event Details (source of truth — always answer city-specific questions from this block)
${buildEventDetails()}

## Policies
- Must be 21+ to attend; valid ID required at door
- Tickets are non-refundable
- Tickets are digital QR codes — no physical tickets are mailed
- One QR scan per entry
- No outside alcohol; small bags/purses OK

## Account & Tickets FAQ
- Customers can view tickets at tequilafestusa.com/account
- Login uses the same email address used at checkout
- If they never set a password, they need to go to tequilafestusa.com/signup (NOT forgot-password) — their tickets will automatically pull in when they sign up with the same email
- Forgot password: tequilafestusa.com/forgot-password
- Tickets can be resent from the account dashboard or by support
- Multiple tickets in one order all appear in the account under "My Tickets"

## What Support Can Do
- Look up orders by email
- Resend ticket confirmation emails
- Send password reset links
- Look up event details

## What Support Cannot Do
- Issue refunds (no refund policy)
- Transfer tickets to another name
- Change the event city on a purchased ticket

## Common Questions & Answers
**Q: I didn't get my tickets / confirmation email**
A: Check spam/junk. If not there, log in at tequilafestusa.com/account to view tickets directly. If you can't log in, go to tequilafestusa.com/signup and sign up with the same email you used to purchase — your tickets will appear automatically.

**Q: I forgot my password**
A: Go to tequilafestusa.com/forgot-password. If you bought tickets but never created an account, go to tequilafestusa.com/signup instead and create an account with the same email used at checkout.

**Q: Can I get a refund?**
A: All sales are final. We do not offer refunds. If you cannot attend, we recommend gifting your ticket to a friend (though tickets are non-transferable by policy).

**Q: Can I transfer my ticket to someone else?**
A: Please refer to the Admin Knowledge Base for the current transfer policy.

**Q: Is parking available?**
A: Parking availability varies by venue. We recommend rideshare services like Uber or Lyft.

**Q: What's included with my ticket? / Do I need a ticket to get in?**
A: Yes, a ticket is required for entry. The All Inclusive ticket includes 12 tasting tickets, live music, authentic food, a souvenir, and full festival access. VIP includes everything in All Inclusive plus exclusive VIP-only access. Some cities also offer a $5 GA Entry ticket (door entry only — no tastings, food, or souvenir). For city-specific details (food vendor, sampling hours, GA availability) refer to the Event Details block above.

**Q: How many samples / tasting tickets do I get?**
A: 12 tasting tickets per All Inclusive (or VIP) ticket. Sampling runs 4:00pm – 8:00pm.

**Q: Can I bring a bag / purse?**
A: Small bags and purses are allowed. No outside alcohol permitted.

**Q: What time does the event end?**
A: Events typically run until 9:00 PM. Last pour is usually 30 minutes before close.

**Q: Is there food at the festival?**
A: Yes, local food vendors will be on-site at each event.

**Q: Can I buy tickets at the door?**
A: Subject to availability. We recommend purchasing in advance as events sell out.

**Q: I bought multiple tickets — where are they all?**
A: All tickets from your order appear in your account at tequilafestusa.com/account under "My Tickets."

**Q: How do I become a vendor or sponsor?**
A: Use the contact form at tequilafestusa.com/contact and select "Vendor Application" or "Sponsorship Opportunity."
`;

// ─── AI Response Generator ─────────────────────────────────────────────────────
export interface AIInboxResult {
  confident: boolean;
  reply: string;
  action?: "send_reset_link" | "resend_tickets" | "lookup_order" | null;
  actionEmail?: string;
}

async function fetchDBKnowledge(): Promise<string> {
  try {
    const db = supabaseAdmin as any;
    const { data, error } = await db.from("knowledge_base").select("title, content, category").order("category").order("title");
    if (error) { console.error("KB fetch error:", error); return ""; }
    if (!data?.length) return "";
    const grouped: Record<string, string[]> = {};
    for (const row of data) {
      const cat = row.category || "General";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(`**${row.title}**\n${row.content}`);
    }
    const kb = "\n\n## Admin Knowledge Base (these override defaults above if conflicting)\n" +
      Object.entries(grouped).map(([cat, items]) => `### ${cat}\n${items.join("\n\n")}`).join("\n\n");
    console.log("KB loaded, entries:", data.length);
    return kb;
  } catch (err) {
    console.error("KB fetch exception:", err);
    return "";
  }
}

export async function generateAIReply(
  customerName: string,
  customerEmail: string,
  subject: string,
  message: string,
  orderInfo?: string | null,
): Promise<AIInboxResult> {
  const dbKnowledge = await fetchDBKnowledge();

  const prompt = `${KNOWLEDGE_BASE}${dbKnowledge}

---

A customer has submitted the following support message. Your job is to reply helpfully and accurately.

**Customer Name:** ${customerName}
**Customer Email:** ${customerEmail}
**Subject:** ${subject}
**Message:**
${message}

${orderInfo ? `**Their order history found in our system:**\n${orderInfo}\n` : "No order found for this email in our system.\n"}

Instructions:

PRIME DIRECTIVE — BIAS HEAVILY TOWARD ESCALATION:
We are still building the knowledge base. A wrong auto-reply is much worse than a delayed correct one. When in doubt, output the single word ESCALATE (nothing else). It is EXPECTED and ENCOURAGED to escalate.

ONLY auto-answer if the customer's question is one of these "safe-to-auto-answer" categories AND you can answer it verbatim from the knowledge base or Event Details:
(a) Password reset / can't log in
(b) Can't find tickets / didn't get confirmation email
(c) "Where is my account" / how to access tickets
(d) Refund question (the answer is always: all sales final, no refunds)
(e) 21+ ID requirement
(f) Whether physical tickets are mailed (no — digital QR only)
(g) Direct event date / time / venue / address questions for a SPECIFIC city the customer named, sourced from the Event Details block

EVERYTHING ELSE → ESCALATE. Examples that MUST escalate:
- "What's included" / "Do I need a ticket" / "How many samples" / "What do I get" → ESCALATE (we want to handle these manually for now)
- "Is X brand pouring" / "Will [celebrity/DJ/band] be there"
- Any question about food vendors, parking specifics, accessibility, ADA, kid policy, dress code
- Any question about VIP perks beyond what's in the knowledge base
- Group bookings, buyouts, bottle service, private events
- Sponsorship / vendor / press / affiliate inquiries
- Anything mentioning a specific dollar amount we haven't confirmed
- Anything you'd need to guess a number, name, or policy to answer
- Questions in a language other than English
- Anything emotionally charged (angry, threatening, legal language)

HARD RULES IF YOU DO ANSWER:
1. NEVER INVENT FACTS. Prices, sample counts, inclusions, food vendor names, sampling hours, venue addresses, dates, times, GA availability MUST come verbatim from the Event Details block. If the city isn't named and the answer differs by city, ESCALATE.
2. NEVER use the word "unlimited" anywhere. Tasting tickets are a fixed allotment of 12 per All Inclusive ticket.
3. Password reset → https://tequilafestusa.com/forgot-password (if they never set a password, https://tequilafestusa.com/signup instead).
4. Missing tickets → log in at https://tequilafestusa.com/account. If no account, sign up at https://tequilafestusa.com/signup with the same email used at checkout — tickets pull in automatically.
5. Refunds → all sales final, no refunds. Be empathetic but firm.
6. Ticket transfers → follow the Admin Knowledge Base policy exactly.
7. Sign off as "The Tequila Fest USA Team".
8. Keep replies 2–5 sentences. Don't over-explain.

Examples of what should NOT escalate (safe-to-auto-answer per the categories above):
- "where are my tickets" (account flow)
- "I can't log in" / "forgot password"
- "can I get a refund" (always no)
- "when is the [city] event" (Event Details block)
- "is a ticket required for entry" (yes, with category (g) info)

Examples of what SHOULD escalate (do NOT auto-answer):
- "what's included" / "what do I get" / "how many samples" — we are tightening the answer; escalate so a human handles it for now
- "can I transfer my ticket" — escalate unless the Admin Knowledge Base has a transfer policy
- Any "is X happening" / "will Y be there" question about acts, brands, food specifics
- Anything mentioning sponsorships, vendors, group sales, partnerships, press

Note: customers sometimes say "please see attached" but this system does not support attachments — ignore attachments and answer only from message text.

Respond with ONLY:
- A short reply text (only if the question matches a safe-to-auto-answer category), OR
- The single word ESCALATE — preferred whenever there is any doubt`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  const text = (response.choices[0].message.content || "").trim();
  console.log("AI response (first 200 chars):", text.slice(0, 200));

  if (text.startsWith("ESCALATE")) {
    return { confident: false, reply: text };
  }

  // Safety net: never let a reply about samples/tastings claim "unlimited."
  // If it slips through, force escalation so a human handles it.
  const lower = text.toLowerCase();
  if (/(unlimited|all you can|as many as you want).{0,40}(sample|tasting|pour|drink)/.test(lower) ||
      /(sample|tasting|pour|drink).{0,40}(unlimited|all you can|as many as you want)/.test(lower)) {
    console.error("⚠️  AI tried to claim unlimited samples — escalating instead. Draft was:", text);
    return { confident: false, reply: "ESCALATE — draft mentioned unlimited samples (incorrect; actual is 12 tasting tickets)." };
  }

  // Detect if a specific action should be taken
  const lowerMsg = message.toLowerCase();
  let action: AIInboxResult["action"] = null;
  if (lowerMsg.includes("reset") || lowerMsg.includes("password") || lowerMsg.includes("forgot")) {
    action = "send_reset_link";
  } else if (lowerMsg.includes("resend") || lowerMsg.includes("didn't get") || lowerMsg.includes("not received") || lowerMsg.includes("never got")) {
    action = "resend_tickets";
  }

  return { confident: true, reply: text, action, actionEmail: customerEmail };
}
