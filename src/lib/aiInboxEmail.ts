const ADMIN_EMAIL = "adam@tequilafestusa.com";
export { ADMIN_EMAIL };

export function buildReplyHtml(customerName: string, replyText: string): string {
  const escaped = replyText.replace(/\n/g, "<br>");
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0500;font-family:'Segoe UI',Arial,sans-serif;color:#fff8f0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0500;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <tr><td style="text-align:center;padding-bottom:24px">
          <p style="font-family:Arial;font-size:28px;font-weight:900;letter-spacing:4px;color:#F5A623;margin:0">TEQUILA FEST USA</p>
        </td></tr>
        <tr><td style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px">
          <p style="color:rgba(255,248,240,0.5);font-size:13px;margin:0 0 12px">Hi ${customerName},</p>
          <div style="color:#fff8f0;font-size:15px;line-height:1.7">${escaped}</div>
        </td></tr>
        <tr><td style="height:24px"></td></tr>
        <tr><td style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:20px">
          <p style="color:rgba(255,248,240,0.2);font-size:11px;margin:0">Tequila Fest USA · help@tequilafestusa.com · tequilafestusa.com</p>
          <p style="color:rgba(255,248,240,0.15);font-size:10px;margin:6px 0 0">Need further help? Reply to this email.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildEscalationHtml(
  name: string, email: string, subject: string, message: string, orderInfo: string | null
): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.tequilafestusa.com";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0d0500;font-family:'Segoe UI',Arial,sans-serif;color:#fff8f0">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0500;padding:40px 20px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
        <tr><td style="text-align:center;padding-bottom:24px">
          <p style="font-family:Arial;font-size:28px;font-weight:900;letter-spacing:4px;color:#F5A623;margin:0">TEQUILA FEST USA</p>
          <p style="color:rgba(255,248,240,0.4);font-size:13px;margin:8px 0 0">AI Inbox — Needs Human Review</p>
        </td></tr>
        <tr><td style="background:rgba(245,166,35,0.08);border:2px solid rgba(245,166,35,0.4);border-radius:16px;padding:24px">
          <p style="color:#F5A623;font-weight:700;font-size:16px;margin:0 0 16px">⚠️ Open Ticket — Action Required</p>
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
              <span style="color:rgba(255,248,240,0.4);font-size:12px">FROM</span><br>
              <span style="color:#fff8f0;font-size:14px">${name} &lt;${email}&gt;</span>
            </td></tr>
            <tr><td style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06)">
              <span style="color:rgba(255,248,240,0.4);font-size:12px">SUBJECT</span><br>
              <span style="color:#fff8f0;font-size:14px">${subject}</span>
            </td></tr>
            <tr><td style="padding:10px 0 0">
              <span style="color:rgba(255,248,240,0.4);font-size:12px">MESSAGE</span><br>
              <span style="color:#fff8f0;font-size:14px;line-height:1.6">${message.replace(/\n/g, "<br>")}</span>
            </td></tr>
          </table>
        </td></tr>
        ${orderInfo ? `
        <tr><td style="height:12px"></td></tr>
        <tr><td style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:16px">
          <p style="color:rgba(255,248,240,0.4);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:0 0 8px">Order History</p>
          <p style="color:#fff8f0;font-size:13px;font-family:monospace;margin:0;white-space:pre-wrap">${orderInfo}</p>
        </td></tr>` : ""}
        <tr><td style="height:20px"></td></tr>
        <tr><td style="text-align:center">
          <a href="${appUrl}/admin" style="display:inline-block;background:#F5A623;color:#0d0500;font-weight:900;font-size:14px;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 32px;border-radius:50px">
            Open Ticket in Tequila Fest Inbox →
          </a>
        </td></tr>
        <tr><td style="height:24px"></td></tr>
        <tr><td style="text-align:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:20px">
          <p style="color:rgba(255,248,240,0.2);font-size:11px;margin:0">AI could not confidently answer this ticket · Tequila Fest USA Admin</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
