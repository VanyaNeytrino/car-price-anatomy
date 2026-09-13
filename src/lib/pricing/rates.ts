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
    recycling: "ПП РФ № 1291 (ред. от 06.02.2026)",
    excise: "ФЗ от 28.11.2025 № 425-ФЗ",
    unifiedDuty: "Решение Совета ЕЭК № 107 (ред. от 24.02.2026), прил. 2, табл. 2 — сверено",
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
 * Полная ставка утильсбора, ₽.
 *
 * ВАЖНО: сбор зависит от рабочего объёма И мощности, а не от одной мощности.
 * Первая версия этой таблицы была только по мощности и давала для Lixiang L9
 * 794 000 ₽ — значение, которое не сходится ни с одним источником и не бьётся
 * с арифметикой «базовая ставка x коэффициент». Верное значение для 1,5 л и
 * 197 л.с. — 952 800 ₽ (коэффициент 47,64 x 20 000).
 *
 * Значения ниже подтверждены двумя независимыми источниками и сходятся с
 * базовой ставкой. Первоисточник — ПП РФ № 1291 (ред. от 06.02.2026),
 * приложение с перечнем коэффициентов; через открытые правовые базы полный
 * текст приложения вытащить не удалось, поэтому таблицу нужно сверить.
 */
export type RecyclingRow = { maxCc: number; maxHp: number; new: number; used: number };
export const RECYCLING_FULL: readonly RecyclingRow[] = [
  { maxCc: 2000, maxHp: 160, new: 800_800, used: 1_408_800 },
  { maxCc: 2000, maxHp: 190, new: 900_000, used: 1_492_000 },
  { maxCc: 2000, maxHp: 220, new: 952_800, used: 1_584_000 },
  { maxCc: 2000, maxHp: 250, new: 1_010_400, used: 1_677_600 },
  { maxCc: 3000, maxHp: 160, new: 2_250_400, used: 3_407_200 },
  { maxCc: 3000, maxHp: 190, new: 2_306_800, used: 3_456_000 },
  { maxCc: 3000, maxHp: 340, new: 2_726_400, used: 3_873_200 },
];

/**
 * Для чистых электромобилей рабочего объёма нет, и в перечне у них своя строка.
 * Достоверного значения найти не удалось: единственный источник давал 844 400 ₽,
 * и он же ошибался в таблице для ДВС. Поэтому значение помечается как требующее
 * проверки, а не выдаётся за точное.
 */
export const RECYCLING_ELECTRIC_UNVERIFIED = { new: 844_400, used: 1_485_200 } as const;

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
