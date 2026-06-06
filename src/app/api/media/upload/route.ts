import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { fileData, fileName, mediaType, eventId, caption, termsAccepted } = await req.json();

    if (!fileData || !fileName || !mediaType) {
      return NextResponse.json({ error: "fileData, fileName, and mediaType are required" }, { status: 400 });
    }
    if (!eventId) {
      return NextResponse.json({ error: "Please select an event" }, { status: 400 });
    }
    if (!termsAccepted) {
      return NextResponse.json({ error: "You must accept the Terms to upload" }, { status: 400 });
    }
    if (!["photo", "video"].includes(mediaType)) {
      return NextResponse.json({ error: "mediaType must be photo or video" }, { status: 400 });
    }

    const dropboxToken = process.env.DROPBOX_ACCESS_TOKEN;
    if (!dropboxToken) {
      return NextResponse.json({ error: "Upload service not configured" }, { status: 500 });
    }

    // Build Dropbox path
    const now = new Date();
    const dateFolder = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}`;
    const folderPath = `/TequilaFest/${mediaType}s/events/${eventId}/${dateFolder}`;
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const uniqueFileName = `${timestamp}_${sanitizedName}`;
    const dropboxPath = `${folderPath}/${uniqueFileName}`;

    // Decode base64
    const base64Data = fileData.replace(/^data:[^;]+;base64,/, "");
    const fileBuffer = Buffer.from(base64Data, "base64");

    // Upload to Dropbox
    const uploadResponse = await fetch("https://content.dropboxapi.com/2/files/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dropboxToken}`,
        "Content-Type": "application/octet-stream",
        "Dropbox-API-Arg": JSON.stringify({
          path: dropboxPath,
          mode: "add",
          autorename: true,
          mute: false,
        }),
      },
      body: fileBuffer,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error("Dropbox upload error:", errorText);
      return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
    }

    const dropboxResult = await uploadResponse.json();
    const pointsAwarded = mediaType === "photo" ? 25 : 50;

    return NextResponse.json({
      success: true,
      dropboxPath: dropboxResult.path_display || dropboxPath,
      fileName: uniqueFileName,
      pointsAwarded,
      message: `${mediaType === "photo" ? "Photo" : "Video"} uploaded! You earned ${pointsAwarded} points.`,
    });
  } catch (err) {
    console.error("Media upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
