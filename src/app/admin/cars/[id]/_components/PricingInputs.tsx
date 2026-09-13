'use client';

import { useActionState, useState, useTransition } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  saveAndRecalculate,
  pullCbrRates,
  type PricingFormState,
} from '@/app/actions/update-car-pricing';

type Props = {
  carId: string;
  initial: {
    basePriceCny: number | null;
    cnyRate: string | null;
    eurRate: string | null;
    rateDate: Date | null;
    engineCc: number | null;
    powerHp: number | null;
    powertrain: string;
    importScheme: string;
  };
};

const field = 'w-full bg-black border border-white/10 rounded px-3 py-2 text-sm focus:border-orange-500 outline-none';
const labelClass = 'block text-xs text-zinc-500 mb-1';

export default function PricingInputs({ carId, initial }: Props) {
  const [state, formAction, isPending] = useActionState<PricingFormState, FormData>(
    saveAndRecalculate.bind(null, carId),
    {}
  );
  const [rates, setRates] = useState({
    cny: initial.cnyRate ?? '',
    eur: initial.eurRate ?? '',
  });
  const [rateNote, setRateNote] = useState<string | null>(
    initial.rateDate ? `Курс от ${new Date(initial.rateDate).toLocaleDateString('ru-RU')}` : null
  );
  const [pullingRates, startPull] = useTransition();

  const handlePull = () =>
    startPull(async () => {
      const res = await pullCbrRates(carId);
      setRateNote(res.ok ?? res.error ?? null);
    });

  return (
    <form action={formAction} className="bg-zinc-900 border border-white/10 rounded-xl p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-lg font-bold">Данные для расчёта</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Пошлина, акциз, НДС, утильсбор и сборы считаются отсюда.
            Логистика и маржа остаются как вы их задали.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass} htmlFor="basePriceCny">Цена у завода, ¥</label>
          <input id="basePriceCny" name="basePriceCny" type="number" min={0} step={100}
            defaultValue={initial.basePriceCny ?? 0} className={field} required />
        </div>

        <div className="col-span-2 sm:col-span-1">
          <label className={labelClass} htmlFor="importScheme">Схема ввоза</label>
          <select id="importScheme" name="importScheme" defaultValue={initial.importScheme} className={field}>
            <option value="INDIVIDUAL">Физлицо (единая ставка)</option>
            <option value="LEGAL_ENTITY">Юрлицо (пошлина + акциз + НДС)</option>
          </select>
        </div>

        <div>
          <label className={labelClass} htmlFor="cnyRate">Курс ¥, ₽</label>
          <input id="cnyRate" name="cnyRate" type="number" step="0.0001" min="0.0001"
            value={rates.cny} onChange={(e) => setRates({ ...rates, cny: e.target.value })}
            className={field} required />
        </div>

        <div>
          <label className={labelClass} htmlFor="eurRate">Курс €, ₽</label>
          <input id="eurRate" name="eurRate" type="number" step="0.0001" min="0.0001"
            value={rates.eur} onChange={(e) => setRates({ ...rates, eur: e.target.value })}
            className={field} required />
        </div>

        <div className="col-span-2 flex items-center justify-between gap-3 -mt-1">
          <span className="text-[11px] text-zinc-600">{rateNote}</span>
          <button type="button" onClick={handlePull} disabled={pullingRates}
            className="flex items-center gap-1.5 text-xs text-orange-500 hover:text-orange-400 disabled:opacity-50">
            <RefreshCw size={12} className={pullingRates ? 'animate-spin' : ''} />
            {pullingRates ? 'Получаем…' : 'Курс ЦБ на сегодня'}
          </button>
        </div>

        <div>
          <label className={labelClass} htmlFor="engineCc">Объём, см³</label>
          <input id="engineCc" name="engineCc" type="number" min={0} step={100}
            defaultValue={initial.engineCc ?? 0} className={field} required />
          <p className="text-[10px] text-zinc-600 mt-1">У электромобилей — 0</p>
        </div>

        <div>
          <label className={labelClass} htmlFor="powerHp">Мощность, л.с.</label>
          <input id="powerHp" name="powerHp" type="number" min={0}
            defaultValue={initial.powerHp ?? 0} className={field} required />
        </div>

        <div className="col-span-2">
          <label className={labelClass} htmlFor="powertrain">Тип силовой установки</label>
          <select id="powertrain" name="powertrain" defaultValue={initial.powertrain} className={field}>
            <option value="ICE">ДВС</option>
            <option value="HYBRID">Гибрид</option>
            <option value="EREV">EREV (с генератором)</option>
            <option value="EV">Электромобиль</option>
          </select>
          <p className="text-[10px] text-zinc-600 mt-1">
            Для электро и гибридов утильсбор считают по 30-минутной мощности, порог льготы — 80 л.с.
          </p>
        </div>
      </div>

      {state.error && <p role="alert" className="mt-4 text-sm text-red-400">{state.error}</p>}
      {state.ok && <p role="status" className="mt-4 text-sm text-green-400">{state.ok}</p>}

      <button type="submit" disabled={isPending}
        className="mt-5 w-full bg-white text-black hover:bg-orange-500 hover:text-white py-2.5 rounded-lg font-bold transition-colors disabled:opacity-50">
        {isPending ? 'Считаем…' : 'Сохранить и пересчитать'}
      </button>
    </form>
  );
}
