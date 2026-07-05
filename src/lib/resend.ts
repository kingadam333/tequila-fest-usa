import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");

// ─── Email addresses per inbox ────────────────────────────────────────────────
export const FROM_EMAIL = "Tequila Fest USA <help@mail.tequilafestusa.com>";
export const FROM_SUPPORT    = "Tequila Fest USA <help@mail.tequilafestusa.com>";
export const FROM_AFFILIATES = "Tequila Fest USA Affiliates <affiliates@mail.tequilafestusa.com>";
export const FROM_SPONSORS   = "Tequila Fest USA Sponsors <sponsors@mail.tequilafestusa.com>";
export const FROM_VENDORS    = "Tequila Fest USA Vendors <vendors@mail.tequilafestusa.com>";
export const FROM_BRANDS     = "Adam Bossin <brands@mail.tequilafestusa.com>";
export const FROM_PARTNERS   = FROM_SPONSORS; // alias kept for backward compatibility

export const INBOX_ROUTING: Record<string, { from: string; to: string; label: string }> = {
  // Support inbox — help@
  "General Inquiry":        { from: FROM_SUPPORT,    to: "help@mail.tequilafestusa.com",       label: "Support" },
  "Ticket Support":         { from: FROM_SUPPORT,    to: "help@mail.tequilafestusa.com",       label: "Support" },
  "Press / Media":          { from: FROM_SUPPORT,    to: "help@mail.tequilafestusa.com",       label: "Support" },
  "Other":                  { from: FROM_SUPPORT,    to: "help@mail.tequilafestusa.com",       label: "Support" },
  // Vendors inbox — vendors@
  "Vendor Application":     { from: FROM_VENDORS,    to: "vendors@mail.tequilafestusa.com",    label: "Vendors" },
  // Sponsors inbox — sponsors@
  "Sponsorship Opportunity":{ from: FROM_SPONSORS,   to: "sponsors@mail.tequilafestusa.com",   label: "Sponsors" },
  // Affiliates inbox — affiliates@
  "Affiliate Program":      { from: FROM_AFFILIATES, to: "affiliates@mail.tequilafestusa.com", label: "Affiliates" },
  // Brands inbox — brands@
  "Brand Inquiry":          { from: FROM_BRANDS,     to: "brands@mail.tequilafestusa.com",     label: "Brands" },
};

// ─── Ticket Confirmation Email ────────────────────────────────────────────────
export function ticketConfirmationHtml({
  firstName,
  eventCity,
  eventDate,
  eventVenue,
  ticketType,
  quantity,
  total,
  orderNumber,
}: {
  firstName: string;
  eventCity: string;
  eventDate: string;
  eventVenue: string;
  ticketType: string;
  quantity: number;
  total: number;
  orderNumber: string;
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0500;font-family:'Segoe UI',Arial,sans-serif;color:#fff8f0">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d0500;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">

        <!-- Header -->
        <tr><td style="text-align:center;padding-bottom:32px">
          <p style="font-family:Arial,sans-serif;font-size:36px;font-weight:900;letter-spacing:4px;color:#F5A623;margin:0">TEQUILA FEST</p>
          <p style="font-family:Arial,sans-serif;font-size:18px;color:#ffffff;letter-spacing:6px;margin:4px 0 0">USA</p>
        </td></tr>

        <!-- Success banner -->
        <tr><td style="background:linear-gradient(135deg,#1a0e00,#2a1800);border:1px solid rgba(245,166,35,0.3);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px">
          <p style="font-size:48px;margin:0 0 12px">🥃</p>
          <p style="font-family:Arial,sans-serif;font-size:28px;font-weight:900;letter-spacing:3px;color:#F5A623;margin:0">YOU'RE IN!</p>
          <p style="color:rgba(255,248,240,0.7);font-size:16px;margin:8px 0 0">Your tickets are confirmed. See you at the festival!</p>
        </td></tr>

        <tr><td style="height:24px"></td></tr>

        <!-- Order details -->
        <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px">
          <p style="color:rgba(255,248,240,0.4);font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px">Order Summary</p>

          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
                <p style="margin:0;color:rgba(255,248,240,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px">Event</p>
                <p style="margin:4px 0 0;font-family:Arial,sans-serif;font-size:22px;font-weight:900;letter-spacing:2px;color:#F5A623">TEQUILA FEST ${eventCity.toUpperCase()}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
                <p style="margin:0;color:rgba(255,248,240,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px">Date & Time</p>
                <p style="margin:4px 0 0;color:#fff8f0;font-size:15px;font-weight:600">${eventDate} · 3:00 PM – 9:00 PM</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
                <p style="margin:0;color:rgba(255,248,240,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px">Venue</p>
                <p style="margin:4px 0 0;color:#fff8f0;font-size:15px;font-weight:600">${eventVenue}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
                <p style="margin:0;color:rgba(255,248,240,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px">Ticket Type</p>
                <p style="margin:4px 0 0;color:#fff8f0;font-size:15px;font-weight:600">${ticketType} × ${quantity}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0 0">
                <p style="margin:0;color:rgba(255,248,240,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px">Total Charged</p>
                <p style="margin:4px 0 0;font-family:Arial,sans-serif;font-size:28px;font-weight:900;color:#F5A623">$${total.toFixed(2)}</p>
              </td>
            </tr>
          </table>

          <p style="color:rgba(255,248,240,0.25);font-size:11px;margin:16px 0 0">Order #${orderNumber}</p>
        </td></tr>

        <tr><td style="height:24px"></td></tr>

        <!-- What's next -->
        <tr><td style="background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.2);border-radius:16px;padding:24px">
          <p style="color:#F5A623;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px">What's Next</p>
          <ul style="margin:0;padding:0;list-style:none">
            ${["Your QR ticket will arrive in a separate email shortly", "Create an account at TequilaFestUSA.com to access your tickets anytime", "Show your QR code at the door — one scan per entry", "Arrive early — doors open at 3 PM", "Must be 21+ with valid ID"].map(item => `<li style="display:flex;gap:8px;margin-bottom:8px"><span style="color:#F5A623;flex-shrink:0">✦</span><span style="color:rgba(255,248,240,0.65);font-size:14px">${item}</span></li>`).join("")}
          </ul>
        </td></tr>

        <tr><td style="height:24px"></td></tr>

        <!-- CTA -->
        <tr><td style="text-align:center">
          <a href="https://www.tequilafestusa.com/account" style="display:inline-block;background:#F5A623;color:#0d0500;font-weight:900;font-size:16px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:16px 40px;border-radius:50px">VIEW MY TICKETS</a>
        </td></tr>

        <tr><td style="height:40px"></td></tr>

        <!-- Footer -->
        <tr><td style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:24px">
          <p style="color:rgba(255,248,240,0.25);font-size:12px;margin:0">Tequila Fest USA · <a href="https://tequilafestusa.com" style="color:rgba(245,166,35,0.5);text-decoration:none">tequilafestusa.com</a></p>
          <p style="color:rgba(255,248,240,0.15);font-size:11px;margin:8px 0 0">Please drink responsibly. Must be 21+ to attend. Tickets are non-transferable.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Generate readable password ──────────────────────────────────────────────
export function generatePassword(): string {
  const words = ["Agave","Blanco","Fiesta","Tequila","Mezcal","Jalisco","Ambar","Reposado","Anejo","Sauza","Patron","Ocho","Clase","Fortaleza"];
  const w1 = words[Math.floor(Math.random() * words.length)];
  const w2 = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(Math.random() * 900) + 100;
  return `${w1}${w2}${num}`;
}

// ─── Welcome Email (auto-created account after ticket purchase) ───────────────
export function welcomeAccountHtml({
  firstName,
  email,
  password,
  orderNumber,
  eventCity,
  accountUrl,
}: {
  firstName: string;
  email: string;
  password: string;
  orderNumber: string;
  eventCity: string;
  accountUrl: string;
}) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0500;font-family:'Segoe UI',Arial,sans-serif;color:#fff8f0">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d0500;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">
        <tr><td style="text-align:center;padding-bottom:32px">
          <p style="font-family:Arial;font-size:36px;font-weight:900;letter-spacing:4px;color:#F5A623;margin:0">TEQUILA FEST USA</p>
        </td></tr>

        <tr><td style="background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.2);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px">
          <p style="font-size:40px;margin:0 0 12px">🥃</p>
          <p style="font-size:24px;font-weight:900;color:#F5A623;letter-spacing:2px;margin:0">YOUR ACCOUNT IS READY</p>
          <p style="color:rgba(255,248,240,0.6);margin:8px 0 0">Welcome to Tequila Fest USA, ${firstName}!</p>
        </td></tr>

        <tr><td style="height:24px"></td></tr>

        <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:24px">
          <p style="color:rgba(255,248,240,0.4);font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;margin:0 0 16px">Your Login Details</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
              <p style="margin:0;color:rgba(255,248,240,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px">Email</p>
              <p style="margin:4px 0 0;color:#fff8f0;font-size:15px;font-weight:600">${email}</p>
            </td></tr>
            <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
              <p style="margin:0;color:rgba(255,248,240,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px">Temporary Password</p>
              <p style="margin:4px 0 0;color:#F5A623;font-size:22px;font-weight:900;letter-spacing:2px;font-family:monospace">${password}</p>
              <p style="margin:4px 0 0;color:rgba(255,248,240,0.3);font-size:11px">You can change this in your account settings</p>
            </td></tr>
            <tr><td style="padding:10px 0">
              <p style="margin:0;color:rgba(255,248,240,0.4);font-size:12px;text-transform:uppercase;letter-spacing:1px">Order</p>
              <p style="margin:4px 0 0;color:#fff8f0;font-size:15px;font-weight:600">${orderNumber} — Tequila Fest ${eventCity}</p>
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="height:24px"></td></tr>

        <tr><td style="text-align:center">
          <a href="${accountUrl}" style="display:inline-block;background:#F5A623;color:#0d0500;font-weight:900;font-size:18px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:18px 48px;border-radius:50px">
            VIEW MY TICKETS
          </a>
          <p style="color:rgba(255,248,240,0.25);font-size:12px;margin-top:16px">Or go to: ${accountUrl}</p>
        </td></tr>

        <tr><td style="height:40px"></td></tr>
        <tr><td style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:24px">
          <p style="color:rgba(255,248,240,0.25);font-size:12px;margin:0">Tequila Fest USA · tequilafestusa.com</p>
          <p style="color:rgba(255,248,240,0.15);font-size:11px;margin:8px 0 0">Must be 21+ · Tickets are non-transferable</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── QR Ticket Email ─────────────────────────────────────────────────────────
export interface TicketInstance {
  qrCode: string;
  ticketNumber: number;
  totalInOrder: number;
  holderName: string;
  ticketType: string;
}

export function qrTicketHtml({
  firstName,
  eventCity,
  eventDate,
  eventTime,
  eventVenue,
  orderNumber,
  tickets,
  appUrl,
  total,
  ticketType,
  quantity,
  newPassword,
}: {
  firstName: string;
  eventCity: string;
  eventDate: string;
  eventTime: string;
  eventVenue: string;
  orderNumber: string;
  tickets: TicketInstance[];
  appUrl: string;
  total?: number;
  ticketType?: string;
  quantity?: number;
  newPassword?: string;
}) {
  const ticketCards = tickets.map(t => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(t.qrCode)}`;
    const typeStyle = t.ticketType.toLowerCase().includes("vip")
      ? "background:#1a1a1a;border:2px solid #C0C0C0;color:#C0C0C0;"
      : "background:#1a0e00;border:2px solid #F5A623;color:#F5A623;";
    return `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;margin-bottom:20px">
      <tr>
        <td style="background:linear-gradient(135deg,#1a0e00,#0d0500);padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08)">
          <p style="margin:0;color:rgba(255,248,240,0.4);font-size:11px;letter-spacing:2px;text-transform:uppercase">Ticket #${t.ticketNumber} of ${t.totalInOrder}</p>
          <p style="margin:4px 0 0;font-family:Arial;font-size:20px;font-weight:900;letter-spacing:3px;color:#F5A623">TEQUILA FEST ${eventCity.toUpperCase()}</p>
          <p style="margin:2px 0 0;color:rgba(255,248,240,0.5);font-size:13px">${eventDate} · ${eventTime}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:20px;display:flex;align-items:center;gap:20px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td width="180" valign="top" style="padding-right:20px">
                <img src="${qrUrl}" width="160" height="160" alt="QR Code ${t.qrCode}" style="display:block;border-radius:8px;border:4px solid white" />
                <p style="margin:8px 0 0;color:rgba(255,248,240,0.25);font-family:monospace;font-size:9px;text-align:center;word-break:break-all">${t.qrCode}</p>
              </td>
              <td valign="top">
                <p style="margin:0 0 4px;color:rgba(255,248,240,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px">Ticket Holder</p>
                <p style="margin:0 0 16px;color:#fff8f0;font-size:16px;font-weight:700">${t.holderName}</p>
                <span style="${typeStyle}font-family:Arial;font-size:14px;font-weight:900;letter-spacing:2px;text-transform:uppercase;padding:6px 16px;border-radius:50px">${t.ticketType}</span>
                <p style="margin:16px 0 0;color:rgba(255,248,240,0.35);font-size:12px">${eventVenue}</p>
                <p style="margin:6px 0 0;color:rgba(255,248,240,0.25);font-size:11px">Show QR at door · Must be 21+</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="background:rgba(0,0,0,0.3);padding:10px 20px;text-align:right">
          <p style="margin:0;color:rgba(255,248,240,0.15);font-size:10px">Order #${orderNumber} · TequilaFestUSA.com · Non-transferable</p>
        </td>
      </tr>
    </table>`;
  }).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0500;font-family:'Segoe UI',Arial,sans-serif;color:#fff8f0">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d0500;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">

        <tr><td style="text-align:center;padding-bottom:24px">
          <p style="font-family:Arial;font-size:32px;font-weight:900;letter-spacing:4px;color:#F5A623;margin:0">TEQUILA FEST USA</p>
        </td></tr>

        <tr><td style="text-align:center;padding-bottom:28px">
          <p style="font-size:36px;margin:0 0 8px">🎟️</p>
          <p style="font-family:Arial;font-size:22px;font-weight:900;letter-spacing:2px;color:#fff8f0;margin:0">YOU'RE IN, ${firstName.toUpperCase()}!</p>
          <p style="color:rgba(255,248,240,0.5);margin:6px 0 0">Your order is confirmed. Save this email — show your QR code at the door.</p>
        </td></tr>

        ${total !== undefined ? `
        <tr><td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:18px 20px;margin-bottom:20px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><p style="margin:0;color:rgba(255,248,240,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px">Order #${orderNumber}</p></td>
              <td style="text-align:right"><p style="margin:0;color:#F5A623;font-weight:700;font-size:15px">$${total.toFixed(2)}</p></td>
            </tr>
            ${ticketType ? `<tr><td colspan="2"><p style="margin:6px 0 0;color:rgba(255,248,240,0.6);font-size:13px">${quantity}× ${ticketType} — Tequila Fest ${eventCity}</p></td></tr>` : ""}
          </table>
        </td></tr>
        <tr><td style="height:16px"></td></tr>` : ""}

        <tr><td>${ticketCards}</td></tr>

        ${newPassword ? `
        <tr><td style="height:16px"></td></tr>
        <tr><td style="background:rgba(245,166,35,0.06);border:1px solid rgba(245,166,35,0.25);border-radius:16px;padding:20px">
          <p style="color:#F5A623;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px">🔑 Your Account Was Created</p>
          <p style="color:rgba(255,248,240,0.65);font-size:13px;margin:0 0 12px">We created a Tequila Fest USA account for you so you can access your tickets anytime.</p>
          <table cellpadding="0" cellspacing="0" border="0" style="background:rgba(0,0,0,0.3);border-radius:10px;padding:12px 16px;width:100%">
            <tr><td><p style="margin:0;color:rgba(255,248,240,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px">Login URL</p><p style="margin:2px 0 8px;color:#fff8f0;font-size:13px">${appUrl}/login</p></td></tr>
            <tr><td><p style="margin:0;color:rgba(255,248,240,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px">Temporary Password</p><p style="margin:2px 0 0;color:#F5A623;font-family:monospace;font-size:15px;font-weight:700;letter-spacing:2px">${newPassword}</p></td></tr>
          </table>
          <p style="color:rgba(255,248,240,0.35);font-size:11px;margin:10px 0 0">Change your password after first login under Account Settings.</p>
        </td></tr>` : ""}

        <tr><td style="height:20px"></td></tr>

        <tr><td style="background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.2);border-radius:16px;padding:20px">
          <p style="color:#F5A623;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px">Important Reminders</p>
          <ul style="margin:0;padding:0 0 0 16px">
            ${["Doors open at 3:00 PM — arrive early for shorter lines", "Valid government-issued ID required — must be 21+", "One scan per ticket — do not share your QR code", "Tickets are non-transferable and non-refundable"].map(r => `<li style="color:rgba(255,248,240,0.6);font-size:13px;margin-bottom:6px">${r}</li>`).join("")}
          </ul>
        </td></tr>

        <tr><td style="height:24px"></td></tr>

        <tr><td style="text-align:center">
          <a href="${appUrl}/account" style="display:inline-block;background:#F5A623;color:#0d0500;font-weight:900;font-size:14px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 36px;border-radius:50px">VIEW MY TICKETS</a>
        </td></tr>

        <tr><td style="height:32px"></td></tr>
        <tr><td style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:20px">
          <p style="color:rgba(255,248,240,0.2);font-size:11px;margin:0">Questions? Email help@tequilafestusa.com · TequilaFestUSA.com</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Vendor Payment Confirmation Email ───────────────────────────────────────
// Separate from qrTicketHtml — vendors are paying for a booth spot, not a
// festival ticket, so the copy and QR label must never say "All Inclusive".
export function vendorConfirmationHtml({
  firstName,
  businessName,
  cities,
  orderNumber,
  total,
  qrCode,
  appUrl,
  newPassword,
}: {
  firstName: string;
  businessName: string;
  cities: string[];
  orderNumber: string;
  total: number;
  qrCode: string;
  appUrl: string;
  newPassword?: string;
}) {
  const cityLabel = cities.join(", ");
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=10&data=${encodeURIComponent(qrCode)}`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0500;font-family:'Segoe UI',Arial,sans-serif;color:#fff8f0">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d0500;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">

        <tr><td style="text-align:center;padding-bottom:24px">
          <p style="font-family:Arial;font-size:32px;font-weight:900;letter-spacing:4px;color:#F5A623;margin:0">TEQUILA FEST USA</p>
        </td></tr>

        <tr><td style="text-align:center;padding-bottom:28px">
          <p style="font-size:36px;margin:0 0 8px">🏪</p>
          <p style="font-family:Arial;font-size:22px;font-weight:900;letter-spacing:2px;color:#fff8f0;margin:0">YOU'RE CONFIRMED, ${firstName.toUpperCase()}!</p>
          <p style="color:rgba(255,248,240,0.5);margin:6px 0 0">Your vendor spot payment is confirmed. Save this email — show your QR code on-site.</p>
        </td></tr>

        <tr><td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:18px 20px">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td><p style="margin:0;color:rgba(255,248,240,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px">Order #${orderNumber}</p></td>
              <td style="text-align:right"><p style="margin:0;color:#F5A623;font-weight:700;font-size:15px">$${total.toFixed(2)}</p></td>
            </tr>
            <tr><td colspan="2"><p style="margin:6px 0 0;color:rgba(255,248,240,0.6);font-size:13px">1× Vendor Spot — ${cityLabel}</p></td></tr>
          </table>
        </td></tr>

        <tr><td style="height:16px"></td></tr>

        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111;border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden">
            <tr>
              <td style="background:linear-gradient(135deg,#1a0e00,#0d0500);padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.08)">
                <p style="margin:0;color:rgba(255,248,240,0.4);font-size:11px;letter-spacing:2px;text-transform:uppercase">Vendor Pass 1 of 1</p>
                <p style="margin:4px 0 0;font-family:Arial;font-size:20px;font-weight:900;letter-spacing:3px;color:#F5A623">TEQUILA FEST USA</p>
                <p style="margin:2px 0 0;color:rgba(255,248,240,0.5);font-size:13px">${cityLabel} · 2026</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td width="180" valign="top" style="padding-right:20px">
                      <img src="${qrUrl}" width="160" height="160" alt="QR Code ${qrCode}" style="display:block;border-radius:8px;border:4px solid white" />
                      <p style="margin:8px 0 0;color:rgba(255,248,240,0.25);font-family:monospace;font-size:9px;text-align:center;word-break:break-all">${qrCode}</p>
                    </td>
                    <td valign="top">
                      <p style="margin:0 0 4px;color:rgba(255,248,240,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px">Business</p>
                      <p style="margin:0 0 16px;color:#fff8f0;font-size:16px;font-weight:700">${businessName}</p>
                      <span style="background:#1a0e00;border:2px solid #F5A623;color:#F5A623;font-family:Arial;font-size:14px;font-weight:900;letter-spacing:2px;text-transform:uppercase;padding:6px 16px;border-radius:50px">Vendor</span>
                      <p style="margin:16px 0 0;color:rgba(255,248,240,0.35);font-size:12px">Show QR at vendor check-in · Must be 21+</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:rgba(0,0,0,0.3);padding:10px 20px;text-align:right">
                <p style="margin:0;color:rgba(255,248,240,0.15);font-size:10px">Order #${orderNumber} · TequilaFestUSA.com · Non-transferable</p>
              </td>
            </tr>
          </table>
        </td></tr>

        ${newPassword ? `
        <tr><td style="height:16px"></td></tr>
        <tr><td style="background:rgba(245,166,35,0.06);border:1px solid rgba(245,166,35,0.25);border-radius:16px;padding:20px">
          <p style="color:#F5A623;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px">🔑 Your Account Was Created</p>
          <p style="color:rgba(255,248,240,0.65);font-size:13px;margin:0 0 12px">We created a Tequila Fest USA account for you so you can access your vendor details anytime.</p>
          <table cellpadding="0" cellspacing="0" border="0" style="background:rgba(0,0,0,0.3);border-radius:10px;padding:12px 16px;width:100%">
            <tr><td><p style="margin:0;color:rgba(255,248,240,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px">Login URL</p><p style="margin:2px 0 8px;color:#fff8f0;font-size:13px">${appUrl}/login</p></td></tr>
            <tr><td><p style="margin:0;color:rgba(255,248,240,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px">Temporary Password</p><p style="margin:2px 0 0;color:#F5A623;font-family:monospace;font-size:15px;font-weight:700;letter-spacing:2px">${newPassword}</p></td></tr>
          </table>
          <p style="color:rgba(255,248,240,0.35);font-size:11px;margin:10px 0 0">Change your password after first login under Account Settings.</p>
        </td></tr>` : ""}

        <tr><td style="height:20px"></td></tr>

        <tr><td style="background:rgba(245,166,35,0.08);border:1px solid rgba(245,166,35,0.2);border-radius:16px;padding:20px">
          <p style="color:#F5A623;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 10px">Important Reminders</p>
          <ul style="margin:0;padding:0 0 0 16px">
            ${["Vendor load-in is from 12pm to 2pm.", "Valid government-issued ID required — must be 21+", "No vendors will be able to enter the grounds after 2pm.", "You will be provided a 10x10 area. Tent, table and chairs are your responsibility."].map(r => `<li style="color:rgba(255,248,240,0.6);font-size:13px;margin-bottom:6px">${r}</li>`).join("")}
          </ul>
        </td></tr>

        <tr><td style="height:24px"></td></tr>

        <tr><td style="text-align:center">
          <a href="${appUrl}/account" style="display:inline-block;background:#F5A623;color:#0d0500;font-weight:900;font-size:14px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 36px;border-radius:50px">VIEW MY VENDOR DETAILS</a>
        </td></tr>

        <tr><td style="height:32px"></td></tr>
        <tr><td style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:20px">
          <p style="color:rgba(255,248,240,0.2);font-size:11px;margin:0">Questions? Email partners@tequilafestusa.com · TequilaFestUSA.com</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Password Reset Email ─────────────────────────────────────────────────────
export function passwordResetHtml({ resetUrl }: { resetUrl: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0500;font-family:'Segoe UI',Arial,sans-serif;color:#fff8f0">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d0500;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">
        <tr><td style="text-align:center;padding-bottom:32px">
          <p style="font-family:Arial,sans-serif;font-size:32px;font-weight:900;letter-spacing:4px;color:#F5A623;margin:0">TEQUILA FEST USA</p>
        </td></tr>
        <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:32px;text-align:center">
          <p style="font-size:40px;margin:0 0 16px">🔑</p>
          <p style="font-size:22px;font-weight:700;color:#fff8f0;margin:0 0 12px">Reset Your Password</p>
          <p style="color:rgba(255,248,240,0.5);font-size:15px;margin:0 0 28px">Click the button below to reset your password. This link expires in 1 hour.</p>
          <a href="${resetUrl}" style="display:inline-block;background:#F5A623;color:#0d0500;font-weight:900;font-size:15px;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:14px 36px;border-radius:50px">RESET PASSWORD</a>
          <p style="color:rgba(255,248,240,0.25);font-size:12px;margin:24px 0 0">If you didn't request this, ignore this email. Your password won't change.</p>
          <p style="color:rgba(255,248,240,0.2);font-size:11px;margin:8px 0 0;word-break:break-all">Or copy: ${resetUrl}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Claim Account Email ──────────────────────────────────────────────────────
export function claimAccountHtml({ firstName, signupUrl, points }: { firstName: string; signupUrl: string; points: number }) {
  const steps = [
    "Go to tequilafestusa.com/signup",
    "Enter the <strong style='color:#fff8f0'>same email address</strong> you used to buy your ticket",
    "Create a password",
    "Your tickets &amp; points appear automatically in your dashboard",
  ];
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0500;font-family:'Segoe UI',Arial,sans-serif;color:#fff8f0">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0d0500;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%">

        <tr><td style="text-align:center;padding-bottom:32px">
          <p style="font-family:Arial,sans-serif;font-size:36px;font-weight:900;letter-spacing:4px;color:#F5A623;margin:0">TEQUILA FEST</p>
          <p style="font-family:Arial,sans-serif;font-size:18px;color:#ffffff;letter-spacing:6px;margin:4px 0 0">USA</p>
        </td></tr>

        <tr><td style="background:linear-gradient(135deg,#1a0e00,#2a1800);border:1px solid rgba(245,166,35,0.3);border-radius:16px;padding:32px;text-align:center">
          <p style="font-size:48px;margin:0 0 12px">🏆</p>
          <p style="font-family:Arial;font-size:26px;font-weight:900;letter-spacing:2px;color:#F5A623;margin:0 0 8px">YOU'VE GOT POINTS WAITING!</p>
          <p style="color:rgba(255,248,240,0.7);font-size:16px;margin:0 0 24px">Hi ${firstName} — we just launched our Rewards Program and your ticket purchase already earned you points.</p>

          <table cellpadding="0" cellspacing="0" border="0" style="background:rgba(245,166,35,0.12);border:1px solid rgba(245,166,35,0.3);border-radius:12px;padding:20px 40px;margin:0 auto 28px">
            <tr><td style="text-align:center">
              <p style="margin:0;color:rgba(255,248,240,0.5);font-size:12px;letter-spacing:2px;text-transform:uppercase">Your Points Waiting</p>
              <p style="margin:8px 0 0;font-family:Arial;font-size:52px;font-weight:900;color:#F5A623;line-height:1">${points}</p>
              <p style="margin:4px 0 0;color:#F5A623;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase">PTS</p>
            </td></tr>
          </table>

          <p style="color:rgba(255,248,240,0.6);font-size:15px;margin:0 0 24px">Create your free account using <strong style="color:#fff8f0">the same email address you used to buy your ticket</strong> and everything will automatically appear in your dashboard.</p>

          <p style="color:rgba(255,248,240,0.5);font-size:13px;font-weight:700;margin:0 0 16px;text-transform:uppercase;letter-spacing:1px;text-align:left">How to set up your account:</p>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:28px;text-align:left">
            ${steps.map((step, i) => `
            <tr><td style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
              <table cellpadding="0" cellspacing="0" border="0"><tr>
                <td width="36" valign="top">
                  <span style="display:inline-block;width:26px;height:26px;background:rgba(245,166,35,0.2);border:1px solid rgba(245,166,35,0.4);border-radius:50%;text-align:center;line-height:26px;font-size:12px;font-weight:700;color:#F5A623">${i + 1}</span>
                </td>
                <td style="color:rgba(255,248,240,0.75);font-size:14px;vertical-align:middle">${step}</td>
              </tr></table>
            </td></tr>`).join("")}
          </table>

          <a href="${signupUrl}" style="display:inline-block;background:#F5A623;color:#0d0500;font-weight:900;font-size:18px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:18px 48px;border-radius:50px">
            CREATE MY ACCOUNT
          </a>
          <p style="color:rgba(255,248,240,0.25);font-size:12px;margin-top:16px">Or copy: ${signupUrl}</p>
        </td></tr>

        <tr><td style="padding:24px 0">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:20px">
            <tr><td>
              <p style="margin:0 0 12px;font-weight:700;color:#fff8f0;font-size:14px">Once you're in, you can:</p>
              ${["View and download your digital tickets &amp; QR codes", "Earn more points — upload photos, share on social, refer friends", "Climb the leaderboard and compete for VIP upgrades", "Manage your profile and full order history"].map(item =>
                `<p style="margin:0 0 8px;color:rgba(255,248,240,0.55);font-size:13px">✓ ${item}</p>`).join("")}
            </td></tr>
          </table>
        </td></tr>

        <tr><td style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:24px">
          <p style="color:rgba(255,248,240,0.25);font-size:12px;margin:0">Tequila Fest USA · tequilafestusa.com</p>
          <p style="color:rgba(255,248,240,0.15);font-size:11px;margin:8px 0 0">Must be 21+ · Tickets are non-transferable</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
