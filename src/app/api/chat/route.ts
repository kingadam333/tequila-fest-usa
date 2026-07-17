import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_SUPPORT } from "@/lib/resend";
import { KNOWLEDGE_BASE, fetchDBKnowledge } from "@/lib/aiInbox";
import { buildEscalationHtml, ADMIN_EMAIL } from "@/lib/aiInboxEmail";
import { sendPasswordResetEmail, resendTicketEmail } from "@/lib/accountActions";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Tool implementations ──────────────────────────────────────────────────────
// Every action below only ever touches the email address that was looked up
// (the "email on file"), never an arbitrary address supplied elsewhere in the
// conversation — same rule the admin AI Inbox pipeline follows.
async function lookupOrdersByEmail(email: string) {
  const db = supabaseAdmin as any;
  const cleanEmail = email.trim().toLowerCase();
  const { data: orders } = await db
    .from("ticket_orders")
    .select("order_number, ticket_type, quantity, total, event_city, status, created_at")
    .eq("customer_email", cleanEmail)
    .eq("status", "paid")
    .order("created_at", { ascending: false });

  if (!orders?.length) return { found: false, message: "No orders found for that email address." };
  return {
    found: true,
    orders: orders.map((o: any) => ({
      orderNumber: o.order_number,
      event: o.event_city,
      ticketType: o.ticket_type,
      quantity: o.quantity,
      total: `$${Number(o.total).toFixed(2)}`,
      date: new Date(o.created_at).toLocaleDateString(),
    })),
  };
}

async function resendTickets(email: string) {
  const db = supabaseAdmin as any;
  const cleanEmail = email.trim().toLowerCase();
  const { data: orders } = await db
    .from("ticket_orders")
    .select("order_number")
    .eq("customer_email", cleanEmail)
    .eq("status", "paid");

  if (!orders?.length) return { success: false, message: "No orders found for that email address." };

  // resendTicketEmail always sends to the order's own customer_email column —
  // never to whatever string the caller passed in — so this can't be used to
  // redirect tickets to an email that isn't on file for the order.
  const results = await Promise.all(orders.map((o: any) => resendTicketEmail(o.order_number)));
  const sent = results.filter(r => r.sent).length;
  if (!sent) return { success: false, message: "Found orders but couldn't resend the email. Please contact support." };
  return { success: true, message: `Tickets resent to the email on file for ${sent} order(s). Please check your inbox (and spam folder).` };
}

async function sendPasswordReset(email: string) {
  const result = await sendPasswordResetEmail(email);
  if (!result.sent) {
    return result.reason === "no_account"
      ? { success: false, message: "No account found for that email address. If you bought tickets but never made a password, sign up at tequilafestusa.com/signup with the same email instead." }
      : { success: false, message: "Unable to send reset email right now. Please contact support." };
  }
  return { success: true, message: "Password reset email sent! Check your inbox." };
}

async function escalateToHuman(name: string, email: string, subject: string, message: string) {
  const db = supabaseAdmin as any;
  const { data: inserted } = await db.from("contact_submissions").insert({
    name, email, phone: null, subject, message, status: "needs-review",
    inbox: "Support", ai_handled: false,
  }).select("id").single();

  try {
    await resend.emails.send({
      from: FROM_SUPPORT,
      to: ADMIN_EMAIL,
      subject: `Open Ticket in Tequila Fest Inbox — ${subject}`,
      html: buildEscalationHtml(name, email, subject, message, null),
    });
  } catch (err) {
    console.error("escalateToHuman notification failed:", err);
  }

  return {
    success: !!inserted,
    message: "I've opened a support ticket for you — a member of our team will follow up by email shortly.",
  };
}

// ── Tools definition ────────────────────────────────────────────────────────
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "lookup_orders",
      description: "Look up ticket orders for a customer by their email address",
      parameters: {
        type: "object",
        properties: { email: { type: "string", description: "Customer email address" } },
        required: ["email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resend_tickets",
      description: "Resend ticket QR codes to the email address on file for that customer's order(s)",
      parameters: {
        type: "object",
        properties: { email: { type: "string", description: "Customer email address" } },
        required: ["email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_password_reset",
      description: "Send a password reset email to a customer so they can access their account",
      parameters: {
        type: "object",
        properties: { email: { type: "string", description: "Customer email address" } },
        required: ["email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "escalate_to_human",
      description: "Open a real support ticket for a human teammate to handle, for anything you can't confidently answer from the knowledge base — angry/legal messages, group bookings, sponsorships, or any question not covered by known facts. Only call this once you have the customer's name and email.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Customer's name" },
          email: { type: "string", description: "Customer's email address" },
          subject: { type: "string", description: "Short summary of the issue" },
          message: { type: "string", description: "The customer's question or issue, in their own words" },
        },
        required: ["name", "email", "subject", "message"],
      },
    },
  },
];

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ reply: "AI support is not currently available. Please email help@mail.tequilafestusa.com." });
  }

  const { messages } = await req.json();
  if (!messages?.length) return NextResponse.json({ error: "No messages" }, { status: 400 });

  // Same knowledge base the admin AI Inbox uses for auto-replies, so answers
  // stay consistent between the site widget and email support.
  const dbKnowledge = await fetchDBKnowledge();

  const systemPrompt = `${KNOWLEDGE_BASE}${dbKnowledge}

---

You are the "Instant Customer Service" chat widget on the Tequila Fest USA website — the live, real-time counterpart to the AI Inbox that handles support emails. Be warm, helpful, and concise.

You can help customers with:
- Finding their orders and tickets (ask for their email, then use lookup_orders)
- Resending ticket emails (use resend_tickets — this always goes to the email on file, never anywhere else)
- Password resets / account access (use send_password_reset)
- General questions about the event, answered ONLY from the knowledge base above

PRIME DIRECTIVE — DON'T INVENT FACTS: Only answer using facts clearly covered by the knowledge base above. If a customer asks something it doesn't cover, or something emotionally charged (angry, legal, chargeback), a group booking/sponsorship/press inquiry, or anything you're not confident about, collect their name + email if you don't already have them and call escalate_to_human — do not guess or make up policy.

Rules:
- Always be friendly and on-brand (fun, tequila-themed where appropriate)
- If you need an email address to help, ask for it politely
- Never invent ticket prices or policies not in the knowledge base
- Keep responses short and helpful
- Never claim "unlimited" samples — it's a fixed allotment of 12 tasting tickets
- Ticket resends and password resets only ever go to the email address that's on file — you cannot redirect them anywhere else, and should tell the customer that if asked`;

  const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  try {
    // First call — may include tool calls
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      tools,
      tool_choice: "auto",
      max_tokens: 400,
      temperature: 0.7,
    });

    const choice = response.choices[0];

    // Handle tool calls
    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
      const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
      toolResults.push({ role: "assistant", content: choice.message.content || "", tool_calls: choice.message.tool_calls });

      for (const call of choice.message.tool_calls) {
        const fn = (call as any).function;
        const args = JSON.parse(fn.arguments);
        let result: any;

        if (fn.name === "lookup_orders")           result = await lookupOrdersByEmail(args.email);
        else if (fn.name === "resend_tickets")      result = await resendTickets(args.email);
        else if (fn.name === "send_password_reset") result = await sendPasswordReset(args.email);
        else if (fn.name === "escalate_to_human")   result = await escalateToHuman(args.name, args.email, args.subject, args.message);
        else result = { error: "Unknown tool" };

        toolResults.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }

      // Second call with tool results
      const finalResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [...chatMessages, ...toolResults],
        max_tokens: 400,
        temperature: 0.7,
      });

      return NextResponse.json({ reply: finalResponse.choices[0]?.message?.content || "Something went wrong." });
    }

    return NextResponse.json({ reply: choice.message.content || "Something went wrong." });
  } catch (err: any) {
    console.error("Chat error:", err);
    return NextResponse.json({ reply: "I'm having trouble right now. Please email help@mail.tequilafestusa.com for assistance." });
  }
}
