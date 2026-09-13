// src/app/api/cron/check-rates/route.ts
import { runRateCheck } from "@/lib/rate-check-run";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  // Без секрета роут дёрнет кто угодно: он ходит во внешний источник
  // и пишет в базу.
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");

  if (!secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Нет доступа" }, { status: 401 });
  }

  try {
    const result = await runRateCheck();
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error("Проверка ставок не прошла:", e);
    // Отдаём 500, чтобы неудачная проверка не выглядела как успешная.
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "Неизвестная ошибка" },
      { status: 500 }
    );
  }
}
