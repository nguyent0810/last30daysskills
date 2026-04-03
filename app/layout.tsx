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
          <div className="site-shell">
            <SiteHeader />
            <main className="site-main">{children}</main>
            <footer className="site-footer">
              <div className="site-footer__inner">
                <span>Research</span>
                <span className="site-footer__sep" aria-hidden>
                  ·
                </span>
                <span>Public signal research workspace</span>
                <span className="site-footer__sep" aria-hidden>
                  ·
                </span>
                <span className="muted">Session-only data, no sign-in required</span>
              </div>
            </footer>
          </div>
        </MotionShell>
      </body>
    </html>
  );
}
