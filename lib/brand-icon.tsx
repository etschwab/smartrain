import { ImageResponse } from "next/og";

/** Renders the "S" mark used across favicon/app icons, scaled to the requested size. */
export function renderBrandIcon(pixelSize: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ca2134",
          color: "#ffffff",
          fontSize: Math.round(pixelSize * 0.6),
          fontWeight: 800,
          letterSpacing: -pixelSize * 0.015,
          fontFamily: "sans-serif"
        }}
      >
        S
      </div>
    ),
    { width: pixelSize, height: pixelSize }
  );
}
