import { describe, expect, it } from "vitest";
import {
  ageBandFromYear,
  calcBreakdown,
  calcExcise,
  calcRecycling,
  isItemizedScheme,
  type PricingInput,
} from "../calc";
import { layoutWidths, getVisibleTotal, formatMoney } from "../format";

const base: PricingInput = {
  basePriceCny: 459_800,
  cnyRate: 12.5637,
  eurRate: 96.5,
  engineCc: 1500,
  powerHp: 449,
  powertrain: "EREV",
  ageBand: "NEW",
  scheme: "INDIVIDUAL",
};

describe("утильсбор", () => {
  it("даёт льготную ставку ДВС до 160 л.с.", () => {
    const r = calcRecycling({ ...base, powertrain: "ICE", powerHp: 150 });
    expect(r.amount).toBe(3_400);
  });

  it("снимает льготу у ДВС выше 160 л.с.", () => {
    const r = calcRecycling({ ...base, powertrain: "ICE", powerHp: 200 });
    expect(r.amount).toBe(794_000);
  });

  it("считает EREV по 30-минутной мощности, а не по пиковой", () => {
    // 449 пиковых -> 202 расчётных -> диапазон 190-220
    expect(calcRecycling(base).amount).toBe(794_000);
  });

  it("не даёт электромобилю выше 80 л.с. льготную ставку", () => {
    // Именно здесь в старых данных стояло 34 000 ₽.
    const r = calcRecycling({ ...base, powertrain: "EV", engineCc: 0, powerHp: 544 });
    expect(r.amount).toBe(844_400);
    expect(r.amount).not.toBe(34_000);
  });

  it("оставляет льготу маломощному электромобилю", () => {
    expect(calcRecycling({ ...base, powertrain: "EV", powerHp: 100 }).amount).toBe(3_400);
  });

  it("предупреждает, когда мощность выходит за известную таблицу", () => {
    const r = calcRecycling({ ...base, powertrain: "ICE", powerHp: 600 });
    expect(r.warning).toBeDefined();
  });
});

describe("схема ввоза", () => {
  it("у физлица с ДВС акциз и НДС не отдельными строками", () => {
    const kinds = calcBreakdown(base).layers.map((l) => l.kind);
    expect(kinds).not.toContain("VAT");
    expect(kinds).not.toContain("EXCISE");
  });

  it("у юрлица появляются акциз и НДС", () => {
    const kinds = calcBreakdown({ ...base, scheme: "LEGAL_ENTITY" }).layers.map((l) => l.kind);
    expect(kinds).toContain("VAT");
    expect(kinds).toContain("EXCISE");
  });

  it("электромобиль у физлица идёт по единой ставке, а не постатейно", () => {
    const ev = { ...base, powertrain: "EV" as const, engineCc: 0, scheme: "INDIVIDUAL" as const };
    expect(isItemizedScheme(ev)).toBe(false);
    expect(calcBreakdown(ev).layers.map((l) => l.kind)).not.toContain("VAT");
  });

  it("у электромобиля без объёма единая ставка даёт ровно 48%, порог €/см³ не срабатывает", () => {
    const ev = { ...base, powertrain: "EV" as const, engineCc: 0, scheme: "INDIVIDUAL" as const };
    const duty = calcBreakdown(ev).layers.find((l) => l.kind === "DUTY");
    const customsValue = ev.basePriceCny * ev.cnyRate;
    expect(duty?.amount).toBe(Math.round(customsValue * 0.48));
  });
});

describe("пошлина", () => {
  it("применяет минимум за см³, когда он больше процента", () => {
    // Дешёвая машина с большим мотором: должен сработать порог €/см³.
    const r = calcBreakdown({ ...base, basePriceCny: 30_000, engineCc: 3000, powertrain: "ICE" });
    const duty = r.layers.find((l) => l.kind === "DUTY");
    expect(duty?.description).toContain("минимум");
  });
});

describe("акциз", () => {
  it.each([
    [90, 0],
    [449, 449 * 1771],
    [544, 544 * 1829],
  ])("для %i л.с. даёт %i ₽", (hp, expected) => {
    expect(calcExcise(hp)).toBe(expected);
  });
});

describe("возраст", () => {
  const now = new Date("2026-09-13");
  it.each([
    [2026, "NEW"],
    [2024, "NEW"],
    [2022, "AGE_3_5"],
    [2019, "AGE_5_PLUS"],
  ])("год %i -> %s", (year, band) => {
    expect(ageBandFromYear(year, now)).toBe(band);
  });
});

describe("ширины полос", () => {
  it("всегда дают ровно 100%", () => {
    for (const amounts of [[1], [10_000_000, 1000], [5, 5, 5, 5], [9_000_000, 100, 200, 300]]) {
      const sum = layoutWidths(amounts).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(100, 6);
    }
  });

  it("не выдают NaN при нулевом итоге", () => {
    expect(layoutWidths([0, 0, 0]).every((w) => w === 0)).toBe(true);
    expect(layoutWidths([]).length).toBe(0);
  });

  it("подтягивают микрослой до минимума, не превышая 100%", () => {
    const w = layoutWidths([10_000_000, 1000]);
    expect(w[1]).toBeCloseTo(2.5, 6);
    expect(w[0] + w[1]).toBeCloseTo(100, 6);
  });
});

describe("итог по видимым слоям", () => {
  it("не учитывает скрытые — иначе главная и виджет расходятся", () => {
    const layers = [{ amount: 100 }, { amount: 50, isVisible: false }, { amount: 25 }];
    expect(getVisibleTotal(layers)).toBe(125);
  });
});

describe("форматирование", () => {
  it("мелкие суммы показывает целиком, а не как 0.03 млн", () => {
    expect(formatMoney(34_000)).toContain("34");
    expect(formatMoney(34_000)).not.toContain("0,03");
  });
});
