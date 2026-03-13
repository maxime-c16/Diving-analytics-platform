import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import type { CommercialProps } from "./DivingAnalyticsCommercial";

const palette = {
  ink: "#191510",
  paper: "#f3efe6",
  surface: "#fbf8f1",
  line: "#cfbfaa",
  accent: "#b46234",
  muted: "#706555",
};

export const DivingAnalyticsPoster: React.FC<CommercialProps> = ({ title, subtitle }) => {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: palette.paper,
        color: palette.ink,
        fontFamily: "'Avenir Next', 'Helvetica Neue', Helvetica, Arial, sans-serif",
        padding: 76,
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "0.88fr 1.12fr", gap: 34, height: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 24, color: palette.accent, marginBottom: 16, fontWeight: 700 }}>
              Commercial presentation
            </div>
            <div style={{ fontSize: 92, lineHeight: 0.92, fontWeight: 700, letterSpacing: "-0.06em" }}>{title}</div>
            <div style={{ marginTop: 22, fontSize: 28, lineHeight: 1.35, color: palette.muted }}>{subtitle}</div>
          </div>
          <div style={{ borderTop: `1px solid ${palette.line}`, paddingTop: 22, display: "grid", gap: 10 }}>
            {[
              "Official result-sheet intake",
              "Competition, athlete, and club workspaces",
              "Technique breakdown by dive group",
              "Exact deep links back to the ledger",
            ].map((item) => (
              <div key={item} style={{ fontSize: 22 }}>
                {item}
              </div>
            ))}
          </div>
        </div>
        <div
          style={{
            border: `1px solid ${palette.line}`,
            backgroundColor: palette.surface,
            padding: 18,
            display: "grid",
            gridTemplateRows: "1fr 1fr",
            gap: 18,
          }}
        >
          <Img src={staticFile("shots/competition.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <Img src={staticFile("shots/athlete-maxime.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <Img src={staticFile("shots/technique-mathis.png")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
