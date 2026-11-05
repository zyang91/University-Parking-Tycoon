// Language-neutral number helpers. Money formatting lives in engine/text.ts (it is language-aware).

export function signed(n: number, digits = 0): string {
  const v = Number(n.toFixed(digits));
  if (v === 0) return '±0';
  return `${v > 0 ? '+' : '−'}${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: digits })}`;
}
