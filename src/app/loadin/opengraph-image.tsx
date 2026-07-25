import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Vendor Load-In Info — Tequila Fest USA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const GOLD_RED_GRADIENT = "linear-gradient(90deg, #F5A623, #C8102E)";

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
          padding: "50px 70px",
          position: "relative",
          background: "radial-gradient(ellipse at 50% 20%, rgba(245,166,35,0.09) 0%, rgba(13,5,0,1) 60%)",
          backgroundColor: "#0d0500",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 22,
            letterSpacing: 8,
            fontWeight: 700,
            color: "#F5A623",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Vendor & Food Truck Load-In
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 900,
            letterSpacing: 1,
            textTransform: "uppercase",
            lineHeight: 1.05,
            textAlign: "center",
            color: "#fff8f0",
          }}
        >
          Pick The City
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 84,
            fontWeight: 900,
            letterSpacing: 1,
            textTransform: "uppercase",
            lineHeight: 1.05,
          }}
        >
          You&apos;ll Be{" "}
          <span
            style={{
              display: "flex",
              backgroundImage: GOLD_RED_GRADIENT,
              backgroundClip: "text",
              color: "transparent",
              marginLeft: 22,
            }}
          >
            Attending
          </span>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 26,
            fontSize: 24,
            color: "rgba(255,248,240,0.55)",
            textAlign: "center",
            maxWidth: 820,
            lineHeight: 1.4,
          }}
        >
          Load-in times, venue maps, and directions for every Tequila Fest USA city.
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: 44 }}>
          {["Cincinnati", "Cleveland", "Columbus", "Phoenix"].map((city) => (
            <div
              key={city}
              style={{
                display: "flex",
                padding: "16px 28px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#fff8f0",
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {city}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
