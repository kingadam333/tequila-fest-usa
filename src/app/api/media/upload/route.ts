import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  try {
    const { fileData, fileName, mediaType, eventId, caption, termsAccepted } = await req.json();

    if (!fileData || !fileName || !mediaType) {
      return NextResponse.json({ error: "fileData, fileName, and mediaType are required" }, { status: 400 });
    }
    if (!eventId) return NextResponse.json({ error: "Please select an event" }, { status: 400 });
    if (!termsAccepted) return NextResponse.json({ error: "You must accept the Terms to upload" }, { status: 400 });
    if (!["photo", "video"].includes(mediaType)) {
      return NextResponse.json({ error: "mediaType must be photo or video" }, { status: 400 });
    }

    // Get session user (optional — award points if logged in)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();

    const dropboxToken = process.env.DROPBOX_ACCESS_TOKEN;
    if (!dropboxToken) return NextResponse.json({ error: "Upload service not configured" }, { status: 500 });

    // Build Dropbox path
    const now = new Date();
    const dateFolder = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
    const folderPath = `/TequilaFest/${mediaType}s/events/${eventId}/${dateFolder}`;
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${timestamp}_${sanitizedName}`;
    const dropboxPath = `${folderPath}/${uniqueFileName}`;

    const base64Data = fileData.replace(/^data:[^;]+;base64,/, "");
    const fileBuffer = Buffer.from(base64Data, "base64");

    const uploadResponse = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dropboxToken}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({ path: dropboxPath, mode: "add", autorename: true, mute: false }),
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      console.error("Dropbox upload error:", await uploadResponse.text());
      return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
    }

    const dropboxResult = await uploadResponse.json();
    const pointsAwarded = mediaType === "photo" ? 25 : 50;
    const db = supabaseAdmin as any;

    // Save upload record
    const uploadRecord: any = {
      event_id: eventId,
      media_type: mediaType,
      file_name: uniqueFileName,
      dropbox_path: dropboxResult.path_display || dropboxPath,
      caption: caption || null,
      points_awarded: pointsAwarded,
      status: "approved",
    };
    if (user) uploadRecord.customer_id = user.id;

    await db.from("media_uploads").insert(uploadRecord);

    // Award points if logged in
    if (user) {
      const { data: account } = await db
        .from("customer_accounts")
        .select("id, loyalty_points")
        .eq("id", user.id)
        .single();

      if (account) {
        await db.from("customer_accounts")
          .update({ loyalty_points: (account.loyalty_points || 0) + pointsAwarded })
          .eq("id", user.id);

        await db.from("loyalty_transactions").insert({
          customer_id: user.id,
          action_code: mediaType === "photo" ? "photo_upload" : "video_upload",
          points: pointsAwarded,
          description: `Uploaded a ${mediaType} from Tequila Fest ${eventId}`,
          source_id: dropboxResult.id || uniqueFileName,
          source_type: "media_upload",
        });
      }
    }

    return NextResponse.json({
      success: true,
      dropboxPath: dropboxResult.path_display || dropboxPath,
      fileName: uniqueFileName,
      pointsAwarded,
      message: `${mediaType === "photo" ? "Photo" : "Video"} uploaded! You earned ${pointsAwarded} points.`,
      authenticated: !!user,
    });
  } catch (err) {
    console.error("Media upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
