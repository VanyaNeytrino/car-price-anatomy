// src/lib/pricing/rates.ts
//
// Ставки лежат данными, а не растворены в коде. Причина простая: они меняются.
// Утильсбор пересобрали 01.12.2025, акцизы — 01.01.2026. Числа, вбитые руками
// в seed, уже разъехались с реальностью и разъедутся снова.
//
// ВАЖНО. Значения ниже собраны из открытых публикаций импортёров и деловых СМИ,
// и часть из них источники дают по-разному (для 160-190 л.с. встречаются и
// 750 000, и 900 000 ₽). Перед продом таблицы обязаны быть сверены с
// первоисточником: ПП РФ № 1291 в действующей редакции (утильсбор),
// ФЗ от 28.11.2025 № 425-ФЗ (акцизы), Решение Совета ЕЭК № 107 (единая ставка).
// Там, где данных нет, калькулятор честно поднимает флаг needsVerification,
// а не подставляет правдоподобное число.

export type Powertrain = "ICE" | "HYBRID" | "EREV" | "EV";
export type ImportScheme = "INDIVIDUAL" | "LEGAL_ENTITY";
export type AgeBand = "NEW" | "AGE_3_5" | "AGE_5_PLUS";

export const RATES = {
  version: "2026-09",
  verifiedAt: "2026-09-13",
  sources: {
    recycling: "ПП РФ № 1291 (ред. от 01.12.2025)",
    excise: "ФЗ от 28.11.2025 № 425-ФЗ",
    unifiedDuty: "Решение Совета ЕЭК № 107, прил. 2",
    clearanceFee: "ПП РФ № 342",
  },
} as const;

/** НДС. Применяется только при коммерческом ввозе. */
export const VAT_RATE = 0.2;

/** Ввозная пошлина для юрлиц, легковые (ТН ВЭД 8703). */
export const LEGAL_ENTITY_DUTY_RATE = 0.15;

/**
 * Единая совокупная ставка для физлиц, новые авто (до 3 лет).
 * Заменяет собой пошлину, акциз и НДС разом — отдельными строками их
 * показывать нельзя, будет двойной счёт.
 * Порог — таможенная стоимость в евро. Берётся большее из двух: процент от
 * стоимости и минимум за см³.
 */
export type UnifiedRateRow = { maxValueEur: number; rate: number; minEurPerCc: number };
export const UNIFIED_RATE_NEW: readonly UnifiedRateRow[] = [
  { maxValueEur: 8_500, rate: 0.54, minEurPerCc: 2.5 },
  { maxValueEur: 16_700, rate: 0.48, minEurPerCc: 3.5 },
  { maxValueEur: 42_300, rate: 0.48, minEurPerCc: 5.5 },
  { maxValueEur: 84_500, rate: 0.48, minEurPerCc: 7.5 },
  { maxValueEur: 169_000, rate: 0.48, minEurPerCc: 15 },
  { maxValueEur: Infinity, rate: 0.48, minEurPerCc: 20 },
];

/** Для подержанных физлицо платит фиксированную сумму за см³, без процента. */
export type VolumeRateRow = { maxCc: number; eurPerCc: number };
export const USED_EUR_PER_CC: Record<"AGE_3_5" | "AGE_5_PLUS", readonly VolumeRateRow[]> = {
  AGE_3_5: [
    { maxCc: 1_000, eurPerCc: 1.5 },
    { maxCc: 1_500, eurPerCc: 1.7 },
    { maxCc: 1_800, eurPerCc: 2.5 },
    { maxCc: 2_300, eurPerCc: 2.7 },
    { maxCc: 3_000, eurPerCc: 3.0 },
    { maxCc: Infinity, eurPerCc: 3.6 },
  ],
  AGE_5_PLUS: [
    { maxCc: 1_000, eurPerCc: 3.0 },
    { maxCc: 1_500, eurPerCc: 3.2 },
    { maxCc: 1_800, eurPerCc: 3.5 },
    { maxCc: 2_300, eurPerCc: 4.8 },
    { maxCc: 3_000, eurPerCc: 5.0 },
    { maxCc: Infinity, eurPerCc: 5.7 },
  ],
};

/** Акциз, ₽ за л.с. Считается по пиковой мощности из ПТС. */
export type ExciseRow = { maxHp: number; rub: number };
export const EXCISE_PER_HP: readonly ExciseRow[] = [
  { maxHp: 90, rub: 0 },
  { maxHp: 150, rub: 64 },
  { maxHp: 200, rub: 613 },
  { maxHp: 300, rub: 1_004 },
  { maxHp: 400, rub: 1_711 },
  { maxHp: 500, rub: 1_771 },
  { maxHp: Infinity, rub: 1_829 },
];

/** Утильсбор: базовая ставка для легковых (M1) и льготные коэффициенты. */
export const RECYCLING_BASE_RUB = 20_000;
export const RECYCLING_PREFERENTIAL = {
  NEW: 0.17, // 20 000 x 0,17 = 3 400 ₽
  USED: 0.26, // 20 000 x 0,26 = 5 200 ₽
} as const;

/**
 * Порог льготы по мощности. С 01.12.2025 льгота живёт только до 160 л.с.,
 * а для электро и гибридов считают 30-минутную мощность с порогом 80 л.с.
 * Именно на этом пороге ломался Zeekr 009 в seed: 544 л.с. EV стоял с
 * льготной ставкой.
 */
export const RECYCLING_POWER_LIMIT: Record<Powertrain, number> = { ICE: 160, HYBRID: 80, EREV: 80, EV: 80 };

/**
 * Если 30-минутная мощность не подтверждена документами, на практике берут
 * долю от пиковой. Коэффициент — сложившаяся практика, не норма закона.
 */
export const THIRTY_MINUTE_POWER_RATIO = 0.45;

/**
 * Полная ставка утильсбора, ₽. С 01.04.2026 физлиц по сути приравняли к
 * коммерческим импортёрам, поэтому таблица общая для обеих схем.
 * Пробел свыше 340 л.с. для ДВС оставлен намеренно: источники расходятся,
 * и подставлять сюда придуманное число хуже, чем вернуть флаг.
 */
export type RecyclingRow = { maxHp: number; new: number; used: number };
export const RECYCLING_FULL_ICE: readonly RecyclingRow[] = [
  { maxHp: 190, new: 750_000, used: 1_244_000 },
  { maxHp: 220, new: 794_000, used: 1_320_000 },
  { maxHp: 250, new: 842_000, used: 1_398_000 },
  { maxHp: 280, new: 952_000, used: 1_532_000 },
  { maxHp: 310, new: 1_076_000, used: 1_676_000 },
  { maxHp: 340, new: 1_216_000, used: 1_836_000 },
];

/** Для электро и гибридов свыше порога ставка плоская. */
export const RECYCLING_FULL_ELECTRIC = { new: 844_400, used: 1_485_200 } as const;

/** Сбор за таможенные операции, по таможенной стоимости в рублях. */
export type ClearanceRow = { maxValueRub: number; rub: number };
export const CLEARANCE_FEE: readonly ClearanceRow[] = [
  { maxValueRub: 200_000, rub: 1_067 },
  { maxValueRub: 450_000, rub: 2_134 },
  { maxValueRub: 1_200_000, rub: 4_269 },
  { maxValueRub: 2_700_000, rub: 11_746 },
  { maxValueRub: 4_200_000, rub: 16_524 },
  { maxValueRub: 5_500_000, rub: 21_344 },
  { maxValueRub: 7_000_000, rub: 27_540 },
  { maxValueRub: Infinity, rub: 30_000 },
];

/** Обязательное оформление: ЭРА-ГЛОНАСС, СБКТС, ЭПТС. Ориентировочно. */
export const HOMOLOGATION_FEES_RUB = 30_000 + 15_000 + 1_500;
