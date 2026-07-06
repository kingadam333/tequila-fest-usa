import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Vendors Wanted — Tequila Fest USA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "radial-gradient(ellipse at 50% 30%, rgba(245,166,35,0.18) 0%, rgba(13,5,0,1) 62%)",
          backgroundColor: "#0d0500",
        }}
      >
        {/* Decorative confetti dots, matching hero page accents */}
        {[
          { top: 60, left: 90, color: "#C8102E", size: 22 },
          { top: 120, left: 1050, color: "#F5A623", size: 16 },
          { top: 500, left: 130, color: "#7B2FBE", size: 18 },
          { top: 460, left: 1080, color: "#F5A623", size: 24 },
          { top: 90, left: 620, color: "#7B2FBE", size: 14 },
          { top: 540, left: 600, color: "#C8102E", size: 16 },
        ].map((d, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              top: d.top,
              left: d.left,
              width: d.size,
              height: d.size,
              borderRadius: 9999,
              background: d.color,
              opacity: 0.55,
            }}
          />
        ))}

        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 10,
            fontWeight: 700,
            color: "#F5A623",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Tequila Fest USA
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontSize: 130,
            fontWeight: 900,
            letterSpacing: 2,
            textTransform: "uppercase",
            lineHeight: 1.05,
          }}
        >
          <span style={{ color: "#F5A623" }}>VENDORS</span>
          <span style={{ color: "#ffffff" }}>WANTED</span>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 30,
            color: "rgba(255,248,240,0.6)",
            letterSpacing: 2,
          }}
        >
          Cincinnati · Cleveland · Columbus · Phoenix
        </div>

        <div
          style={{
            display: "flex",
            width: 140,
            height: 6,
            borderRadius: 9999,
            background: "#F5A623",
            marginTop: 34,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
