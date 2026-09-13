// src/lib/rate-status.ts
// Статусы ставок читаются из базы при рендере, а не записываются в слой при
// расчёте. Благодаря этому подтверждение ставки в админке сразу убирает пометку
// во всех виджетах — без пересчёта машин и без деплоя.
import { prisma } from "@/lib/prisma";
import {
  RATE_KEYS,
  RATE_KEY_LAWS,
  type RateKey,
  type RateStatus,
} from "@/lib/pricing/rate-keys";
import type { LayerConfidence } from "@/types";

export type RateStatusMap = Map<RateKey, LayerConfidence>;

export async function getRateStatuses(): Promise<RateStatusMap> {
  const rows = await prisma.rateCheck.findMany();
  const map: RateStatusMap = new Map();

  for (const key of RATE_KEYS) {
    const row = rows.find((r) => r.rateKey === key);
    map.set(key, {
      // Записи ещё нет — считаем неподтверждённой. Молчаливое «всё хорошо»
      // по умолчанию как раз и было исходной проблемой.
      status: (row?.status as RateStatus) ?? "UNVERIFIED",
      lawTitle: row?.lawTitle ?? RATE_KEY_LAWS[key].title,
      lawRedaction: row?.lawRedaction ?? null,
      verifiedAt: row?.verifiedAt ?? null,
      sourceUrl: row?.sourceUrl ?? RATE_KEY_LAWS[key].url,
    });
  }

  return map;
}
