// src/app/admin/settings/page.tsx
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/session";
import { updateOrganization } from "@/app/actions/update-org";
import RateStatusPanel, { type RateRow } from "./_components/RateStatusPanel";
import { KEYS_NOT_WATCHED } from "@/lib/law-watch";
import { RATE_KEYS, RATE_KEY_LAWS, type RateKey, type RateStatus } from "@/lib/pricing/rate-keys";

export default async function SettingsPage() {
  const { organizationId } = await requireOrg();
  const [org, checks] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.rateCheck.findMany({
      include: { events: { orderBy: { createdAt: "desc" }, take: 10 } },
    }),
  ]);

  // Порядок фиксированный, а не из базы: так панель не прыгает между заходами.
  const rows: RateRow[] = RATE_KEYS.map((key) => {
    const row = checks.find((c) => c.rateKey === key);
    return {
      rateKey: key,
      status: (row?.status as RateStatus) ?? "UNVERIFIED",
      lawTitle: row?.lawTitle ?? RATE_KEY_LAWS[key].title,
      lawRedaction: row?.lawRedaction ?? null,
      sourceUrl: row?.sourceUrl ?? RATE_KEY_LAWS[key].url,
      verifiedAt: row?.verifiedAt ?? null,
      verifiedBy: row?.verifiedBy ?? null,
      note: row?.note ?? null,
      lastCheckedAt: row?.lastCheckedAt ?? null,
      watched: !KEYS_NOT_WATCHED.includes(key as RateKey),
      events: row?.events ?? [],
    };
  });

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

      <div className="mt-8">
        <RateStatusPanel rows={rows} />
      </div>

    </div>
  );
}
