import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "32px",
        }}
      >
        <img
          src="https://www.staypick.info/staypick-logo.png"
          style={{ width: "400px", objectFit: "contain" }}
        />
        <div
          style={{
            fontSize: "32px",
            color: "#4b5563",
            letterSpacing: "-0.5px",
          }}
        >
          수수료 없는 숙소 예약 플랫폼
        </div>
      </div>
    ),
    { ...size }
  );
}
