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
1. Write a warm, helpful reply as the Tequila Fest USA support team.
2. **NEVER INVENT FACTS.** Specifically: ticket prices, number of samples/tasting tickets, what's included in a ticket, food vendor names, sampling hours, venue addresses, dates, times, or GA availability MUST come verbatim from the "Source of Truth" Event Details block and "What an All Inclusive ticket includes" section above. If the customer's city isn't named and the answer differs by city, ASK which city instead of guessing.
3. **DO NOT use the word "unlimited"** anywhere in your reply. Tasting tickets are a fixed allotment of 12 per All Inclusive ticket.
4. If this is a password reset request, mention they can reset at https://tequilafestusa.com/forgot-password — and if they never set a password, go to https://tequilafestusa.com/signup instead.
5. If they can't find their tickets or don't see a digital ticket, tell them tickets live in their account at https://tequilafestusa.com/account. If they never created an account, they should sign up at https://tequilafestusa.com/signup using the same email they used to purchase — their tickets will appear automatically.
6. If they ask about transferring a ticket, follow the transfer policy in the Admin Knowledge Base exactly.
7. If they ask about refunds, clearly explain that all sales are final and we do not offer refunds. Be empathetic but firm.
8. Sign off as "The Tequila Fest USA Team".
9. Keep the reply concise and friendly — 2-5 sentences. Don't over-explain.
10. ESCALATE threshold — output the single word ESCALATE (nothing else) if EITHER: (a) the question requires a specific fact you cannot find verbatim in the knowledge base or Event Details above, OR (b) it requires a human judgment call. When in doubt about a SPECIFIC NUMBER, PRICE, INCLUSION, or POLICY, ESCALATE rather than guess.

Examples of what should NOT escalate: "can I transfer my ticket", "where are my tickets", "I can't log in", "can I get a refund", "what's included", "when is the event". These all have answers above.

Note: customers sometimes say "please see attached" but this system does not support attachments — ignore any mention of attachments and answer based on what they wrote in the message text alone.

Respond with ONLY:
- The reply text addressed to the customer, OR
- The single word ESCALATE if you genuinely cannot answer anything`;

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
