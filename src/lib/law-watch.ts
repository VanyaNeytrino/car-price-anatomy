// src/lib/law-watch.ts
//
// Сторож нормативки. Отвечает не на вопрос «верна ли цифра» — таблицы
// приложений машиночитаемо не публикуются, и разобрать их нельзя, — а на
// вопрос «не трогали ли норму с тех пор, как мы сверялись». Это и есть
// главный риск: за год ставки меняли четырежды, и каждый раз молча.
//
// Устройство продиктовано API: полнотекстового поиска нет (SearchText
// игнорируется), фильтров по дате нет тоже. Отдаётся вся лента актов, свежие
// сверху. Поэтому тянем страницы до последней проверки и фильтруем у себя.
import type { RateKey } from "@/lib/pricing/rate-keys";

// Внимание к регулярным выражениям ниже: \w в JavaScript — это [A-Za-z0-9_],
// кириллицу он не покрывает. Первая версия шаблонов была написана через \w
// и молча не находила ничего: «Налогов\w*» не совпадает с «Налогового».
// Поэтому везде явный класс [а-яё] с флагом i.

const API = "http://publication.pravo.gov.ru/api/Documents";
/** Единственный размер страницы, который API принимает. */
const PAGE_SIZE = 30;
/** Предохранитель: при кривой дате не уходить в бесконечный обход ленты. */
const MAX_PAGES = 40;

export type LegalAct = {
  eoNumber: string;
  title: string;
  publishedAt: Date;
  url: string;
};

export type ActMatch = { act: LegalAct; rateKeys: RateKey[]; matchedOn: string[] };

/**
 * Что считаем поводом насторожиться.
 *
 * Узко намеренно: если каждый второй акт красит ставку в «требует сверки»,
 * панелью перестанут пользоваться, и пометки обесценятся. Ложное срабатывание
 * тут дороже пропуска.
 *
 * ВАЖНО. Решения Совета ЕЭК (единая ставка физлица) на этом портале не
 * публикуются — он про акты России. Поэтому duty_unified сторожем не
 * покрывается, его придётся сверять руками.
 */
const PATTERNS: Array<{ keys: RateKey[]; label: string; re: RegExp; also?: RegExp }> = [
  {
    keys: ["recycling_ice", "recycling_ev"],
    label: "утилизационный сбор",
    re: /утилизационн[а-яё]*\s+сбор/i,
  },
  {
    keys: ["recycling_ice", "recycling_ev"],
    label: "постановление Правительства № 1291",
    // Голый «№ 1291» не годится: под этим номером есть акты в каждом регионе.
    re: /постановлени[а-яё]*\s+Правительства[^"«]{0,140}№\s*1291\b/i,
  },
  {
    keys: ["excise"],
    label: "акцизы на автомобили",
    // Одного слова «акциз» мало: под него попал памятник культуры
    // «Склады Акцизного управления».
    re: /акциз[а-яё]*/i,
    also: /автомобил|легков|Налогов[а-яё]*\s+кодекс|ставк[а-яё]*\s+акциз/i,
  },
  {
    keys: ["excise"],
    label: "изменения в Налоговый кодекс",
    // Ставки акцизов правят поправками в НК, и слова «акциз» в заголовке
    // такого закона нет: ФЗ № 425-ФЗ назывался просто «О внесении изменений
    // в часть вторую Налогового кодекса Российской Федерации».
    re: /Налогов[а-яё]*\s+кодекс[а-яё]*/i,
  },
  {
    keys: ["clearance_fee"],
    label: "таможенные операции",
    re: /таможенн[а-яё]*\s+операц[а-яё]*/i,
  },
  {
    keys: ["clearance_fee"],
    label: "постановление Правительства № 342",
    re: /постановлени[а-яё]*\s+Правительства[^"«]{0,140}№\s*342\b/i,
  },
  {
    keys: ["duty_legal"],
    label: "ввозные таможенные пошлины",
    re: /ввозн[а-яё]*\s+таможенн[а-яё]*\s+пошлин[а-яё]*/i,
  },
];

/**
 * Региональные акты отсеиваются целиком: все наши нормы федеральные.
 * Именно из-за их отсутствия в фильтре приказ соцзащиты Тульской области
 * «№ 342-осн» попал в выборку как изменение таможенного сбора.
 */
const REGIONAL = /(?:област[а-яё]*|кра[йея]|Республик[а-яё]*|автономн[а-яё]*\s+округ|окружн[а-яё]*\s+админист)/i;
const FEDERAL = /Российской\s+Федерации|Федеральный\s+закон/i;

export function isFederalAct(title: string): boolean {
  if (REGIONAL.test(title)) return false;
  return FEDERAL.test(title);
}

/** Ключи, которые сторож в принципе не увидит — их сверяют только руками. */
export const KEYS_NOT_WATCHED: RateKey[] = ["duty_unified"];

type ApiItem = {
  eoNumber?: string;
  complexName?: string | null;
  name?: string | null;
  publishDateShort?: string | null;
};

function toAct(item: ApiItem): LegalAct | null {
  const title = (item.complexName || item.name || "").replace(/\s+/g, " ").trim();
  const raw = item.publishDateShort;
  if (!title || !raw || !item.eoNumber) return null;

  const publishedAt = new Date(raw);
  if (Number.isNaN(publishedAt.getTime())) return null;

  return {
    eoNumber: item.eoNumber,
    title,
    publishedAt,
    url: `http://publication.pravo.gov.ru/document/${item.eoNumber}`,
  };
}

/** Акты, опубликованные не раньше `since`. Свежие идут первыми. */
export async function fetchRecentActs(
  since: Date
): Promise<{ acts: LegalAct[]; truncated: boolean }> {
  const acts: LegalAct[] = [];
  let truncated = true;

  for (let index = 1; index <= MAX_PAGES; index++) {
    const res = await fetch(`${API}?PageSize=${PAGE_SIZE}&Index=${index}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Портал правовой информации вернул ${res.status}`);

    const data = (await res.json()) as { items?: ApiItem[] };
    const items = data.items ?? [];
    if (items.length === 0) {
      truncated = false;
      break;
    }

    let reachedOlder = false;
    for (const item of items) {
      const act = toAct(item);
      if (!act) continue;
      if (act.publishedAt < since) {
        reachedOlder = true;
        continue;
      }
      acts.push(act);
    }

    if (reachedOlder) {
      truncated = false;
      break;
    }
  }

  // Упёрлись в предохранитель — лента просмотрена не до конца, и это надо
  // показать: «проверено частично» и «изменений нет» — разные вещи.
  return { acts, truncated };
}

/** По каким ставкам этот акт может ударить. Пустой массив — мимо. */
export function matchRateKeys(act: Pick<LegalAct, "title">): {
  rateKeys: RateKey[];
  matchedOn: string[];
} {
  const keys = new Set<RateKey>();
  const matchedOn: string[] = [];

  if (!isFederalAct(act.title)) return { rateKeys: [], matchedOn: [] };

  for (const p of PATTERNS) {
    if (!p.re.test(act.title)) continue;
    if (p.also && !p.also.test(act.title)) continue;
    matchedOn.push(p.label);
    p.keys.forEach((k) => keys.add(k));
  }

  return { rateKeys: [...keys], matchedOn };
}

/** Полный проход: что вышло с последней проверки и что из этого важно. */
export async function findRelevantActs(since: Date): Promise<{
  scanned: number;
  truncated: boolean;
  matches: ActMatch[];
}> {
  const { acts, truncated } = await fetchRecentActs(since);
  const matches: ActMatch[] = [];

  for (const act of acts) {
    const { rateKeys, matchedOn } = matchRateKeys(act);
    if (rateKeys.length > 0) matches.push({ act, rateKeys, matchedOn });
  }

  return { scanned: acts.length, truncated, matches };
}
