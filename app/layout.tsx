import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SessionBootstrap } from "@/components/SessionBootstrap";

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
        <SessionBootstrap />
        <header className="site-header">
          <Link href="/" className="site-header-brand">
            <strong>Research</strong>
          </Link>
          <nav className="site-nav">
            <Link href="/">New</Link>
            <Link href="/history">History</Link>
          </nav>
        </header>
        <main className="site-main">{children}</main>
      </body>
    </html>
  );
}
