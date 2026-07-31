import { supabaseAdmin } from "@/lib/supabase";

export interface CampaignRecipient { email: string; name: string }

// Shared audience resolver for campaign preview + send, so the count shown
// before sending always matches who actually receives it.
export async function resolveAudience(audience: "vendors" | "tickets", cities: string[]): Promise<CampaignRecipient[]> {
  const db = supabaseAdmin as any;
  const byEmail = new Map<string, CampaignRecipient>();

  if (audience === "vendors") {
    // Every vendor who ever applied for one of these cities, any status —
    // paid/pending/rejected all still count as "past vendor interest" for a
    // "applications are open" reminder next season.
    const { data: apps } = await db.from("vendor_applications").select("email, name, business_name, cities");
    for (const a of apps || []) {
      if (!a.email || !(a.cities || []).some((c: string) => cities.includes(c))) continue;
      byEmail.set(a.email.toLowerCase(), { email: a.email, name: a.name || a.business_name || "there" });
    }

    // Plus anyone manually tagged from an inbound vendors@ email that never
    // turned into a formal application.
    const { data: contacts } = await db.from("vendor_contacts").select("email, name, cities");
    for (const c of contacts || []) {
      if (!c.email || !(c.cities || []).some((city: string) => cities.includes(city))) continue;
      if (!byEmail.has(c.email.toLowerCase())) byEmail.set(c.email.toLowerCase(), { email: c.email, name: c.name || "there" });
    }
  } else {
    const { data: orders } = await db
      .from("ticket_orders")
      .select("customer_email, customer_name, event_city")
      .eq("status", "paid")
      .in("event_city", cities);
    for (const o of orders || []) {
      if (!o.customer_email) continue;
      if (!byEmail.has(o.customer_email.toLowerCase())) {
        byEmail.set(o.customer_email.toLowerCase(), { email: o.customer_email, name: (o.customer_name || "").split(" ")[0] || "there" });
      }
    }
  }

  return Array.from(byEmail.values());
}
