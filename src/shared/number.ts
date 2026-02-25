export function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function safeParseInt(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  return Number.isFinite(n) ? n : null;
}

