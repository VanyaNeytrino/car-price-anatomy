import { describe, expect, it } from "vitest";
import { rateKeyForLayer, RATE_KEY_LABELS, RATE_KEY_LAWS, RATE_KEYS } from "../rate-keys";

const individual = { scheme: "INDIVIDUAL" } as const;

describe("ключ ставки для слоя", () => {
  it("у электромобиля утильсбор считается по своей строке перечня", () => {
    expect(rateKeyForLayer("RECYCLING", { ...individual, powertrain: "EV" })).toBe("recycling_ev");
  });

  it("у гибрида с объёмом — по строке для ДВС", () => {
    // Именно это различие и было потеряно: обе ставки выглядели одинаково.
    expect(rateKeyForLayer("RECYCLING", { ...individual, powertrain: "EREV" })).toBe("recycling_ice");
    expect(rateKeyForLayer("RECYCLING", { ...individual, powertrain: "ICE" })).toBe("recycling_ice");
  });

  it("пошлина зависит от схемы ввоза", () => {
    expect(rateKeyForLayer("DUTY", { powertrain: "ICE", scheme: "INDIVIDUAL" })).toBe("duty_unified");
    expect(rateKeyForLayer("DUTY", { powertrain: "ICE", scheme: "LEGAL_ENTITY" })).toBe("duty_legal");
  });

  it("слои, которые дилер вбивает руками, никакой нормой не регулируются", () => {
    for (const kind of ["BASE", "LOGISTICS", "MARGIN", "MANUAL", "HOMOLOGATION"] as const) {
      expect(rateKeyForLayer(kind, { ...individual, powertrain: "ICE" })).toBeNull();
    }
  });

  it("у каждого ключа есть название и норма", () => {
    for (const key of RATE_KEYS) {
      expect(RATE_KEY_LABELS[key]).toBeTruthy();
      expect(RATE_KEY_LAWS[key].title).toBeTruthy();
      expect(RATE_KEY_LAWS[key].url).toMatch(/^https:\/\//);
    }
  });
});
