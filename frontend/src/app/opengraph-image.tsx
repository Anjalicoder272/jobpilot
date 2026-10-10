import { ImageResponse } from "next/og";

export const alt = "JobPilot: track applications, match your resume, prepare for interviews";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const stages = [
    ["Applied", "#3b82f6"],
    ["HR replied", "#d97706"],
    ["Interview", "#8b5cf6"],
    ["Offer", "#16a34a"],
  ];
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#fafaf9", color: "#1c1917", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 32, fontWeight: 600 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#1c1917" }} />
          JobPilot
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 72, fontWeight: 600, letterSpacing: -2, lineHeight: 1.05 }}>Your job search, finally organised.</div>
          <div style={{ fontSize: 30, color: "#57534e" }}>Track applications · Match your resume · Prepare with real questions</div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          {stages.map(([label, color]) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 20px", border: "1px solid #e7e5e4", borderRadius: 12, background: "#fff", fontSize: 24 }}>
              <div style={{ width: 12, height: 12, borderRadius: 6, background: color }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
