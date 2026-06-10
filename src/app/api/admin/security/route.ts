import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { resend } from "@/lib/resend";

const REPORT_TO = "adam@tequilafestusa.com";

interface ScanRow {
  name: string;
  title: string;
  level: string;
  categories: string[];
  description: string;
  detail: string;
  remediation: string;
  entity_name: string;
  entity_type: string;
  entity_schema: string;
}

function applyFilters(rows: ScanRow[]) {
  return rows.filter(
    (r) =>
      !(r.name === "rls_enabled_no_policy" && r.level === "INFO") &&
      !(r.name === "unindexed_foreign_keys" && r.level === "INFO") &&
      r.name !== "auth_leaked_password_protection"
  );
}

function buildEmailHtml(issues: ScanRow[], date: string): string {
  if (issues.length === 0) {
    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;max-width:680px;margin:0 auto;padding:24px}h1{font-size:20px;color:#15803d}p{font-size:15px;line-height:1.6;color:#374151}.footer{margin-top:32px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px}</style>
</head><body>
<h1>✅ No new security issues — TequilaFestUSA Weekly Scan — ${date}</h1>
<p>The automated scan of <strong>TequilaFestUSA.com</strong> completed with <strong>no actionable issues found</strong>. All tables have RLS configured correctly. No action required.</p>
<div class="footer">Automated weekly scan · TequilaFestUSA Supabase Security Monitor · ${date}</div>
</body></html>`;
  }

  const levelColor = (level: string) => {
    if (level === "ERROR") return { bg: "#fee2e2", text: "#dc2626" };
    if (level === "WARN")  return { bg: "#fef9c3", text: "#b45309" };
    return { bg: "#dbeafe", text: "#1d4ed8" };
  };

  const rows = issues.map((i) => {
    const { bg, text } = levelColor(i.level);
    return `<tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;font-size:14px">${i.title}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb"><span style="background:${bg};color:${text};padding:2px 8px;border-radius:4px;font-size:12px;font-weight:700">${i.level}</span></td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">${i.entity_name || "—"}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#374151">${i.detail}</td>
    </tr>`;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;max-width:800px;margin:0 auto;padding:24px}h1{font-size:20px;color:#dc2626}table{width:100%;border-collapse:collapse;margin-top:16px}th{text-align:left;padding:8px 12px;background:#f9fafb;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e7eb}.footer{margin-top:32px;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:12px}</style>
</head><body>
<h1>⚠️ ${issues.length} issue${issues.length !== 1 ? "s" : ""} found — TequilaFestUSA Supabase Scan — ${date}</h1>
<table><thead><tr><th>Issue</th><th>Level</th><th>Table</th><th>Detail</th></tr></thead>
<tbody>${rows}</tbody></table>
<div class="footer">Automated weekly scan · TequilaFestUSA Supabase Security Monitor · ${date}</div>
</body></html>`;
}

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const body = await req.json();
  const action: "scan" | "email" = body.action ?? "scan";

  const { data, error } = await supabaseAdmin.rpc("security_scan");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const issues = applyFilters((data as ScanRow[]) ?? []);
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
}
