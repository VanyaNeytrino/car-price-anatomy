'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import UnverifiedMark from '@/components/UnverifiedMark';
import type { CarForWidget, WidgetCostLayer } from '@/types';
import { formatMoney, formatMillions, formatPercent, getVisible, layoutWidths } from '@/lib/pricing/format';

export type WidgetTheme = 'dark' | 'light';

interface LiquidCarProps {
  car: CarForWidget;
  theme?: WidgetTheme;
}

/**
 * Совместимость со старыми данными: до перехода на HEX в базе лежали классы
 * Tailwind, и незнакомый класс молча превращался в белый.
 */
const LEGACY_COLORS: Record<string, string> = {
  'bg-blue-600': '#2563eb',
  'bg-cyan-500': '#06b6d4',
  'bg-orange-600': '#ea580c',
  'bg-purple-600': '#9333ea',
  'bg-yellow-400': '#facc15',
  'bg-green-500': '#22c55e',
  'bg-slate-500': '#64748b',
};

const toHex = (color: string) =>
  color.startsWith('#') ? color : (LEGACY_COLORS[color] ?? '#94a3b8');

/**
 * Оговорка к ставке. Подтверждённые слои не помечаются ничем: помечать надо
 * исключение, иначе пометки превращаются в шум и их перестают замечать.
 * Тон спокойный — это оговорка о точности, а не сообщение об ошибке.
 */
function confidenceNote(c: WidgetCostLayer['confidence']): string | null {
  if (!c || c.status === 'VERIFIED') return null;
  if (c.status === 'STALE') {
    return `${c.lawTitle} изменился после последней сверки — ставка требует проверки`;
  }
  return `Ставка не сверена с ${c.lawTitle}`;
}

const THEMES = {
  dark: {
    panel: 'bg-white/[0.04] border-white/10 backdrop-blur-2xl',
    text: 'text-white',
    muted: 'text-zinc-400',
    faint: 'text-zinc-500',
    divider: 'border-white/10',
    rowHover: 'hover:bg-white/5',
    ghost: 'opacity-10 grayscale brightness-50',
  },
  light: {
    panel: 'bg-white border-black/10 shadow-sm',
    text: 'text-zinc-900',
    muted: 'text-zinc-600',
    faint: 'text-zinc-500',
    divider: 'border-black/10',
    rowHover: 'hover:bg-black/5',
    ghost: 'opacity-20 grayscale',
  },
} as const;

export default function LiquidCar({ car, theme = 'dark' }: LiquidCarProps) {
  // Наведение и фиксация — разные состояния. Пока они были одним, onMouseEnter
  // успевал выделить слой, а следующий клик тут же снимал выделение, и мышью
  // зафиксировать слой было нельзя.
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const selectedId = pinnedId ?? hoveredId;
  const reduceMotion = useReducedMotion();
  const t = THEMES[theme];

  /**
   * Геометрия силуэта считается из самой картинки.
   *
   * Полосы раскладываются по ширине контейнера, а маска срезает всё, что вышло
   * за машину. Пока контейнер был жёстко aspect-[2.2/1] (а маски — 1.90 и 2.00)
   * и пока не учитывались прозрачные поля внутри PNG, крайние слои попадали
   * мимо силуэта и не рисовались совсем: у машины с девятью слоями так пропадали
   * последние четыре, то есть 17% цены.
   *
   * Поэтому берём и соотношение сторон, и границы непрозрачных пикселей —
   * тогда виджет корректно работает с любой картинкой, которую загрузит дилер.
   */
  const [geometry, setGeometry] = useState<{ aspect: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (!car.maskImage) return;
    let cancelled = false;

    const img = new Image();
    img.onload = () => {
      if (cancelled || !img.naturalWidth || !img.naturalHeight) return;
      const aspect = img.naturalWidth / img.naturalHeight;

      // Уменьшаем перед сканированием: точности хватает, а работы меньше.
      const w = 240;
      const h = Math.max(1, Math.round(w / aspect));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return setGeometry({ aspect, left: 0, width: 1 });

      ctx.drawImage(img, 0, 0, w, h);
      let data: Uint8ClampedArray;
      try {
        data = ctx.getImageData(0, 0, w, h).data;
      } catch {
        // Картинка с другого домена — разметку не прочитать, берём всю ширину.
        return setGeometry({ aspect, left: 0, width: 1 });
      }

      let minX = w;
      let maxX = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (data[(y * w + x) * 4 + 3] > 16) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
          }
        }
      }

      if (maxX < minX) return setGeometry({ aspect, left: 0, width: 1 });
      setGeometry({ aspect, left: minX / w, width: (maxX - minX + 1) / w });
    };
    img.src = car.maskImage;

    return () => { cancelled = true; };
  }, [car.maskImage]);

  const layers = useMemo(() => getVisible(car.costs), [car.costs]);
  const total = useMemo(() => layers.reduce((a, l) => a + l.amount, 0), [layers]);
  const widths = useMemo(() => layoutWidths(layers.map((l) => l.amount)), [layers]);

  const selected = layers.find((l) => l.id === selectedId) ?? null;

  // Раньше при нулевом итоге amount/total давал NaN, и ширины полос
  // становились "NaN%". Теперь это явное пустое состояние.
  if (layers.length === 0 || total <= 0) {
    return (
      <div className={`w-full max-w-2xl mx-auto rounded-3xl border p-10 text-center ${t.panel}`}>
        <p className={`text-sm ${t.muted}`}>Структура цены пока не заполнена</p>
      </div>
    );
  }

  const select = (id: string) => setPinnedId((prev) => (prev === id ? null : id));
  const hoverProps = (id: string) => ({
    onMouseEnter: () => setHoveredId(id),
    onMouseLeave: () => setHoveredId((prev) => (prev === id ? null : prev)),
  });

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-14 items-center justify-center w-full max-w-[1400px] mx-auto p-4 lg:p-6">

      {/* --- МАШИНА --- */}
      <div className="relative w-full max-w-4xl flex-1 min-w-0">
        <div
          className="relative w-full select-none"
          style={{ aspectRatio: geometry?.aspect ?? 2.2 }}
        >
          {car.maskImage ? (
            <div className="relative w-full h-full">
              {/* next/image здесь нельзя: он отдаёт оптимизированный URL, а CSS-маска
                  ниже использует исходный — картинка и маска разъедутся. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={car.maskImage}
                alt=""
                aria-hidden
                className={`absolute inset-0 w-full h-full object-contain pointer-events-none ${t.ghost}`}
              />

              <div
                className="absolute inset-0 w-full h-full"
                style={{
                  maskImage: `url(${car.maskImage})`,
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskImage: `url(${car.maskImage})`,
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                }}
              >
                <div
                  className="absolute inset-y-0 flex flex-row"
                  role="group"
                  aria-label="Слои стоимости"
                  style={{
                    left: `${(geometry?.left ?? 0) * 100}%`,
                    width: `${(geometry?.width ?? 1) * 100}%`,
                  }}
                >
                  {layers.map((layer, index) => {
                    const isSelected = selectedId === layer.id;
                    const dimmed = selectedId !== null && !isSelected;
                    const share = (layer.amount / total) * 100;

                    return (
                      <button
                        key={layer.id}
                        type="button"
                        onClick={() => select(layer.id)}
                        {...hoverProps(layer.id)}
                        aria-pressed={pinnedId === layer.id}
                        aria-label={`${layer.label}: ${formatMoney(layer.amount)}, ${formatPercent(share)} от цены`}
                        className="h-full origin-left outline-none focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:ring-white/80 focus-visible:z-40 relative"
                        style={{ width: `${widths[index]}%` }}
                      >
                        <motion.span
                          initial={reduceMotion ? false : { scaleX: 0 }}
                          animate={{ scaleX: 1, opacity: dimmed ? 0.35 : 1 }}
                          transition={
                            reduceMotion
                              ? { duration: 0 }
                              : {
                                  // Полная заливка укладывается примерно в 1,5 с: при девяти слоях
                                  // прежние 0.12 на слой растягивали показ до 2,2 с.
                                  scaleX: { duration: 0.9, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] },
                                  opacity: { duration: 0.25 },
                                }
                          }
                          className="block w-full h-full origin-left relative"
                          style={{ backgroundColor: toHex(layer.color) }}
                        >
                          <span className="absolute top-0 right-0 w-px h-full bg-white/25" />
                          {isSelected && (
                            <span className="absolute inset-0 shadow-[inset_0_0_24px_rgba(255,255,255,0.55)]" />
                          )}
                        </motion.span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={car.maskImage}
                alt={`${car.brand} ${car.model}`}
                className="absolute inset-0 w-full h-full object-contain mix-blend-overlay opacity-40 pointer-events-none"
              />
            </div>
          ) : (
            <div className={`flex items-center justify-center h-full border border-dashed rounded-3xl ${t.divider} ${t.faint}`}>
              <span className="text-sm">Нет изображения машины</span>
            </div>
          )}
        </div>

        {/*
          Раньше это был тултип с hidden sm:block — на телефоне тап по полосе
          не показывал ничего. Теперь панель под графиком: работает и мышью,
          и пальцем, и с клавиатуры.
        */}
        <div className={`mt-4 rounded-2xl border px-5 py-4 min-h-[76px] flex items-center ${t.panel}`} aria-live="polite">
          {selected ? (
            <div className="flex items-center gap-4 w-full">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: toHex(selected.color) }} />
              <div className="min-w-0 flex-1">
                <div className={`font-medium ${t.text} flex items-center gap-1.5`}>
                  {selected.label}
                  {confidenceNote(selected.confidence) && <UnverifiedMark theme={theme} />}
                </div>
                {selected.description && (
                  <div className={`text-xs mt-0.5 ${t.faint} truncate`}>{selected.description}</div>
                )}
                {confidenceNote(selected.confidence) && (
                  <div className={`text-xs mt-1 ${t.faint}`}>
                    {confidenceNote(selected.confidence)}
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className={`font-mono font-bold text-lg ${t.text}`}>{formatMoney(selected.amount)}</div>
                <div className={`text-xs ${t.faint}`}>{formatPercent((selected.amount / total) * 100)} от цены</div>
              </div>
            </div>
          ) : (
            <p className={`text-sm ${t.faint}`}>
              Наведите или нажмите на цветной участок машины, чтобы увидеть слой
            </p>
          )}
        </div>
      </div>

      {/* --- ЛЕГЕНДА --- */}
      <div className="w-full lg:w-[380px] shrink-0">
        <div className={`rounded-3xl border p-5 lg:p-6 ${t.panel}`}>
          <h3 className={`text-xs font-bold mb-5 uppercase tracking-[0.2em] ${t.faint}`}>
            Структура цены
          </h3>

          {/* Порядок совпадает с полосами слева направо — раньше легенда шла
              в обратном порядке, и сопоставить строку с участком было нельзя. */}
          <ul className="space-y-0.5">
            {layers.map((layer, index) => {
              const isSelected = selectedId === layer.id;
              const hex = toHex(layer.color);
              const share = (layer.amount / total) * 100;

              return (
                <li key={layer.id}>
                  <button
                    type="button"
                    onClick={() => select(layer.id)}
                    {...hoverProps(layer.id)}
                    aria-pressed={pinnedId === layer.id}
                    className={`w-full text-left px-2.5 py-2 rounded-lg transition-colors outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${t.rowHover} ${isSelected ? (theme === 'dark' ? 'bg-white/5' : 'bg-black/5') : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`text-[10px] font-mono w-3 shrink-0 ${t.faint}`}>{index + 1}</span>
                        <motion.span
                          animate={{ scale: isSelected ? 1.35 : 1 }}
                          transition={{ duration: reduceMotion ? 0 : 0.2 }}
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: hex }}
                        />
                        <span
                          className={`text-sm font-medium truncate ${isSelected ? '' : t.muted}`}
                          style={isSelected ? { color: hex } : undefined}
                        >
                          {layer.label}
                        </span>
                        {confidenceNote(layer.confidence) && (
                          <span className="-ml-0.5"><UnverifiedMark theme={theme} /></span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2 shrink-0">
                        <span className={`text-[11px] font-mono ${t.faint}`}>{formatPercent(share)}</span>
                        <span className={`font-mono text-sm font-semibold ${isSelected ? '' : t.text}`} style={isSelected ? { color: hex } : undefined}>
                          {formatMoney(layer.amount)}
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className={`mt-5 pt-5 border-t ${t.divider}`}>
            <div className="flex justify-between items-baseline gap-3">
              <span className={`text-xs uppercase tracking-widest ${t.faint}`}>Итого</span>
              <span className={`text-2xl lg:text-3xl font-bold font-mono ${t.text}`}>
                {formatMillions(total)}
              </span>
            </div>
            {car.rateDate && car.cnyRate && (
              <p className={`text-[11px] mt-2 ${t.faint}`}>
                Расчёт по курсу ЦБ {Number(car.cnyRate).toFixed(2)} ₽/¥ на{' '}
                {new Date(car.rateDate).toLocaleDateString('ru-RU')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
