"use client";

import { MotionConfig } from "motion/react";
import { DURATION_FAST_S, SHELL_EASE } from "@/lib/motion/shell";

export function MotionShell({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: DURATION_FAST_S, ease: SHELL_EASE }}>
      {children}
    </MotionConfig>
  );
}
