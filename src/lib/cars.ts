// src/lib/cars.ts
// Одинаковый findUnique + приведение specs был скопирован в трёх местах
// (публичная страница, embed, превью в админке) и успел разъехаться:
// embed проверял isActive, а публичная страница — нет, и черновики утекали.
import { prisma } from "@/lib/prisma";
import { getRateStatuses, type RateStatusMap } from "@/lib/rate-status";
import { rateKeyForLayer } from "@/lib/pricing/rate-keys";
import type { CostKind, ImportScheme, Powertrain } from "@/lib/pricing";
import type { CarForWidget, CarSpecs, CarWithCosts } from "@/types";

const EMPTY_SPECS: CarSpecs = { engine: "—", power: "—", range: "—" };

function parseSpecs(raw: unknown): CarSpecs {
  if (!raw || typeof raw !== "object") return EMPTY_SPECS;
  const s = raw as Partial<CarSpecs>;
  return {
    engine: s.engine ?? EMPTY_SPECS.engine,
    power: s.power ?? EMPTY_SPECS.power,
    range: s.range ?? EMPTY_SPECS.range,
  };
}

/**
 * Приводит запись из БД к тому, что безопасно отдать клиентскому компоненту.
 * @param statuses если переданы — каждому слою проставляется, насколько
 *                 подтверждена ставка, по которой он посчитан.
 */
export function toWidgetCar(car: CarWithCosts, statuses?: RateStatusMap): CarForWidget {
  const ctx = {
    powertrain: car.powertrain as Powertrain,
    scheme: car.importScheme as ImportScheme,
  };

  return {
    ...car,
    specs: parseSpecs(car.specs),
    // Decimal -> number: иначе React ругается на непростые объекты.
    cnyRate: car.cnyRate === null ? null : Number(car.cnyRate),
    eurRate: car.eurRate === null ? null : Number(car.eurRate),
    costs: car.costs.map((layer) => {
      const key = rateKeyForLayer(layer.kind as CostKind, ctx);
      return { ...layer, confidence: key && statuses ? (statuses.get(key) ?? null) : null };
    }),
  };
}

/**
 * @param onlyActive для публичных страниц и виджета: черновик не отдаём.
 *                   В админке нужен и черновик, поэтому false.
 */
export async function getCarForWidget(
  id: string,
  { onlyActive = true }: { onlyActive?: boolean } = {}
): Promise<CarForWidget | null> {
  const [car, statuses] = await Promise.all([
    prisma.car.findUnique({
      where: { id },
      include: { costs: { orderBy: { order: "asc" } } },
    }),
    getRateStatuses(),
  ]);

  if (!car) return null;
  if (onlyActive && !car.isActive) return null;

  return toWidgetCar(car, statuses);
}
