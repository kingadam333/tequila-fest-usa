// Pushes ticket buyers into the correct per-city Brevo (email) and TextMagic
// (SMS) list after a paid ticket order — so each city's marketing lists stay
// automatically up to date without manual CSV exports.
//
// List IDs and API credentials come from Vercel env vars, one pair per city:
//   BREVO_API_KEY, BREVO_LIST_ID_CINCINNATI / _CLEVELAND / _COLUMBUS / _PHOENIX
//   TEXTMAGIC_USERNAME, TEXTMAGIC_API_KEY, TEXTMAGIC_LIST_ID_CINCINNATI / ...
//
// Both calls are best-effort: failures are logged, never thrown, so a
// marketing-list hiccup never blocks order confirmation or the buyer's email.

const CITY_ENV_SUFFIX: Record<string, string> = {
  cincinnati: "CINCINNATI",
  cleveland: "CLEVELAND",
  columbus: "COLUMBUS",
  phoenix: "PHOENIX",
};

function cityEnvSuffix(city: string): string | null {
  const key = (city || "").trim().toLowerCase();
  return CITY_ENV_SUFFIX[key] || null;
}

// Best-effort E.164 normalization, assumes US numbers when no country code
// is present (matches this project's current city footprint).
function toE164(phone: string): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

interface BuyerInfo {
  city: string;
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string | null;
}

export async function syncTicketBuyerToBrevo({ city, email, firstName, lastName, phone }: BuyerInfo) {
  const apiKey = process.env.BREVO_API_KEY;
  const suffix = cityEnvSuffix(city);
  if (!apiKey || !suffix || !email) return;

  const listIdRaw = process.env[`BREVO_LIST_ID_${suffix}`];
  const listId = listIdRaw ? parseInt(listIdRaw, 10) : NaN;
  if (!listId) return;

  try {
    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": apiKey },
      body: JSON.stringify({
        email,
        attributes: {
          FIRSTNAME: firstName || "",
          ...(lastName ? { LASTNAME: lastName } : {}),
          ...(phone ? { SMS: phone } : {}),
        },
        listIds: [listId],
        updateEnabled: true, // merge into existing contact if already present
      }),
    });
    if (!res.ok) {
      console.error(`Brevo ticket-buyer sync failed (${city}):`, res.status, await res.text());
    }
  } catch (err) {
    console.error(`Brevo ticket-buyer sync threw (${city}):`, err);
  }
}

export async function syncTicketBuyerToTextMagic({ city, email, firstName, lastName, phone }: BuyerInfo) {
  const username = process.env.TEXTMAGIC_USERNAME;
  const apiKey = process.env.TEXTMAGIC_API_KEY;
  const suffix = cityEnvSuffix(city);
  if (!username || !apiKey || !suffix) return;

  const listId = process.env[`TEXTMAGIC_LIST_ID_${suffix}`];
  const e164 = phone ? toE164(phone) : null;
  if (!listId || !e164) return; // TextMagic requires a phone number

  try {
    const res = await fetch("https://rest.textmagic.com/api/v2/contacts/normalized", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${username}:${apiKey}`).toString("base64")}`,
      },
      body: JSON.stringify({
        phone: e164,
        firstName: firstName || "",
        ...(lastName ? { lastName } : {}),
        ...(email ? { email } : {}),
        lists: listId,
      }),
    });
    if (!res.ok) {
      // TextMagic returns 400 for a phone already on file — expected for
      // repeat buyers, not worth alarming on, but still worth a log line.
      console.error(`TextMagic ticket-buyer sync failed (${city}):`, res.status, await res.text());
    }
  } catch (err) {
    console.error(`TextMagic ticket-buyer sync threw (${city}):`, err);
  }
}

export async function syncTicketBuyerToMarketingLists(info: BuyerInfo) {
  await Promise.allSettled([syncTicketBuyerToBrevo(info), syncTicketBuyerToTextMagic(info)]);
}
