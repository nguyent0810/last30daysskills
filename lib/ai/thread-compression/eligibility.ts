/** Phase 6 V1: when the thread page may offer AI compression. */
export function isThreadAiCompressionEligible(runCount: number, briefCharLength: number): boolean {
  return runCount >= 2 || briefCharLength > 600;
}
