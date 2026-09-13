// src/lib/rate-check-run.ts
// Один проход сторожа: посмотреть ленту, отметить задетые ставки, записать
// историю. Вынесено из роута, чтобы тем же кодом пользовалась и кнопка
// «Проверить сейчас» в админке.
import { prisma } from "@/lib/prisma";
import { findRelevantActs, KEYS_NOT_WATCHED } from "@/lib/law-watch";
import { RATE_KEYS, RATE_KEY_LABELS, type RateKey } from "@/lib/pricing/rate-keys";

/** На сколько максимум отматываем ленту, если проверок давно не было. */
const MAX_LOOKBACK_DAYS = 7;

export type RunResult = {
  scanned: number;
  truncated: boolean;
  changed: RateKey[];
  since: Date;
};

export async function runRateCheck(): Promise<RunResult> {
  const rows = await prisma.rateCheck.findMany();

  const oldest = rows
    .map((r) => r.lastCheckedAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const cap = new Date(Date.now() - MAX_LOOKBACK_DAYS * 24 * 3600 * 1000);
  // Если проверок не было вовсе или был долгий перерыв — не пытаемся
  // отмотать всю ленту, это тысячи страниц. Честнее показать окно.
  const since = oldest && oldest > cap ? oldest : cap;

  const { scanned, truncated, matches } = await findRelevantActs(since);

  const hit = new Map<RateKey, { title: string; url: string; matchedOn: string[] }>();
  for (const m of matches) {
    for (const key of m.rateKeys) {
      if (!hit.has(key)) hit.set(key, { title: m.act.title, url: m.act.url, matchedOn: m.matchedOn });
    }
  }

  const now = new Date();

  for (const key of RATE_KEYS) {
    const row = rows.find((r) => r.rateKey === key);
    if (!row) continue;

    const found = hit.get(key);

    if (found) {
      await prisma.rateCheck.update({
        where: { id: row.id },
        data: {
          status: "STALE",
          lastCheckedAt: now,
          events: {
            create: {
              kind: "LAW_CHANGED",
              message: `Вышел акт по теме «${found.matchedOn.join(", ")}»: ${found.title}`,
              documentUrl: found.url,
            },
          },
        },
      });
    } else {
      await prisma.rateCheck.update({
        where: { id: row.id },
        data: { lastCheckedAt: now },
      });
    }
  }

  // Одна запись на прогон, а не по строке на каждую ставку — иначе история
  // забьётся служебным шумом и в ней нельзя будет ничего найти.
  const first = rows[0];
  if (first) {
    const notWatched = KEYS_NOT_WATCHED.map((k) => RATE_KEY_LABELS[k]).join(", ");
    await prisma.rateCheckEvent.create({
      data: {
        rateCheckId: first.id,
        kind: "CHECK_RAN",
        message:
          `Просмотрено актов: ${scanned} с ${since.toLocaleDateString("ru-RU")}` +
          (truncated ? ", лента прочитана не до конца" : "") +
          `. Сторожем не покрывается: ${notWatched}.`,
      },
    });
  }

  return { scanned, truncated, changed: [...hit.keys()], since };
}
