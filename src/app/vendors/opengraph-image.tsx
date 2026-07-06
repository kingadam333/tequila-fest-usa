import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Vendor Application — Tequila Fest USA";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Mirrors the actual hero section on /vendors — same headline gradients as
// .text-shimmer / .text-shimmer-blue in globals.css, same copy, same
// vendor-type cards row, just static (OG images can't animate).
const RED_ORANGE_GRADIENT = "linear-gradient(90deg, #C8102E, #F5A623, #fff8f0)";
const CYAN_BLUE_GRADIENT = "linear-gradient(90deg, #06b6d4, #0ea5e9, #1e3a8a)";

const VENDOR_TYPES = [
  { icon: "🍴", title: "Food Vendors", desc: "Tacos, elotes, appetizers & more" },
  { icon: "📦", title: "Merchandise", desc: "Branded goods & apparel" },
  { icon: "🛍️", title: "Specialty Products", desc: "Sauces, mixers & accessories" },
];

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
          Sell At Our Festivals
        </div>

        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 900,
            letterSpacing: 1,
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              backgroundImage: RED_ORANGE_GRADIENT,
              backgroundClip: "text",
              color: "transparent",
              marginRight: 22,
            }}
          >
            VENDOR
          </div>
          <div
            style={{
              display: "flex",
              backgroundImage: CYAN_BLUE_GRADIENT,
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
            marginTop: 26,
            fontSize: 24,
            color: "rgba(255,248,240,0.55)",
            textAlign: "center",
            maxWidth: 820,
            lineHeight: 1.4,
          }}
        >
          Join the Tequila Fest USA marketplace. Put your business in front of thousands of food and spirits enthusiasts across 4 cities.
        </div>

        <div style={{ display: "flex", gap: 24, marginTop: 44 }}>
          {VENDOR_TYPES.map((v, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                width: 300,
                padding: "22px 24px",
                borderRadius: 20,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "rgba(245,166,35,0.1)",
                  border: "1px solid rgba(245,166,35,0.2)",
                  fontSize: 22,
                  marginBottom: 14,
                }}
              >
                {v.icon}
              </div>
              <div style={{ display: "flex", color: "#fff8f0", fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                {v.title}
              </div>
              <div style={{ display: "flex", color: "rgba(255,248,240,0.4)", fontSize: 15, lineHeight: 1.4 }}>
                {v.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
