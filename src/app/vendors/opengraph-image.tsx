import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Vendor Application — Tequila Fest USA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Same gradient stops as .text-shimmer / .text-shimmer-blue in globals.css —
// the exact colors behind "VENDOR APPLICATION" on the live page, just
// rendered as a static gradient here since OG images can't animate.
const GOLD_GRADIENT = "linear-gradient(90deg, #F5A623, #fff8f0, #F5A623, #C8102E, #F5A623)";
const BLUE_GRADIENT = "linear-gradient(90deg, #0ea5e9, #06b6d4, #7dd3fc, #1e3a8a, #0ea5e9, #06b6d4)";

export default async function Image() {
  const logoBuffer = await fetch("https://www.tequilafestusa.com/tequilafest_usa.png").then(res => res.arrayBuffer());
  const logoBase64 = `data:image/png;base64,${Buffer.from(logoBuffer).toString("base64")}`;

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

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoBase64}
          width={140}
          height={93}
          style={{ marginBottom: 18 }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            fontWeight: 900,
            letterSpacing: 2,
            textTransform: "uppercase",
            lineHeight: 1.05,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 130,
              backgroundImage: GOLD_GRADIENT,
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            VENDOR
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 100,
              backgroundImage: BLUE_GRADIENT,
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            APPLICATION
          </div>
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
      </div>
    ),
    { ...size }
  );
}
