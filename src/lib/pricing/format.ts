// src/lib/pricing/format.ts
//
// Единственное место, где деньги превращаются в текст. Раньше
// (x / 1_000_000).toFixed(2) был скопирован в шести файлах, и из-за этого
// утильсбор Zeekr в 34 000 ₽ рисовался в легенде как «0.03».

const RUB = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

const MILLIONS = new Intl.NumberFormat("ru-RU", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Полная сумма: «844 400 ₽». Для легенды, где важна точность. */
export function formatRub(amount: number): string {
  return RUB.format(Math.round(amount));
}

/** Крупная сумма: «11,39 млн ₽». Для итога и карточек. */
export function formatMillions(amount: number): string {
  return `${MILLIONS.format(amount / 1_000_000)} млн ₽`;
}

/**
 * Адаптивно: мелкие суммы — целиком, крупные — в миллионах.
 * Слой на 46 500 ₽ и слой на 9,9 млн ₽ в одной легенде должны читаться оба.
 */
export function formatMoney(amount: number): string {
  return amount >= 1_000_000 ? formatMillions(amount) : formatRub(amount);
}

export function formatPercent(share: number): string {
  if (share > 0 && share < 0.1) return "<0,1%";
  return `${share.toFixed(1).replace(".", ",")}%`;
}

type VisibleLayer = { amount: number; isVisible?: boolean | null };

/**
 * Сумма только по видимым слоям.
 * Главная и админка раньше складывали ВСЕ слои, а виджет — только видимые,
 * поэтому одна машина показывала разные итоги на разных страницах.
 */
export function getVisibleTotal(layers: readonly VisibleLayer[]): number {
  return layers.reduce((sum, l) => (l.isVisible === false ? sum : sum + l.amount), 0);
}

export function getVisible<T extends VisibleLayer>(layers: readonly T[]): T[] {
  return layers.filter((l) => l.isVisible !== false);
}

/**
 * Ширины полос в процентах.
 * Мелкие слои подтягиваются до минимума, иначе их не видно и не нажать, но
 * затем остаток нормируется — иначе сумма ширин уходит за 100%, полосы вылезают
 * за маску, а пропорции перестают соответствовать деньгам. Для виджета про
 * пропорции это не косметика, а смысловая ошибка.
 */
export function layoutWidths(amounts: readonly number[], minPercent = 2.5): number[] {
  const total = amounts.reduce((a, b) => a + b, 0);
  if (total <= 0) return amounts.map(() => 0);

  const raw = amounts.map((a) => (a / total) * 100);
  const boosted = raw.map((p) => (p > 0 && p < minPercent ? minPercent : p));

  const boostedExtra = boosted.reduce((s, p, i) => s + (p - raw[i]), 0);
  if (boostedExtra <= 0) return boosted;

  // Забираем добавку пропорционально у тех, кого не подтягивали.
  const shrinkable = raw.reduce((s, p, i) => (boosted[i] === raw[i] ? s + p : s), 0);
  if (shrinkable <= 0) return boosted.map((p) => (p / boosted.reduce((a, b) => a + b, 0)) * 100);

  return boosted.map((p, i) =>
    boosted[i] === raw[i] ? p - (p / shrinkable) * boostedExtra : p
  );
}
