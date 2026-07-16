import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import {
  searchCustomers, getOrderDetails, reassignOrderEmail,
  resendTicketEmail, sendPasswordResetEmail, repairCustomerLogin,
} from "@/lib/accountActions";
import {
  listEvents, getEventDetails, createEvent, updateEvent,
  adjustTicketCapacity, addTicketType,
} from "@/lib/eventActions";
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
  {
    type: "function",
    function: {
      name: "list_events",
      description: "List all events with their slug, city, date, and status. Use this to find an event's slug before getting details or making changes.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_event",
      description: "Get full details for one event (venue, date, description, etc.) plus every ticket type and its price/capacity/sold count, by slug.",
      parameters: {
        type: "object",
        properties: { slug: { type: "string" } },
        required: ["slug"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_event",
      description: "Create a new event. Use list_events first to avoid slug collisions. IMPORTANT: after creating, tell the admin that going fully live for public ticket sales also requires a code change (src/lib/events.ts) and a deploy — this only creates the DB record shown in the admin dashboard.",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string", description: "URL slug, e.g. 'austin'" },
          city: { type: "string" },
          state: { type: "string", description: "2-letter state code" },
          title: { type: "string", description: "Display title, e.g. 'Tequila Fest Austin'" },
          date: { type: "string", description: "Human-readable date, e.g. 'September 5, 2026'" },
          dateIso: { type: "string", description: "ISO 8601 date/time" },
          time: { type: "string", description: "e.g. '3:00 PM – 9:00 PM'" },
          venue: { type: "string" },
          venueDetail: { type: "string" },
          venueAddress: { type: "string" },
          description: { type: "string" },
          capacity: { type: "number", description: "Whole-event capacity" },
          freeParking: { type: "boolean" },
        },
        required: ["slug", "city", "state", "title", "date", "dateIso", "time", "venue", "venueDetail", "venueAddress"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_event",
      description: "Update an existing event's fields (date, venue, status, description, capacity, etc.) by slug. Only pass the fields being changed.",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string" },
          updates: {
            type: "object",
            description: "Key/value pairs of fields to change, e.g. { date: 'October 3, 2026', dateIso: '2026-10-03T15:00:00-05:00', status: 'sold_out' }",
          },
        },
        required: ["slug", "updates"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "adjust_ticket_capacity",
      description: "Change the capacity (total inventory) of one ticket type at an event, e.g. raising VIP capacity from 100 to 150. Use get_event first to confirm the exact ticket type name.",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string" },
          ticketTypeName: { type: "string", description: "Exact or close match to the ticket type's name, e.g. 'VIP' or 'GA Entry'" },
          newCapacity: { type: "number" },
        },
        required: ["slug", "ticketTypeName", "newCapacity"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "add_ticket_type",
      description: "Add a brand-new ticket type/tier to an existing event.",
      parameters: {
        type: "object",
        properties: {
          slug: { type: "string" },
          name: { type: "string", description: "e.g. 'Early Bird', 'VIP', 'GA Entry'" },
          price: { type: "number" },
          capacity: { type: "number" },
          isGa: { type: "boolean", description: "True if this is a door-entry-only GA ticket" },
        },
        required: ["slug", "name", "price", "capacity"],
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
    case "list_events": return await listEvents();
    case "get_event": return await getEventDetails(args.slug);
    case "create_event": return await createEvent(args);
    case "update_event": return await updateEvent(args.slug, args.updates || {});
    case "adjust_ticket_capacity": return await adjustTicketCapacity(args.slug, args.ticketTypeName, args.newCapacity);
    case "add_ticket_type": return await addTicketType(args.slug, args);
    default: return { error: "Unknown tool" };
  }
}

const SYSTEM_PROMPT = `You are the internal AI assistant for Tequila Fest USA admins, inside the admin dashboard. You are talking to a trusted team member, not a customer — be direct and efficient, no need for customer-facing pleasantries.

You have tools to:
- Search customers/orders, look up full order details, reassign an order to the correct email (when a customer mistyped it at checkout), resend ticket emails, send password resets, and repair broken logins.
- Manage events: list events, get an event's full details + ticket types, create a new event, update an event's fields (date, venue, status, etc.), adjust a ticket type's capacity, and add a new ticket type/tier.

Rules:
- Always use search_customers/get_order (for people) or list_events/get_event (for events) to find real data before acting — never guess an order number, email, event slug, or ticket type name.
- Before a destructive/changing action (reassign_ticket_email, repair_login, update_event, adjust_ticket_capacity), make sure you have the right record confirmed — if the admin's request is ambiguous (e.g. multiple matches), ask which one before acting.
- IMPORTANT event caveat: creating or editing an event here only writes to the database that powers the admin dashboard. The public checkout/pricing flow currently reads event data from a separate hardcoded file in the codebase, so a brand-new event is NOT automatically purchasable by customers — that still needs a code change and deploy. Always mention this after create_event so the admin doesn't assume it's live for sale.
- After taking an action, clearly state what you did and the result.
- Keep responses concise and scannable — use short paragraphs or bullet points for multiple results.
- You may call multiple tools across multiple turns to complete a multi-step request (e.g. look up an event's ticket types before adjusting one).`;

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
    let reply = "Something went wrong.";
    // Agentic loop — some requests need several sequential tool calls (e.g.
    // look up an event's ticket types, THEN adjust one), not just one round.
    for (let step = 0; step < 6; step++) {
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
        chatMessages.push({ role: "assistant", content: choice.message.content || "", tool_calls: choice.message.tool_calls });

        for (const call of choice.message.tool_calls) {
          const fn = (call as any).function;
          const args = JSON.parse(fn.arguments || "{}");
          const result = await runTool(fn.name, args);
          chatMessages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
        }
        continue; // let the model see the tool results and decide the next step
      }

      reply = choice.message.content || reply;
      break;
    }

    await db.from("admin_ai_messages").insert({ conversation_id: convoId, role: "assistant", content: reply });
    await db.from("admin_ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convoId);

    return NextResponse.json({ conversationId: convoId, reply });
  } catch (err: any) {
    console.error("Admin AI chat error:", err);
    return NextResponse.json({ error: "AI request failed. Please try again." }, { status: 500 });
  }
}
