import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY || "re_placeholder");
export const FROM_EMAIL = "Tequila Fest USA <help@tequilafestusa.com>";

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
          <a href="https://tequila-fest-usa.vercel.app/account" style="display:inline-block;background:#F5A623;color:#0d0500;font-weight:900;font-size:16px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:16px 40px;border-radius:50px">VIEW MY TICKETS</a>
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
