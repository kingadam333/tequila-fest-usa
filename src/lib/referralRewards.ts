import { normalizeTicketType } from "@/lib/normalizeTicketType";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { resend, FROM_EMAIL } from "@/lib/resend";
import { wrapEmailHtml } from "@/lib/emailLayout";

export const REFERRAL_MILESTONE = 5;

// Called after every converted referral. If the referrer has now hit the
// milestone (live-counted from `referrals`, never a stored counter — same
// "always recompute" rule this project uses for every other sold-count/
// capacity number) for this event, and hasn't already been awarded it,
// upgrades one of their own tickets for that event to VIP for free.
//
// Never oversells VIP: checks live capacity the same way
// /api/events/[slug]/ticket-types does (recomputed from ticket_instances,
// not the cached ticket_types.sold_count column) before touching anything.
// If VIP is full, or the referrer has no un-upgraded ticket for that event,
// the reward is logged as pending/blocked for admin to resolve manually
// rather than silently failing or overselling.
export async function checkAndAwardReferralMilestone(db: any, referralCode: string, eventSlug: string, referrerCustomerId: string) {
  const { count } = await db
    .from("referrals")
    .select("id", { count: "exact", head: true })
    .eq("referral_code", referralCode)
    .eq("status", "converted");

  if ((count || 0) < REFERRAL_MILESTONE) return;

  const { data: existingReward } = await db
    .from("referral_rewards")
    .select("id")
    .eq("customer_id", referrerCustomerId)
    .eq("event_slug", eventSlug)
    .eq("milestone", REFERRAL_MILESTONE)
    .maybeSingle();
  if (existingReward) return; // already awarded — never double-grant

  const { data: reward, error: rewardError } = await db
    .from("referral_rewards")
    .insert({
      customer_id: referrerCustomerId,
      event_slug: eventSlug,
      referral_code: referralCode,
      milestone: REFERRAL_MILESTONE,
      converted_count_at_award: count,
      status: "pending",
    })
    .select()
    .single();
  if (rewardError || !reward) return;

  const { data: event } = await db
    .from("events")
    .select("id, city, ticket_types(id, name, capacity)")
    .eq("slug", eventSlug)
    .maybeSingle();
  if (!event) {
    await db.from("referral_rewards").update({ status: "no_ticket" }).eq("id", reward.id);
    return;
  }

  const vipType = (event.ticket_types || []).find((t: any) => normalizeTicketType(t.name) === "VIP Experience");
  const vipTypeName: string = vipType?.name || "VIP Experience";

  // The referrer's own paid tickets for this event, none already VIP.
  const { data: myInstances } = await db
    .from("ticket_instances")
    .select("id, ticket_type, ticket_orders!inner(customer_id, status)")
    .eq("event_id", event.id)
    .eq("ticket_orders.customer_id", referrerCustomerId)
    .eq("ticket_orders.status", "paid");

  const eligible = (myInstances || []).find((i: any) => normalizeTicketType(i.ticket_type) !== "VIP Experience");
  if (!eligible) {
    await db.from("referral_rewards").update({ status: "no_ticket" }).eq("id", reward.id);
    return;
  }

  if (vipType) {
    const allInstances = await fetchAllRows<{ ticket_type: string }>((from, to) =>
      db.from("ticket_instances")
        .select("ticket_type, ticket_orders!inner(status)")
        .eq("event_id", event.id)
        .eq("ticket_orders.status", "paid")
        .range(from, to)
    );
    const vipSold = allInstances.filter(i => normalizeTicketType(i.ticket_type) === "VIP Experience").length;
    if (vipSold >= vipType.capacity) {
      await db.from("referral_rewards").update({ status: "capacity_blocked" }).eq("id", reward.id);
      return;
    }
  }

  const { error: upgradeError } = await db
    .from("ticket_instances")
    .update({ ticket_type: vipTypeName })
    .eq("id", eligible.id);
  if (upgradeError) return;

  await db.from("referral_rewards")
    .update({ status: "fulfilled", ticket_instance_id: eligible.id, fulfilled_at: new Date().toISOString() })
    .eq("id", reward.id);

  console.log(`🎉 Referral milestone reward: upgraded ticket ${eligible.id} to VIP for customer ${referrerCustomerId} (${eventSlug})`);

  try {
    const { data: customer } = await db.from("customer_accounts").select("email, first_name").eq("id", referrerCustomerId).maybeSingle();
    if (customer?.email) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: customer.email,
        subject: `🎉 You just earned a FREE VIP upgrade — Tequila Fest ${event.city}`,
        html: wrapEmailHtml(`
  <p style="font-size:11px;font-weight:900;letter-spacing:6px;color:#F5A623;margin:0 0 28px">TEQUILA FEST USA</p>
  <div style="background:#241503;border:1px solid rgba(245,166,35,0.2);border-radius:16px;padding:28px">
    <p style="font-size:22px;font-weight:900;color:#F5A623;margin:0 0 12px">You earned a free VIP upgrade! 🥃</p>
    <p style="color:rgba(255,248,240,0.85);line-height:1.6;margin:0">
      ${customer.first_name || "Hey"}, ${REFERRAL_MILESTONE} of your friends just bought tickets to Tequila Fest
      ${event.city} through your referral link — as a thank you, one of your tickets has been upgraded to
      <strong>VIP Experience</strong>, completely free. Check your account for your updated ticket.
    </p>
  </div>`),
      }).catch(() => {});
    }
  } catch {
    // notification failure shouldn't undo the upgrade
  }
}
