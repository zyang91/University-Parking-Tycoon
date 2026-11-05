export function money(n: number): string {
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(2)}M`;
  if (a >= 1_000) return `${sign}$${Math.round(a / 1000).toLocaleString()}k`;
  return `${sign}$${Math.round(a)}`;
}

export function signed(n: number, digits = 0): string {
  const v = Number(n.toFixed(digits));
  if (v === 0) return '±0';
  return `${v > 0 ? '+' : '−'}${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: digits })}`;
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}
