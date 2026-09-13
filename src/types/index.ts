// src/types/index.ts
// Типы выводятся из схемы Prisma, а не дублируются руками.
// Ручной дубль расходился со схемой (maskImage/description объявлялись как
// string, тогда как в БД они nullable) и ронял сборку.
import type { Prisma } from "@prisma/client";

export type CostLayer = Prisma.CostLayerGetPayload<Record<string, never>>;

export type CarWithCosts = Prisma.CarGetPayload<{
  include: { costs: true };
}>;

/** Характеристики из JSON-поля Car.specs. */
export type CarSpecs = {
  engine: string;
  power: string;
  range: string;
};

/**
 * То, что нужно виджету. specs разобран, а Decimal-поля приведены к числам:
 * объекты Decimal нельзя передавать из серверного компонента в клиентский,
 * React на этом ругается «Only plain objects can be passed».
 */
export type CarForWidget = Omit<CarWithCosts, "specs" | "cnyRate" | "eurRate"> & {
  specs: CarSpecs;
  cnyRate: number | null;
  eurRate: number | null;
};
