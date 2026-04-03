import type { Metadata } from "next";
import "./globals.css";
import { MotionShell } from "@/components/MotionShell";
import { SessionBootstrap } from "@/components/SessionBootstrap";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Research",
  description: "Topic research across public sources",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <MotionShell>
          <SessionBootstrap />
          <SiteHeader />
          <main className="site-main">{children}</main>
        </MotionShell>
      </body>
    </html>
  );
}
