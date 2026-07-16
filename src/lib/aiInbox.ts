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

export async function fetchDBKnowledge(): Promise<string> {
  try {
    const db = supabaseAdmin as any;
    // Treat active=null (older rows, before the column existed) as active too
    // — .eq("active", true) alone would silently exclude them since SQL NULL
    // never equals true.
    const { data, error } = await db.from("knowledge_base").select("title, content, category").or("active.is.null,active.eq.true").order("category").order("title");
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
  emailMismatch?: boolean,
  hasAccount?: boolean,
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

${orderInfo && !emailMismatch ? `**Their order history found in our system:**\n${orderInfo}\n` : ""}${orderInfo && emailMismatch ? `**Order found by name (email on file does NOT match their contact email — likely a typo at checkout):**\n${orderInfo}\n` : ""}${!orderInfo ? "No order found for this email or name in our system.\n" : ""}
**Account status:** ${hasAccount === true ? "This email HAS a registered account — use forgot-password wording, NOT sign-up wording." : hasAccount === false ? "This email does NOT have a registered account yet." : "Account status unknown."}

Instructions:

PRIME DIRECTIVE — ONLY REPLY WHEN YOU ARE CERTAIN, ESCALATE BY DEFAULT:
Your bar for replying directly is high. Default to ESCALATE. Only answer if you are fully certain every single fact in your reply is directly and unambiguously sourced from:
- The "Event Details" block (auto-generated from the canonical event data)
- The "What an All Inclusive ticket includes" / "What a GA Entry ticket includes" sections
- The "Ticket Types & Pricing" section
- The "Policies" section
- The "Common Questions & Answers" Q/A block
- The "Admin Knowledge Base" block (added by the admin via the knowledge_base table) — this is the AUTHORITATIVE source and overrides everything else when it covers the same topic

Before answering, silently check: "Is every fact in this reply directly stated above, with zero interpretation or filling-in-the-gaps?" If there's any hesitation, ESCALATE instead — a wrong auto-reply is much worse than a delayed correct one, and a human reviewing it now grows the Admin Knowledge Base above for next time, so escalating is never wasted effort.

If the customer asks something that none of those sources answer, or you're only moderately (not fully) confident, output the single word ESCALATE (nothing else). It is EXPECTED and ENCOURAGED to escalate liberally — this system is designed to get smarter over time as admins answer escalated tickets, not to guess in the meantime.

DO NOT extrapolate, generalize, or stitch a partial answer together from generic knowledge. If a fact isn't in the sources above, you don't know it. ESCALATE.

ALWAYS ESCALATE (regardless of the knowledge base) — these are hard triggers, not judgment calls:
- Anything emotionally charged: angry, threatening, or legal language, mentions of attorney/chargeback/BBB, profanity/swearing, ALL-CAPS shouting, or repeated exclamation points/question marks — these are all signs of a frustrated customer who needs a human, even if the underlying question looks answerable
- The customer says a previous reply didn't work, didn't help, or that they already asked this — repeating the same advice a second time is worse than escalating
- Messages in a language other than English
- Group bookings, buyouts, bottle service, private events
- Sponsorship / vendor / press / affiliate inquiries
- Any specific dollar amount, headcount, brand name, performer, or food specific not present in the sources above
- Requests for a phone number or to speak to a person directly

HARD RULES WHEN YOU DO ANSWER:
1. NEVER INVENT FACTS. Prices, sample counts, inclusions, food vendor names, sampling hours, venue addresses, dates, times, GA availability MUST be quoted from the sources above. If the city isn't named and the answer differs by city, ESCALATE (or ask which city, only if the rest of the answer is otherwise solid).
2. NEVER use the word "unlimited" anywhere. Tasting tickets are a fixed allotment of 12 per All Inclusive ticket.
3. Password reset → https://tequilafestusa.com/forgot-password (if they never set a password, https://tequilafestusa.com/signup instead).
4. Missing tickets → log in at https://tequilafestusa.com/account. If no account, sign up at https://tequilafestusa.com/signup with the same email used at checkout — tickets pull in automatically.
5. Refunds → all sales final, no refunds. Be empathetic but firm.
6. Ticket transfers → follow the Admin Knowledge Base policy exactly (escalate if no policy is in the KB).
7. Sign off as "The Tequila Fest USA Team".
8. Keep replies 2–5 sentences. Don't over-explain.

Examples (apply the Prime Directive above to all of these):
- "where are my tickets" → answer from the missing-tickets rule
- "forgot password" / "can't log in" → answer with the password reset URL
- "can I get a refund" → answer (all sales final)
- "when is the Cincinnati event" → answer from Event Details
- "what's included with my ticket" → ONLY answer if Event Details + the "What an All Inclusive ticket includes" section fully cover it; otherwise ESCALATE
- "is [specific brand] pouring" → ESCALATE (not in sources)
- "is there parking" → answer ONLY if Event Details says yes/no for that city; otherwise ESCALATE
- "can I transfer my ticket" → answer ONLY if the Admin Knowledge Base has a transfer policy; otherwise ESCALATE

Note: customers sometimes say "please see attached" but this system does not support attachments — ignore attachments and answer only from message text.

EMAIL MISMATCH RULE: If the order was found by name but the email on file differs from the customer's contact email, there was likely a typo at checkout. Do NOT auto-reply as if everything is fine or direct them to sign up. Instead, output ESCALATE so a human can correct the email and resend their tickets.

Respond with ONLY:
- A short reply text (only if every fact in your answer is sourced from the blocks above), OR
- The single word ESCALATE — preferred whenever there is any doubt or any fact you'd have to invent`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 600,
    temperature: 0.2, // low temperature — favor consistent, conservative ESCALATE calls over creative guessing
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

// ─── Learn from admin replies ──────────────────────────────────────────────────
// Called after an admin manually replies to a ticket the AI had escalated
// (status was "needs-review" — meaning the AI didn't know the answer). Turns
// the (question, admin's real answer) pair into a generalized, reusable
// knowledge_base entry so the AI can answer similar questions on its own
// next time, instead of escalating the same gap forever.
export async function learnFromAdminReply(customerMessage: string, adminReply: string, subject: string): Promise<void> {
  if (!process.env.OPENAI_API_KEY) return;

  try {
    const prompt = `You are maintaining a support knowledge base for Tequila Fest USA. An admin just answered a customer question that the AI support bot didn't know how to answer.

Customer's question (subject: "${subject}"):
${customerMessage}

Admin's actual reply:
${adminReply}

Turn this into a general, reusable knowledge base entry that will help the AI answer SIMILAR future questions — not just this exact one. Strip out anything specific to this one customer (their name, order number, email, dates specific to their situation). Keep only the general policy/fact/answer.

If the admin's reply is too specific to this one customer to generalize (e.g. it's about a unique one-off situation, or doesn't actually contain a reusable fact/policy), respond with exactly: SKIP

Otherwise respond with EXACTLY this format (no extra commentary):
TITLE: <short title, under 60 chars>
CATEGORY: <one or two words, e.g. "Tickets", "Refunds", "Account", "Policies", "Events">
CONTENT: <the generalized answer, 1-4 sentences, written as a statement of fact/policy — not addressed to a specific customer>`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (response.choices[0].message.content || "").trim();
    if (text === "SKIP" || !text.includes("TITLE:")) return;

    const titleMatch = text.match(/TITLE:\s*(.+)/);
    const categoryMatch = text.match(/CATEGORY:\s*(.+)/);
    const contentMatch = text.match(/CONTENT:\s*([\s\S]+)/);

    const title = titleMatch?.[1]?.trim();
    const category = categoryMatch?.[1]?.trim() || "General";
    const content = contentMatch?.[1]?.trim();
    if (!title || !content) return;

    const db = supabaseAdmin as any;
    const { error } = await db.from("knowledge_base").insert({ title, content, category, active: true });
    if (error) {
      console.error("learnFromAdminReply insert error:", error);
      return;
    }
    console.log("📚 Learned new KB entry from admin reply:", title);
  } catch (err) {
    console.error("learnFromAdminReply error:", err);
  }
}
