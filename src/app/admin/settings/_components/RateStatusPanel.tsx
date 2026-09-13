'use client';

import { useActionState, useState, useTransition } from 'react';
import { RefreshCw, ChevronDown, Check } from 'lucide-react';
import {
  checkRatesNow,
  markRateVerified,
  type CheckState,
} from '@/app/actions/rate-checks';
import { RATE_KEY_LABELS, type RateKey, type RateStatus } from '@/lib/pricing/rate-keys';

export type RateRow = {
  rateKey: RateKey;
  status: RateStatus;
  lawTitle: string;
  lawRedaction: string | null;
  sourceUrl: string | null;
  verifiedAt: Date | null;
  verifiedBy: string | null;
  note: string | null;
  lastCheckedAt: Date | null;
  watched: boolean;
  events: Array<{ id: string; kind: string; message: string; documentUrl: string | null; createdAt: Date }>;
};

const STATUS_STYLE: Record<RateStatus, { label: string; className: string }> = {
  VERIFIED: { label: 'сверено', className: 'text-green-400 border-green-500/30 bg-green-500/10' },
  UNVERIFIED: { label: 'требует сверки', className: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  STALE: { label: 'норма изменилась', className: 'text-orange-400 border-orange-500/30 bg-orange-500/10' },
};

const fmt = (d: Date | null) => (d ? new Date(d).toLocaleDateString('ru-RU') : '—');
const field =
  'w-full bg-black border border-white/10 rounded px-3 py-1.5 text-sm focus:border-orange-500 outline-none';

function VerifyForm({ row, onDone }: { row: RateRow; onDone: () => void }) {
  const [state, formAction, pending] = useActionState<CheckState, FormData>(markRateVerified, {});

  if (state.ok) {
    // Подтверждение прошло — закрываем форму, статус уже перерисован.
    setTimeout(onDone, 0);
  }

  return (
    <form action={formAction} className="mt-3 space-y-2 border-t border-white/5 pt-3">
      <input type="hidden" name="rateKey" value={row.rateKey} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input name="sourceUrl" type="url" placeholder="Ссылка на норму" defaultValue={row.sourceUrl ?? ''} className={field} />
        <input name="redaction" type="text" placeholder="Редакция, напр. ред. от 06.02.2026" defaultValue={row.lawRedaction ?? ''} className={field} />
      </div>
      <input name="note" type="text" placeholder="Что именно сверили" defaultValue={row.note ?? ''} className={field} />
      {state.error && <p className="text-xs text-red-400">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending}
          className="flex items-center gap-1.5 bg-white text-black hover:bg-orange-500 hover:text-white text-sm px-3 py-1.5 rounded font-medium transition-colors disabled:opacity-50">
          <Check size={14} /> {pending ? 'Сохраняем…' : 'Подтвердить'}
        </button>
        <button type="button" onClick={onDone} className="text-sm text-zinc-500 hover:text-white px-2">
          Отмена
        </button>
      </div>
    </form>
  );
}

export default function RateStatusPanel({ rows }: { rows: RateRow[] }) {
  const [result, setResult] = useState<CheckState | null>(null);
  const [checking, startCheck] = useTransition();
  const [openVerify, setOpenVerify] = useState<RateKey | null>(null);
  const [openHistory, setOpenHistory] = useState<RateKey | null>(null);

  const unverified = rows.filter((r) => r.status !== 'VERIFIED').length;

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h2 className="text-xl font-bold">Состояние ставок</h2>
        <button
          type="button"
          onClick={() => startCheck(async () => setResult(await checkRatesNow()))}
          disabled={checking}
          className="flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-400 disabled:opacity-50 shrink-0"
        >
          <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
          {checking ? 'Смотрим ленту…' : 'Проверить сейчас'}
        </button>
      </div>

      <p className="text-sm text-zinc-500 mb-4">
        {unverified === 0
          ? 'Все ставки сверены с нормами.'
          : `Сверки требуют ${unverified} из ${rows.length}. Неподтверждённые помечаются в виджете.`}
      </p>

      {result?.ok && <p role="status" className="text-sm text-green-400 mb-4">{result.ok}</p>}
      {result?.error && <p role="alert" className="text-sm text-red-400 mb-4">{result.error}</p>}

      <ul className="space-y-2">
        {rows.map((row) => {
          const s = STATUS_STYLE[row.status];
          return (
            <li key={row.rateKey} className="border border-white/5 rounded-lg p-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium text-sm">{RATE_KEY_LABELS[row.rateKey]}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">
                    {row.lawTitle}
                    {row.lawRedaction ? `, ${row.lawRedaction}` : ''}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[11px] border shrink-0 ${s.className}`}>
                  {s.label}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-[11px] text-zinc-600">
                <span>сверено: {row.verifiedAt ? `${fmt(row.verifiedAt)}, ${row.verifiedBy}` : '—'}</span>
                <span>проверка ленты: {fmt(row.lastCheckedAt)}</span>
                {!row.watched && <span className="text-zinc-500">сторожем не покрывается</span>}
              </div>

              {row.note && <p className="text-xs text-zinc-500 mt-2">{row.note}</p>}

              <div className="flex gap-3 mt-2">
                {row.status !== 'VERIFIED' && openVerify !== row.rateKey && (
                  <button type="button" onClick={() => setOpenVerify(row.rateKey)}
                    className="text-xs text-orange-500 hover:text-orange-400">
                    Отметить сверенной
                  </button>
                )}
                {row.events.length > 0 && (
                  <button type="button"
                    onClick={() => setOpenHistory(openHistory === row.rateKey ? null : row.rateKey)}
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white">
                    История ({row.events.length})
                    <ChevronDown size={12} className={openHistory === row.rateKey ? 'rotate-180' : ''} />
                  </button>
                )}
              </div>

              {openVerify === row.rateKey && <VerifyForm row={row} onDone={() => setOpenVerify(null)} />}

              {openHistory === row.rateKey && (
                <ul className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
                  {row.events.map((e) => (
                    <li key={e.id} className="text-xs text-zinc-500">
                      <span className="text-zinc-600 font-mono">{fmt(e.createdAt)}</span> {e.message}
                      {e.documentUrl && (
                        <a href={e.documentUrl} target="_blank" rel="noreferrer"
                          className="text-orange-500 hover:text-orange-400 ml-1">документ</a>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
