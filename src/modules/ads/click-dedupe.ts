export const CLICK_DEDUPE_WINDOW_MS = 60 * 60 * 1000;

export function shouldCountClick(
  lastCountedAt: Date | null,
  now: Date,
  windowMs = CLICK_DEDUPE_WINDOW_MS
): boolean {
  if (!lastCountedAt) return true;
  return now.getTime() - lastCountedAt.getTime() >= windowMs;
}
