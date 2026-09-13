'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Trash2, Plus, ArrowUp, ArrowDown, Lock } from 'lucide-react';
import { updateCarData } from '@/app/actions/update-costs';
import { formatMoney, formatMillions } from '@/lib/pricing/format';
import { KIND_LABELS, type CostKind } from '@/lib/pricing/calc';

type EditableLayer = {
  id?: string;
  label: string;
  amount: number;
  color: string;
  description: string | null;
  isVisible: boolean;
  kind: string;
  isAuto: boolean;
  /** Ключ для React — id из базы есть не у всех строк. */
  key: string;
};

type Props = {
  carId: string;
  initialCosts: Array<{
    id: string;
    label: string;
    amount: number;
    color: string;
    description: string | null;
    isVisible: boolean;
    kind: string;
    isAuto: boolean;
  }>;
  initialIsActive: boolean;
};

const PALETTE = ['#2563eb', '#06b6d4', '#ea580c', '#e11d48', '#7c3aed', '#9333ea', '#0d9488', '#64748b', '#facc15', '#22c55e'];

export default function CostEditor({ carId, initialCosts, initialIsActive }: Props) {
  const [costs, setCosts] = useState<EditableLayer[]>(() =>
    initialCosts.map((c) => ({ ...c, key: c.id }))
  );
  const [isActive, setIsActive] = useState(initialIsActive);
  const [status, setStatus] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const mutate = (next: EditableLayer[]) => {
    setCosts(next);
    setDirty(true);
    setStatus(null);
  };

  const patch = (index: number, changes: Partial<EditableLayer>) =>
    mutate(costs.map((c, i) => (i === index ? { ...c, ...changes } : c)));

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= costs.length) return;
    const next = [...costs];
    [next[index], next[target]] = [next[target], next[index]];
    mutate(next);
  };

  const addLayer = () =>
    mutate([
      ...costs,
      {
        key: `new-${Date.now()}`,
        label: 'Новый слой',
        amount: 0,
        color: PALETTE[costs.length % PALETTE.length],
        description: null,
        isVisible: true,
        kind: 'MANUAL',
        isAuto: false,
      },
    ]);

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updateCarData(
          carId,
          costs.map((c) => ({
            id: c.id,
            label: c.label,
            amount: c.amount,
            color: c.color,
            description: c.description,
            isVisible: c.isVisible,
            kind: c.kind,
          })),
          isActive
        );
        setDirty(false);
        setStatus({ kind: 'ok', text: 'Сохранено' });
        router.refresh();
      } catch (e) {
        setStatus({ kind: 'error', text: e instanceof Error ? e.message : 'Не удалось сохранить' });
      }
    });
  };

  const total = costs.filter((c) => c.isVisible).reduce((acc, c) => acc + Number(c.amount || 0), 0);

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-xl p-5 sm:p-6">
      <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/10 gap-4">
        <div>
          <h3 className="text-lg font-bold">Публикация</h3>
          <p className="text-xs text-zinc-500">Черновик не показывается в виджете.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          aria-label="Опубликовать машину"
          onClick={() => { setIsActive(!isActive); setDirty(true); }}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${isActive ? 'bg-green-500' : 'bg-zinc-700'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>

      <div className="flex justify-between items-center mb-6 gap-4">
        <h3 className="text-lg font-bold">Структура цены</h3>
        <div className="text-sm text-zinc-500 whitespace-nowrap">
          Итого: <span className="text-white font-mono">{formatMillions(total)}</span>
        </div>
      </div>

      <div className="space-y-3">
        {costs.map((cost, idx) => (
          <div
            key={cost.key}
            className={`rounded-lg border border-white/5 p-3 transition-opacity ${cost.isVisible ? '' : 'opacity-50'}`}
          >
            <div className="flex gap-2 items-center flex-wrap">
              <button
                type="button"
                onClick={() => patch(idx, { isVisible: !cost.isVisible })}
                className="p-1.5 text-zinc-500 hover:text-white transition-colors"
                title={cost.isVisible ? 'Скрыть слой' : 'Показать слой'}
                aria-label={cost.isVisible ? 'Скрыть слой' : 'Показать слой'}
              >
                {cost.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>

              <input
                type="color"
                value={cost.color}
                onChange={(e) => patch(idx, { color: e.target.value })}
                className="w-8 h-8 rounded bg-transparent border border-white/10 cursor-pointer shrink-0"
                title="Цвет слоя"
                aria-label={`Цвет слоя «${cost.label}»`}
              />

              <input
                type="text"
                value={cost.label}
                onChange={(e) => patch(idx, { label: e.target.value })}
                aria-label="Название слоя"
                className="flex-1 min-w-[120px] bg-black border border-white/10 rounded px-3 py-2 text-sm focus:border-orange-500 outline-none"
              />

              <input
                type="number"
                min={0}
                step={1000}
                value={cost.amount}
                onChange={(e) => patch(idx, { amount: Number(e.target.value) })}
                aria-label="Сумма в рублях"
                className="w-36 bg-black border border-white/10 rounded px-3 py-2 text-sm font-mono focus:border-orange-500 outline-none"
              />

              <div className="flex items-center">
                <button type="button" onClick={() => move(idx, -1)} disabled={idx === 0}
                  className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-20" aria-label="Выше">
                  <ArrowUp size={14} />
                </button>
                <button type="button" onClick={() => move(idx, 1)} disabled={idx === costs.length - 1}
                  className="p-1.5 text-zinc-500 hover:text-white disabled:opacity-20" aria-label="Ниже">
                  <ArrowDown size={14} />
                </button>
                <button type="button" onClick={() => mutate(costs.filter((_, i) => i !== idx))}
                  className="p-1.5 text-zinc-500 hover:text-red-400" aria-label="Удалить слой">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2 pl-9">
              <input
                type="text"
                value={cost.description ?? ''}
                onChange={(e) => patch(idx, { description: e.target.value || null })}
                placeholder="Пояснение для клиента"
                aria-label="Пояснение"
                className="flex-1 bg-transparent border-b border-white/5 px-1 py-1 text-xs text-zinc-400 focus:border-orange-500 outline-none"
              />
              <span className="text-[10px] text-zinc-600 font-mono whitespace-nowrap">{formatMoney(cost.amount || 0)}</span>
              {cost.isAuto && (
                <span title="Считается калькулятором — пересчёт перезапишет" className="flex items-center gap-1 text-[10px] text-zinc-600">
                  <Lock size={10} /> {KIND_LABELS[cost.kind as CostKind] ?? cost.kind}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addLayer}
        className="mt-4 w-full flex items-center justify-center gap-2 border border-dashed border-white/10 text-zinc-500 hover:text-white hover:border-white/20 py-2.5 rounded-lg text-sm transition-colors"
      >
        <Plus size={14} /> Добавить слой
      </button>

      {status && (
        <p role="status" className={`mt-4 text-sm ${status.kind === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
          {status.text}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="mt-4 w-full bg-orange-600 hover:bg-orange-500 text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-50"
      >
        {isPending ? 'Сохраняем…' : dirty ? 'Сохранить изменения' : 'Сохранено'}
      </button>

      {dirty && !isPending && (
        <p className="mt-2 text-xs text-amber-500/80 text-center">Есть несохранённые изменения</p>
      )}
    </div>
  );
}
