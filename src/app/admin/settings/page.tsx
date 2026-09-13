// src/app/admin/settings/page.tsx
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/session";
import { updateOrganization } from "@/app/actions/update-org";
import { RATES } from "@/lib/pricing/rates";

export default async function SettingsPage() {
  const { organizationId } = await requireOrg();
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });

  return (
    <div className="p-6 sm:p-8 max-w-2xl">
      <h1 className="text-2xl sm:text-3xl font-bold mb-8">Настройки</h1>

      <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Организация</h2>

        <form action={updateOrganization} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-400 mb-1">
              Название компании
            </label>
            <input
              id="name"
              name="name"
              defaultValue={org?.name}
              type="text"
              required
              minLength={2}
              className="w-full bg-black border border-white/10 rounded px-4 py-2 text-white focus:border-orange-500 outline-none"
            />
          </div>

          <div>
            <label htmlFor="orgId" className="block text-sm font-medium text-zinc-400 mb-1">
              Идентификатор
            </label>
            <input
              id="orgId"
              disabled
              value={org?.id ?? ''}
              type="text"
              className="w-full bg-black/50 border border-white/5 rounded px-4 py-2 text-zinc-500 cursor-not-allowed"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="bg-white text-black font-bold py-2 px-6 rounded hover:bg-orange-500 hover:text-white transition-colors"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>

      {/*
        Раньше здесь висела мёртвая заглушка «Branding (Pro)». Вместо неё —
        то, что реально важно знать дилеру: на какие ставки опирается расчёт.
      */}
      <div className="mt-8 bg-zinc-900 border border-white/10 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-2">Ставки в расчёте</h2>
        <p className="text-sm text-zinc-500 mb-4">
          Версия таблицы {RATES.version}, сверена {new Date(RATES.verifiedAt).toLocaleDateString('ru-RU')}.
        </p>
        <dl className="space-y-2 text-sm">
          {Object.entries(RATES.sources).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-4 border-b border-white/5 pb-2">
              <dt className="text-zinc-500">
                {{ recycling: 'Утильсбор', excise: 'Акциз', unifiedDuty: 'Единая ставка', clearanceFee: 'Таможенный сбор' }[key] ?? key}
              </dt>
              <dd className="text-zinc-300 text-right">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-amber-500/80">
          Ставки собраны из открытых источников и требуют сверки с первоисточником
          перед использованием в коммерческих расчётах.
        </p>
      </div>
    </div>
  );
}
