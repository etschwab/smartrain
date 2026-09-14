import { ImageResponse } from "next/og";

/** Renders the "ST" wordmark badge used across favicon/app icons, scaled to the requested size. */
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
          background: "#f33f55",
          color: "#090d0f",
          fontSize: Math.round(pixelSize * 0.47),
          fontWeight: 900,
          letterSpacing: -pixelSize * 0.015,
          fontFamily: "sans-serif"
        }}
      >
        ST
      </div>
    ),
    { width: pixelSize, height: pixelSize }
  );
}
