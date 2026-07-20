import crypto from "crypto";

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN;

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

interface CapiUserData {
  email?: string;
  phone?: string;
  clientIp?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
}

// Server-side mirror of the browser Meta Pixel. Meta's Conversions API exists
// because ad blockers, Safari ITP, and iOS App Tracking Transparency drop a
// meaningful share of browser-side pixel events — sending the same event from
// the server closes that gap. The eventId passed in MUST match the eventID
// used in the client-side fbq() call for the same logical event (we use the
// order number, known on both sides), or Meta will count it twice instead of
// deduplicating.
export async function sendMetaCapiEvent(params: {
  eventName: string;
  eventId: string;
  eventSourceUrl: string;
  userData: CapiUserData;
  customData?: Record<string, unknown>;
}): Promise<void> {
  if (!PIXEL_ID || !ACCESS_TOKEN) return; // not configured — skip silently, same as the browser pixel does

  const user_data: Record<string, unknown> = {};
  if (params.userData.email) user_data.em = [sha256(params.userData.email)];
  if (params.userData.phone) {
    const digitsOnly = params.userData.phone.replace(/[^\d]/g, "");
    if (digitsOnly) user_data.ph = [sha256(digitsOnly)];
  }
  if (params.userData.clientIp) user_data.client_ip_address = params.userData.clientIp;
  if (params.userData.userAgent) user_data.client_user_agent = params.userData.userAgent;
  if (params.userData.fbp) user_data.fbp = params.userData.fbp;
  if (params.userData.fbc) user_data.fbc = params.userData.fbc;

  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: [{
          event_name: params.eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: params.eventId,
          event_source_url: params.eventSourceUrl,
          action_source: "website",
          user_data,
          custom_data: params.customData || {},
        }],
      }),
    });
    if (!res.ok) {
      console.error("Meta CAPI error:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Meta CAPI send failed:", err);
  }
}
