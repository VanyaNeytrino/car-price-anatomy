// src/lib/cars.ts
// Одинаковый findUnique + приведение specs был скопирован в трёх местах
// (публичная страница, embed, превью в админке) и успел разъехаться:
// embed проверял isActive, а публичная страница — нет, и черновики утекали.
import { prisma } from "@/lib/prisma";
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

/** Приводит запись из БД к тому, что безопасно отдать клиентскому компоненту. */
export function toWidgetCar(car: CarWithCosts): CarForWidget {
  return {
    ...car,
    specs: parseSpecs(car.specs),
    // Decimal -> number: иначе React ругается на непростые объекты.
    cnyRate: car.cnyRate === null ? null : Number(car.cnyRate),
    eurRate: car.eurRate === null ? null : Number(car.eurRate),
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
  const car = await prisma.car.findUnique({
    where: { id },
    include: { costs: { orderBy: { order: "asc" } } },
  });

  if (!car) return null;
  if (onlyActive && !car.isActive) return null;

  return toWidgetCar(car);
}
