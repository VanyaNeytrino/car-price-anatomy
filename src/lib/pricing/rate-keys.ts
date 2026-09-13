// src/lib/pricing/rate-keys.ts
//
// Единственное место, где слой разбивки превращается в ключ ставки.
// Вынесено отдельно, потому что у утильсбора ключ зависит от машины: у
// электромобиля своя строка перечня (не подтверждена), у ДВС — своя (сверена).
// Пока этой связки не было, оба значения выглядели одинаково достоверными.
import type { CostKind } from "./calc";
import type { ImportScheme, Powertrain } from "./rates";

export const RATE_KEYS = [
  "recycling_ice",
  "recycling_ev",
  "duty_unified",
  "duty_legal",
  "excise",
  "clearance_fee",
] as const;

export type RateKey = (typeof RATE_KEYS)[number];

export type RateStatus = "VERIFIED" | "UNVERIFIED" | "STALE";

/** Человеческие названия — для панели в админке. */
export const RATE_KEY_LABELS: Record<RateKey, string> = {
  recycling_ice: "Утильсбор, ДВС и гибриды",
  recycling_ev: "Утильсбор, электромобили",
  duty_unified: "Единая ставка физлица",
  duty_legal: "Ввозная пошлина юрлица",
  excise: "Акциз",
  clearance_fee: "Таможенный сбор",
};

/** Норма, по которой ставку надо сверять. */
export const RATE_KEY_LAWS: Record<RateKey, { title: string; url: string }> = {
  recycling_ice: {
    title: "ПП РФ № 1291",
    url: "https://www.consultant.ru/document/cons_doc_LAW_156832/",
  },
  recycling_ev: {
    title: "ПП РФ № 1291",
    url: "https://www.consultant.ru/document/cons_doc_LAW_156832/",
  },
  duty_unified: {
    title: "Решение Совета ЕЭК № 107, прил. 2",
    url: "https://www.alta.ru/tamdoc/17sr0107/",
  },
  duty_legal: {
    title: "ЕТТ ЕАЭС, поз. 8703",
    url: "https://www.alta.ru/tnved/",
  },
  excise: {
    title: "НК РФ ст. 193, ФЗ № 425-ФЗ",
    url: "https://www.consultant.ru/document/cons_doc_LAW_28165/",
  },
  clearance_fee: {
    title: "ПП РФ № 342",
    url: "https://www.consultant.ru/document/cons_doc_LAW_351009/",
  },
};

type Ctx = { powertrain: Powertrain; scheme: ImportScheme };

/**
 * Какой ставкой посчитан слой. Слои, которые дилер вбивает руками
 * (логистика, маржа) и цена завода, никакой нормой не регулируются —
 * помечать их нечем, поэтому null.
 */
export function rateKeyForLayer(kind: CostKind, ctx: Ctx): RateKey | null {
  switch (kind) {
    case "RECYCLING":
      return ctx.powertrain === "EV" ? "recycling_ev" : "recycling_ice";
    case "DUTY":
      return ctx.scheme === "LEGAL_ENTITY" ? "duty_legal" : "duty_unified";
    case "EXCISE":
      return "excise";
    case "CLEARANCE":
      return "clearance_fee";
    default:
      return null;
  }
}
