'use client';

/**
 * Пометка «ставка не подтверждена». Намеренно скромная: приглушённый кружок
 * с вопросительным знаком, не красный и не крупный. Продукт продаёт честность
 * структуры цены — признание неточности работает на доверие, но только если
 * выглядит спокойно, а не как авария.
 */
export default function UnverifiedMark({ theme }: { theme: 'dark' | 'light' }) {
  return (
    <span
      aria-label="ставка требует сверки"
      title="Ставка требует сверки"
      className={`inline-flex items-center justify-center w-3.5 h-3.5 shrink-0 rounded-full text-[9px] font-bold leading-none ${
        theme === 'light'
          ? 'bg-amber-500/15 text-amber-700'
          : 'bg-amber-400/15 text-amber-400/90'
      }`}
    >
      ?
    </span>
  );
}
