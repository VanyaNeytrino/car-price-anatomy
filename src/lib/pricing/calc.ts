// src/lib/pricing/calc.ts
//
// Чистые функции: никаких обращений к БД, всё считается из входа.
// Благодаря этому логику можно покрыть тестами, а не проверять глазами по сайту.
import {
  CLEARANCE_FEE,
  EXCISE_PER_HP,
  HOMOLOGATION_FEES_RUB,
  LEGAL_ENTITY_DUTY_RATE,
  RECYCLING_BASE_RUB,
  RECYCLING_FULL_ELECTRIC,
  RECYCLING_FULL_ICE,
  RECYCLING_POWER_LIMIT,
  RECYCLING_PREFERENTIAL,
  THIRTY_MINUTE_POWER_RATIO,
  UNIFIED_RATE_NEW,
  USED_EUR_PER_CC,
  VAT_RATE,
  type AgeBand,
  type ImportScheme,
  type Powertrain,
} from "./rates";

export type CostKind =
  | "BASE"
  | "LOGISTICS"
  | "DUTY"
  | "EXCISE"
  | "VAT"
  | "RECYCLING"
  | "CLEARANCE"
  | "HOMOLOGATION"
  | "MARGIN"
  | "MANUAL";

/**
 * Цвета в HEX, а не классами Tailwind: класс из БД мог не попасть в сборку.
 * Оттенки подобраны так, чтобы соседние слои различались. Раньше НДС (#7c3aed)
 * и утильсбор (#9333ea) были почти одного цвета и сливались на машине.
 * Мелкие слои (сбор, оформление) — нейтральные серые: они занимают доли
 * процента, и тратить на них различимый оттенок незачем.
 */
export const KIND_COLORS: Record<CostKind, string> = {
  BASE: "#2563eb",         // синий
  LOGISTICS: "#06b6d4",    // бирюзовый
  DUTY: "#ea580c",         // оранжевый
  EXCISE: "#dc2626",       // красный
  VAT: "#7c3aed",          // фиолетовый
  RECYCLING: "#16a34a",    // зелёный
  CLEARANCE: "#475569",    // тёмно-серый
  HOMOLOGATION: "#94a3b8", // светло-серый
  MARGIN: "#facc15",       // жёлтый
  MANUAL: "#a855f7",
};

export const KIND_LABELS: Record<CostKind, string> = {
  BASE: "Цена в Китае",
  LOGISTICS: "Логистика",
  DUTY: "Пошлина",
  EXCISE: "Акциз",
  VAT: "НДС",
  RECYCLING: "Утильсбор",
  CLEARANCE: "Таможенный сбор",
  HOMOLOGATION: "Оформление",
  MARGIN: "Маржа дилера",
  MANUAL: "Прочее",
};

export type PricingInput = {
  /** Цена у завода в юанях. */
  basePriceCny: number;
  /** Курс ЦБ, ₽ за юань. */
  cnyRate: number;
  /** Курс ЦБ, ₽ за евро — нужен для порогов единой ставки. */
  eurRate: number;
  /** Рабочий объём, см³. У чистых электромобилей 0. */
  engineCc: number;
  /** Пиковая мощность, л.с. (из ПТС). */
  powerHp: number;
  /** 30-минутная мощность, если подтверждена документами. */
  thirtyMinutePowerHp?: number | null;
  powertrain: Powertrain;
  ageBand: AgeBand;
  scheme: ImportScheme;
  /** Ручные слои — движок их считать не умеет и не должен. */
  logisticsRub?: number;
  marginRub?: number;
};

export type CostLayerDraft = {
  kind: CostKind;
  label: string;
  amount: number;
  color: string;
  description: string;
};

export type PricingResult = {
  layers: CostLayerDraft[];
  total: number;
  /** Непустой список означает: цифру нельзя показывать клиенту как точную. */
  warnings: string[];
};

const round = (n: number) => Math.round(n);

function pickByMax<T>(table: readonly T[], key: keyof T, value: number): T {
  return table.find((row) => value <= (row[key] as number)) ?? table[table.length - 1];
}

/**
 * Мощность, по которой считают утильсбор. Для электро и гибридов берут
 * 30-минутную, а не пиковую; без документов на практике применяют долю от пиковой.
 */
export function recyclingPower(input: Pick<PricingInput, "powertrain" | "powerHp" | "thirtyMinutePowerHp">): number {
  if (input.powertrain === "ICE") return input.powerHp;
  return input.thirtyMinutePowerHp ?? Math.round(input.powerHp * THIRTY_MINUTE_POWER_RATIO);
}

/**
 * Постатейная разбивка (пошлина + акциз + НДС) — только для коммерческого ввоза.
 *
 * Электромобили здесь не исключение. Единая ставка физлица применяется и к ним:
 * порог «не менее €/см³» просто не срабатывает, потому что рабочего объёма нет,
 * и остаются чистые 48%. Сверка с рынком это подтверждает — по единой ставке
 * Zeekr 009 и 001 дают дилеру 15-17% маржи, что похоже на правду.
 */
export function isItemizedScheme(input: Pick<PricingInput, "scheme" | "powertrain">): boolean {
  return input.scheme === "LEGAL_ENTITY";
}

export function calcDuty(input: PricingInput): { amount: number; note: string } {
  const customsValueRub = input.basePriceCny * input.cnyRate;

  if (isItemizedScheme(input)) {
    return {
      amount: round(customsValueRub * LEGAL_ENTITY_DUTY_RATE),
      note: `Ввозная пошлина ${LEGAL_ENTITY_DUTY_RATE * 100}%`,
    };
  }

  // Физлицо, подержанное — фиксированная сумма за см³, без процента.
  if (input.ageBand !== "NEW") {
    const row = pickByMax(USED_EUR_PER_CC[input.ageBand], "maxCc", input.engineCc);
    return {
      amount: round(input.engineCc * row.eurPerCc * input.eurRate),
      note: `Единая ставка, €${row.eurPerCc}/см³`,
    };
  }

  // Физлицо, новое — берётся большее из процента и минимума за см³.
  const customsValueEur = customsValueRub / input.eurRate;
  const row = pickByMax(UNIFIED_RATE_NEW, "maxValueEur", customsValueEur);
  const byValue = customsValueEur * row.rate;
  const byVolume = input.engineCc * row.minEurPerCc;
  const usedFloor = byVolume > byValue;

  return {
    amount: round(Math.max(byValue, byVolume) * input.eurRate),
    note: usedFloor
      ? `Единая ставка, минимум €${row.minEurPerCc}/см³`
      : `Единая ставка ${Math.round(row.rate * 100)}% — включает акциз и НДС`,
  };
}

export function calcExcise(powerHp: number): number {
  const row = pickByMax(EXCISE_PER_HP, "maxHp", powerHp);
  return round(powerHp * row.rub);
}

export function calcRecycling(input: PricingInput): { amount: number; note: string; warning?: string } {
  const power = recyclingPower(input);
  const limit = RECYCLING_POWER_LIMIT[input.powertrain];
  const isNew = input.ageBand === "NEW";

  if (power <= limit) {
    const coef = isNew ? RECYCLING_PREFERENTIAL.NEW : RECYCLING_PREFERENTIAL.USED;
    return {
      amount: round(RECYCLING_BASE_RUB * coef),
      note: `Льготная ставка, до ${limit} л.с.`,
    };
  }

  // У чистых электромобилей двигателя нет, для них ставка плоская.
  if (input.powertrain === "EV") {
    return {
      amount: isNew ? RECYCLING_FULL_ELECTRIC.new : RECYCLING_FULL_ELECTRIC.used,
      note: `Полная ставка: ${power} л.с. выше порога ${limit} л.с.`,
    };
  }

  const row = RECYCLING_FULL_ICE.find((r) => power <= r.maxHp);
  if (!row) {
    // Намеренно не выдумываем число: источники по диапазону свыше 340 л.с.
    // расходятся, и тихая подстановка — ровно та ошибка, из-за которой
    // в seed оказался утильсбор 34 000 ₽.
    const fallback = RECYCLING_FULL_ICE[RECYCLING_FULL_ICE.length - 1];
    return {
      amount: isNew ? fallback.new : fallback.used,
      note: `Свыше 340 л.с. — ставка требует уточнения`,
      warning: `Утильсбор для ${power} л.с. выходит за известную таблицу (до 340 л.с.). Показана ставка верхнего диапазона — сверьте с ПП РФ № 1291.`,
    };
  }

  return {
    amount: isNew ? row.new : row.used,
    note: `Полная ставка, до ${row.maxHp} л.с. (30-мин. мощность ${power} л.с.)`,
  };
}

export function calcClearanceFee(customsValueRub: number): number {
  return pickByMax(CLEARANCE_FEE, "maxValueRub", customsValueRub).rub;
}

/** Собирает полную разбивку. Порядок слоёв = порядок полос в виджете. */
export function calcBreakdown(input: PricingInput): PricingResult {
  const warnings: string[] = [];
  const layers: CostLayerDraft[] = [];

  const push = (kind: CostKind, amount: number, description: string, label?: string) => {
    if (amount <= 0) return;
    layers.push({ kind, label: label ?? KIND_LABELS[kind], amount, color: KIND_COLORS[kind], description });
  };

  const customsValueRub = round(input.basePriceCny * input.cnyRate);
  push(
    "BASE",
    customsValueRub,
    `${input.basePriceCny.toLocaleString("ru-RU")} ¥ по курсу ${input.cnyRate.toFixed(4)} ₽`
  );

  if (input.logisticsRub) {
    push("LOGISTICS", round(input.logisticsRub), "Доставка и документы до границы");
  }

  const duty = calcDuty(input);
  push("DUTY", duty.amount, duty.note);

  // При единой ставке физлица акциз и НДС уже внутри пошлины — отдельными
  // строками их показывать нельзя, получится двойной счёт.
  if (isItemizedScheme(input)) {
    const excise = calcExcise(input.powerHp);
    push("EXCISE", excise, `${input.powerHp} л.с.`);

    const vatBase = customsValueRub + duty.amount + excise;
    push("VAT", round(vatBase * VAT_RATE), `${VAT_RATE * 100}% от стоимости с пошлиной и акцизом`);
  }

  const recycling = calcRecycling(input);
  push("RECYCLING", recycling.amount, recycling.note);
  if (recycling.warning) warnings.push(recycling.warning);

  push("CLEARANCE", calcClearanceFee(customsValueRub), "Сбор за таможенные операции");
  push("HOMOLOGATION", HOMOLOGATION_FEES_RUB, "ЭРА-ГЛОНАСС, СБКТС, ЭПТС");

  if (input.marginRub) {
    push("MARGIN", round(input.marginRub), "Наценка дилера");
  }

  return {
    layers,
    total: layers.reduce((sum, l) => sum + l.amount, 0),
    warnings,
  };
}

/** Возраст по году выпуска — для выбора таблицы ставок. */
export function ageBandFromYear(year: number, now = new Date()): AgeBand {
  const age = now.getFullYear() - year;
  if (age < 3) return "NEW";
  if (age < 5) return "AGE_3_5";
  return "AGE_5_PLUS";
}

export type { AgeBand, ImportScheme, Powertrain };
