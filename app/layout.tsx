import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Research (Phase 1A)",
  description: "Internal research job prototype",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
