"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { DURATION_FAST_S, SHELL_EASE, shellTransitionMedium } from "@/lib/motion/shell";

export function SiteHeader() {
  const pathname = usePathname();
  const newActive = pathname === "/";
  const historyActive = pathname === "/history" || pathname.startsWith("/history/");

  return (
    <header className="site-header">
      <motion.span
        whileHover={{ opacity: 0.88 }}
        whileTap={{ scale: 0.99 }}
        transition={shellTransitionMedium}
        style={{ display: "inline-block" }}
      >
        <Link href="/" className="site-header-brand">
          <span className="site-header-brand__mark" aria-hidden>
            ◇
          </span>
          <span className="site-header-brand__wording">
            <strong>Research</strong>
            <span className="site-header-brand__tag">Public Signal Workspace</span>
          </span>
        </Link>
      </motion.span>
      <nav className="site-nav">
        <NavLink href="/" isActive={newActive}>
          New Research
        </NavLink>
        <NavLink href="/history" isActive={historyActive}>
          History
        </NavLink>
      </nav>
    </header>
  );
}

function NavLink({
  href,
  isActive,
  children,
}: {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.span
      whileHover={isActive ? undefined : { opacity: 0.82 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: DURATION_FAST_S, ease: SHELL_EASE }}
      style={{ display: "inline-block" }}
    >
      <Link href={href} className={isActive ? "site-nav__link site-nav__link--active" : "site-nav__link"}>
        {children}
      </Link>
    </motion.span>
  );
}
