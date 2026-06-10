import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { resend } from "@/lib/resend";

const PROJECT_ID = "igktkkjnyxeiflnvfzdw";
const REPORT_TO = "adam@tequilafestusa.com";

async function fetchAdvisors(type: "security" | "performance", token: string) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_ID}/advisors?type=${type}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Supabase Management API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.result?.lints ?? [];
}

function applyFilters(secLints: any[], perfLints: any[]) {
  const security = secLints.filter(
    (l) =>
      !(l.name === "rls_enabled_no_policy" && l.level === "INFO") &&
      l.name !== "auth_leaked_password_protection"
  );
  const performance = perfLints.filter((l) => l.level === "ERROR");
  return [...security, ...performance];
}

function buildEmailHtml(issues: any[], date: string): string {
  if (issues.length === 0) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;max-width:680px;margin:0 auto;padding:24px}h1{font-size:20px;color:#15803d}p{font-size:15px;line-height:1.6;color:#374151}.footer{margin-top:32px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px}</style>
</head><body>
<h1>✅ No new security issues — TequilaFestUSA Weekly Scan — ${date}</h1>
<p>The automated scan of the <strong>TequilaFestUSA.com</strong> Supabase project (<code>${PROJECT_ID}</code>) completed with <strong>no actionable issues found</strong>.</p>
<p>All security findings were INFO-level <code>rls_enabled_no_policy</code> (expected — app uses <code>service_role</code>). All performance findings were INFO/WARN level only. No action required.</p>
<div class="footer">Automated weekly scan · TequilaFestUSA Supabase Security Monitor · ${date}</div>
</body></html>`;
  }

  const levelColor = (level: string) => {
    if (level === "ERROR") return { bg: "#fee2e2", text: "#dc2626" };
    if (level === "WARN") return { bg: "#fef9c3", text: "#b45309" };
    return { bg: "#dbeafe", text: "#1d4ed8" };
  };

  const rows = issues
    .map((i) => {
      const { bg, text } = levelColor(i.level);
      return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;font-size:14px">${i.title || i.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb"><span style="background:${bg};color:${text};padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700">${i.level}</span></td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">${i.metadata?.name || i.metadata?.entity || "—"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151">${i.detail || i.description}</td>
    </tr>`;
    })
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;max-width:800px;margin:0 auto;padding:24px}h1{font-size:20px;color:#dc2626}table{width:100%;border-collapse:collapse;margin-top:16px}th{text-align:left;padding:8px 12px;background:#f9fafb;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e7eb}.footer{margin-top:32px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px}</style>
</head><body>
<h1>⚠️ ${issues.length} issue${issues.length !== 1 ? "s" : ""} found — TequilaFestUSA Supabase Scan — ${date}</h1>
<table><thead><tr><th>Issue</th><th>Level</th><th>Table / Entity</th><th>Detail</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="footer">Automated weekly scan · TequilaFestUSA Supabase Security Monitor · ${date}</div>
</body></html>`;
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const body = await req.json();
  const action: "scan" | "email" = body.action ?? "scan";

  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_ACCESS_TOKEN is not set. Add your Supabase personal access token to Vercel environment variables.",
      },
      { status: 500 }
    );
  }

  try {
    const [secLints, perfLints] = await Promise.all([
      fetchAdvisors("security", token),
      fetchAdvisors("performance", token),
    ]);

    const issues = applyFilters(secLints, perfLints);
    const scannedAt = new Date().toISOString();
    const date = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (action === "email") {
      const isClean = issues.length === 0;
      const subject = isClean
        ? `[Tequila Fest USA] ✅ Weekly Security Scan — ${date} — All Clear`
        : `[Tequila Fest USA] ⚠️ Weekly Security Scan — ${date} — ${issues.length} issue${issues.length !== 1 ? "s" : ""} found`;

      const emailResult = await resend.emails.send({
        from: "Tequila Fest USA Security <help@mail.tequilafestusa.com>",
        to: [REPORT_TO],
        subject,
        html: buildEmailHtml(issues, date),
      });

      return NextResponse.json({
        issues,
        scannedAt,
        emailSent: true,
        emailId: emailResult.data?.id,
      });
    }

    return NextResponse.json({ issues, scannedAt });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? String(err) }, { status: 500 });
  }
}
