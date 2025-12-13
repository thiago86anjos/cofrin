export function formatCurrencyBRL(value: number | string) {
  const n = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
  try {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  } catch (e) {
    const sign = n < 0 ? '-' : '';
    const abs = Math.abs(n).toFixed(2);
    return `${sign}R$ ${abs}`;
  }
}

export function formatCurrencyBRLPositive(v: number) {
  // keeps previous behavior when passing -expenses
  return formatCurrencyBRL(v);
}
