import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "스테이픽 - 수수료 없는 숙소 예약",
  description: "운영자 직계좌 이체로 수수료 없이 예약하는 숙박 플랫폼",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
