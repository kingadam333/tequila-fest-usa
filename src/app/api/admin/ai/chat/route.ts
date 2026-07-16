import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import {
  searchCustomers, getOrderDetails, reassignOrderEmail,
  resendTicketEmail, sendPasswordResetEmail, repairCustomerLogin,
} from "@/lib/accountActions";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_customers",
      description: "Search for customers/orders by email, name, or order number (partial match). Use this first whenever you need to find someone.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Email, name, or order number (or fragment of one)" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_order",
      description: "Get full details for one order, including every ticket in it, by exact order number.",
      parameters: {
        type: "object",
        properties: { orderNumber: { type: "string" } },
        required: ["orderNumber"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reassign_ticket_email",
      description: "Fix an order where the customer typed the wrong email at checkout — moves the order (and its tickets) to the correct email address. Always confirm the order number and new email with get_order/search_customers first.",
      parameters: {
        type: "object",
        properties: {
          orderNumber: { type: "string" },
          newEmail: { type: "string" },
          newName: { type: "string", description: "Optional — update the customer name on the order too" },
        },
        required: ["orderNumber", "newEmail"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resend_tickets",
      description: "Resend the QR ticket email for an order to the email currently on file for that order.",
      parameters: {
        type: "object",
        properties: { orderNumber: { type: "string" } },
        required: ["orderNumber"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "send_password_reset",
      description: "Send a password reset email to a customer account.",
      parameters: {
        type: "object",
        properties: { email: { type: "string" } },
        required: ["email"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "repair_login",
      description: "Fix an account that can't log in or reset its password because it's missing its underlying login (a known bug class) — creates the missing login and emails the customer a new temporary password.",
      parameters: {
        type: "object",
        properties: { email: { type: "string" } },
        required: ["email"],
      },
    },
  },
];

async function runTool(name: string, args: any) {
  switch (name) {
    case "search_customers": return await searchCustomers(args.query);
    case "get_order": return await getOrderDetails(args.orderNumber);
    case "reassign_ticket_email": return await reassignOrderEmail(args.orderNumber, args.newEmail, args.newName);
    case "resend_tickets": return await resendTicketEmail(args.orderNumber);
    case "send_password_reset": return await sendPasswordResetEmail(args.email);
    case "repair_login": return await repairCustomerLogin(args.email);
    default: return { error: "Unknown tool" };
  }
}

const SYSTEM_PROMPT = `You are the internal AI assistant for Tequila Fest USA admins, inside the admin dashboard. You are talking to a trusted team member, not a customer — be direct and efficient, no need for customer-facing pleasantries.

You have tools to search customers/orders, look up full order details, reassign an order to the correct email (when a customer mistyped it at checkout), resend ticket emails, send password resets, and repair broken logins.

Rules:
- Always use search_customers or get_order to find real data before acting — never guess an order number, email, or ticket detail.
- Before a destructive/changing action (reassign_ticket_email, repair_login), make sure you have the right order/customer confirmed — if the admin's request is ambiguous (e.g. multiple matches), ask which one before acting.
- After taking an action, clearly state what you did and the result.
- Keep responses concise and scannable — use short paragraphs or bullet points for multiple results.`;

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "AI assistant is not configured (missing OPENAI_API_KEY)" }, { status: 500 });
  }

  const { conversationId, message } = await req.json();
  if (!message?.trim()) return NextResponse.json({ error: "Message required" }, { status: 400 });

  const db = supabaseAdmin as any;

  let convoId = conversationId;
  if (!convoId) {
    const { data: convo, error } = await db
      .from("admin_ai_conversations")
      .insert({ title: message.trim().slice(0, 60) })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    convoId = convo.id;
  }

  const { data: history } = await db
    .from("admin_ai_messages")
    .select("role, content")
    .eq("conversation_id", convoId)
    .order("created_at", { ascending: true });

  await db.from("admin_ai_messages").insert({ conversation_id: convoId, role: "user", content: message.trim() });

  const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
    { role: "user", content: message.trim() },
  ];

  try {
    let reply = "";
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: chatMessages,
      tools,
      tool_choice: "auto",
      max_tokens: 800,
      temperature: 0.3,
    });

    const choice = response.choices[0];

    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
      const toolResults: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
      toolResults.push({ role: "assistant", content: choice.message.content || "", tool_calls: choice.message.tool_calls });

      for (const call of choice.message.tool_calls) {
        const fn = (call as any).function;
        const args = JSON.parse(fn.arguments || "{}");
        const result = await runTool(fn.name, args);
        toolResults.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }

      const finalResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [...chatMessages, ...toolResults],
        max_tokens: 800,
        temperature: 0.3,
      });
      reply = finalResponse.choices[0]?.message?.content || "Something went wrong.";
    } else {
      reply = choice.message.content || "Something went wrong.";
    }

    await db.from("admin_ai_messages").insert({ conversation_id: convoId, role: "assistant", content: reply });
    await db.from("admin_ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convoId);

    return NextResponse.json({ conversationId: convoId, reply });
  } catch (err: any) {
    console.error("Admin AI chat error:", err);
    return NextResponse.json({ error: "AI request failed. Please try again." }, { status: 500 });
  }
}
