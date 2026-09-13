// src/lib/cbr.ts
// Курсы ЦБ. Раньше курс был зашит в цифры руками, и две машины в базе
// оказались посчитаны по разным курсам (13,27 и 10,77 ₽/¥).
import { XMLParser } from "fast-xml-parser";

export type CbrRates = { cny: number; eur: number; date: Date };

/** Открытый XML ЦБ. Без ключей, но может быть недоступен — курс вводится руками. */
export async function fetchCbrRates(): Promise<CbrRates> {
  const res = await fetch("https://www.cbr.ru/scripts/XML_daily.asp", {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`ЦБ вернул ${res.status}`);

  // Ответ в windows-1251.
  const xml = new TextDecoder("windows-1251").decode(await res.arrayBuffer());
  const parsed = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" }).parse(xml);

  const list: Array<Record<string, string>> = parsed?.ValCurs?.Valute ?? [];
  const pick = (code: string) => {
    const row = list.find((v) => v.CharCode === code);
    if (!row) throw new Error(`ЦБ не отдал курс ${code}`);
    return Number(String(row.Value).replace(",", ".")) / Number(row.Nominal ?? 1);
  };

  const [d, m, y] = String(parsed?.ValCurs?.["@_Date"] ?? "").split(".");
  return {
    cny: pick("CNY"),
    eur: pick("EUR"),
    date: d ? new Date(Number(y), Number(m) - 1, Number(d)) : new Date(),
  };
}
