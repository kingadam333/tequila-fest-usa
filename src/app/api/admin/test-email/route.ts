import { NextRequest, NextResponse } from "next/server";
import { verifyAdminToken, unauthorizedResponse } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  if (!verifyAdminToken(req)) return unauthorizedResponse();

  const { to } = await req.json();
  if (!to) return NextResponse.json({ error: "to required" }, { status: 400 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === "re_placeholder") {
    return NextResponse.json({ error: "RESEND_API_KEY not set", key: apiKey?.slice(0, 10) });
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from: "Tequila Fest USA <help@mail.tequilafestusa.com>",
      to,
      subject: "Test Email — Tequila Fest USA",
      html: "<p>This is a test email from Tequila Fest USA. If you received this, email is working!</p>",
    });

    return NextResponse.json({
      success: true,
      result,
      keyPrefix: apiKey.slice(0, 12),
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err?.message || String(err),
      keyPrefix: apiKey?.slice(0, 12),
    });
  }
}
