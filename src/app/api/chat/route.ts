import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { resend, FROM_SUPPORT } from "@/lib/resend";
import { qrTicketHtml } from "@/lib/resend";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Tool implementations ──────────────────────────────────────────────────────
async function lookupOrdersByEmail(email: string) {
  const db = supabaseAdmin as any;
  const { data: orders } = await db
    .from("ticket_orders")
    .select("order_number, ticket_type, quantity, total, event_city, status, created_at")
    .eq("customer_email", email.toLowerCase())
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
  const { data: tickets } = await db
    .from("ticket_instances")
    .select(`*, ticket_orders!inner(customer_name, customer_email, order_number, event_city)`)
    .eq("ticket_orders.customer_email", email.toLowerCase())
    .eq("status", "valid");

  if (!tickets?.length) return { success: false, message: "No valid tickets found for that email." };

  // Group by order
  const byOrder = new Map<string, any[]>();
  for (const t of tickets) {
    const key = t.ticket_orders.order_number;
    if (!byOrder.has(key)) byOrder.set(key, []);
    byOrder.get(key)!.push(t);
  }

  for (const [orderNum, orderTickets] of byOrder.entries()) {
    const first = orderTickets[0];
    const customerName = first.ticket_orders.customer_name || email;
    const firstName = customerName.split(" ")[0];
    const eventCity = first.ticket_orders.event_city;

    const ticketHtml = qrTicketHtml({
      firstName,
      orderNumber: orderNum,
      eventCity,
      eventDate: "",
      eventTime: "",
      eventVenue: "",
      appUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://tequila-fest-usa.vercel.app",
      tickets: orderTickets.map((t: any) => ({
        ticketType: t.ticket_type,
        ticketNumber: t.ticket_number,
        totalInOrder: orderTickets.length,
        qrCode: t.qr_code,
        holderName: t.holder_name,
      })),
    });

    await resend.emails.send({
      from: FROM_SUPPORT,
      to: email,
      subject: `Your Tequila Fest USA Tickets — ${eventCity}`,
      html: ticketHtml,
    });
  }

  return { success: true, message: `Tickets resent to ${email}. Please check your inbox (and spam folder).` };
}

async function sendPasswordReset(email: string) {
  try {
    const { data, error } = await (supabaseAdmin as any).auth.admin.generateLink({
      type: "recovery",
      email: email.toLowerCase(),
    });

    if (error || !data?.properties?.action_link) {
      return { success: false, message: "No account found for that email address." };
    }

    await resend.emails.send({
      from: FROM_SUPPORT,
      to: email,
      subject: "Reset your Tequila Fest USA password",
      html: `<!DOCTYPE html><html><body style="background:#0d0500;font-family:Arial,sans-serif;color:#fff8f0;padding:40px 20px">
<div style="max-width:560px;margin:0 auto">
  <p style="font-size:24px;font-weight:900;letter-spacing:4px;color:#F5A623">TEQUILA FEST USA</p>
  <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px;margin-top:16px">
    <p style="font-size:16px;margin:0 0 12px">Password reset requested for <strong>${email}</strong></p>
    <p style="color:rgba(255,248,240,0.5);font-size:14px;margin:0 0 20px">Click the button below to set a new password. This link expires in 1 hour.</p>
    <a href="${data.properties.action_link}" style="display:inline-block;background:#F5A623;color:#000;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none">RESET PASSWORD</a>
  </div>
</div></body></html>`,
    });

    return { success: true, message: "Password reset email sent! Check your inbox." };
  } catch {
    return { success: false, message: "Unable to send reset email. Please contact support." };
  }
}

// ── Tools definition ──────────────────────────────────────────────────────────
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
      description: "Resend ticket QR codes to a customer's email address",
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
];

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ reply: "AI support is not currently available. Please email help@tequilafestusa.com." });
  }

  const { messages } = await req.json();
  if (!messages?.length) return NextResponse.json({ error: "No messages" }, { status: 400 });

  const db = supabaseAdmin as any;

  // Pull knowledge base
  const { data: kb } = await db.from("knowledge_base").select("title, content").eq("active", true);
  const kbText = (kb || []).map((k: any) => `${k.title}: ${k.content}`).join("\n\n");

  const systemPrompt = `You are a friendly support assistant for Tequila Fest USA, a national tequila festival.

Be warm, helpful, and concise. You can help customers with:
- Finding their orders and tickets (ask for their email, then use lookup_orders)
- Resending ticket emails (use resend_tickets with their email)
- Password resets / account access (use send_password_reset)
- General questions about the event

Knowledge base:
${kbText}

Rules:
- Always be friendly and on-brand (fun, tequila-themed where appropriate)
- If you need an email address to help, ask for it politely
- Never invent ticket prices or policies not in the knowledge base
- Keep responses short and helpful
- If you can't help, direct them to help@tequilafestusa.com`;

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
    return NextResponse.json({ reply: "I'm having trouble right now. Please email help@tequilafestusa.com for assistance." });
  }
}
