export function americanToDecimal(american: number) {
  if (american === 0) return 1;
  if (american > 0) return 1 + american / 100;
  return 1 + 100 / Math.abs(american);
}

export function formatMoney(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const n = Math.abs(cents);
  const d = (n / 100).toFixed(2);
  return `${sign}${d}`;
}
