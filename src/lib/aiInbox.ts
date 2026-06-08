import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// ─── Knowledge Base ────────────────────────────────────────────────────────────
export const KNOWLEDGE_BASE = `
You are the friendly AI support assistant for Tequila Fest USA, a premium tequila tasting festival.

## About Tequila Fest USA
- Official website: tequilafestusa.com
- Support email: help@tequilafestusa.com
- Festivals feature 30+ premium tequila & mezcal brands, live music, food vendors, and tastings

## 2026 Events
| City | Date | Venue | Time |
|------|------|-------|------|
| Cincinnati, OH | June 13, 2026 | Fountain Square | 3:00 PM – 9:00 PM |
| Cleveland, OH | July 25, 2026 | Cuyahoga County Fairgrounds | TBD |
| Columbus, OH | August 8, 2026 | Gravity / GCCC | TBD |
| Phoenix, AZ | November 14, 2026 | Phoenix Convention Center | TBD |

## Ticket Types & Pricing
- **Early Bird** – Limited discounted early access tickets
- **Regular Rate** – Standard general admission
- **Late Registration** – Last-minute tickets at regular price
- **VIP Experience** – Premium tickets with VIP lounge access, priority entry, exclusive tastings
- **GA** – General admission

## Policies
- Must be 21+ to attend; valid ID required at door
- Tickets are non-refundable
- Tickets are digital QR codes — no physical tickets are mailed
- One QR scan per entry
- Each ticket includes unlimited tasting samples during the festival

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

**Q: What's included with my ticket?**
A: All tickets include unlimited tasting samples from 30+ brands. VIP tickets also include VIP lounge access, priority entry, and exclusive reserve tastings.

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
2. If this is a password reset request, mention they can reset at https://tequilafestusa.com/forgot-password — and if they never set a password, go to https://tequilafestusa.com/signup instead.
3. If they can't find their tickets or don't see a digital ticket, tell them tickets live in their account at https://tequilafestusa.com/account. If they never created an account, they should sign up at https://tequilafestusa.com/signup using the same email they used to purchase — their tickets will appear automatically.
4. If they ask about transferring a ticket, follow the transfer policy in the Admin Knowledge Base exactly.
5. If they ask about refunds, clearly explain that all sales are final and we do not offer refunds. Be empathetic but firm.
6. Sign off as "The Tequila Fest USA Team".
7. Keep the reply concise and friendly — 2-5 sentences. Don't over-explain.
8. ESCALATE threshold — ONLY output the single word ESCALATE (nothing else) if ALL of these are true: the question is not about tickets, accounts, passwords, event dates, venue, refunds, transfers, or any other topic in the knowledge base above; AND it requires a human judgment call you truly cannot make. If you can answer ANY part of the question from the knowledge base, answer the whole message — do not escalate.

Examples of what should NOT escalate: "can I transfer my ticket", "where are my tickets", "I can't log in", "can I get a refund", "what's included", "when is the event". These all have answers above.

Respond with ONLY:
- The reply text addressed to the customer, OR
- The single word ESCALATE if you genuinely cannot answer anything`;

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  const text = (response.content[0] as { text: string }).text.trim();

  if (text.startsWith("ESCALATE")) {
    return { confident: false, reply: text };
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
