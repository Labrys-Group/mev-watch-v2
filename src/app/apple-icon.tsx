import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#0a0a0a",
          color: "#f5f5f5",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Arial, sans-serif",
          fontWeight: 800,
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            color: "#7cffb2",
            fontSize: 58,
            letterSpacing: 0,
            lineHeight: 1,
          }}
        >
          MEV
        </div>
        <div
          style={{
            color: "#b8b8b8",
            fontSize: 22,
            letterSpacing: 2,
            lineHeight: 1.2,
            marginTop: 10,
          }}
        >
          WATCH
        </div>
      </div>
    ),
    size,
  );
}
