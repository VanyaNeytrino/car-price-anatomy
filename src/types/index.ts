// src/types/index.ts
// Типы выводятся из схемы Prisma, а не дублируются руками.
// Ручной дубль расходился со схемой (maskImage/description объявлялись как
// string, тогда как в БД они nullable) и ронял сборку.
import type { Prisma } from "@prisma/client";
import type { RateStatus } from "@/lib/pricing/rate-keys";

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
 * Насколько ставка, по которой посчитан слой, подтверждена нормой.
 * null — слой ничем не регулируется (цена завода, логистика, маржа).
 */
export type LayerConfidence = {
  status: RateStatus;
  lawTitle: string;
  lawRedaction: string | null;
  verifiedAt: Date | null;
  sourceUrl: string | null;
};

export type WidgetCostLayer = CostLayer & { confidence: LayerConfidence | null };

/**
 * То, что нужно виджету. specs разобран, а Decimal-поля приведены к числам:
 * объекты Decimal нельзя передавать из серверного компонента в клиентский,
 * React на этом ругается «Only plain objects can be passed».
 */
export type CarForWidget = Omit<
  CarWithCosts,
  "specs" | "cnyRate" | "eurRate" | "costs"
> & {
  specs: CarSpecs;
  cnyRate: number | null;
  eurRate: number | null;
  costs: WidgetCostLayer[];
};
