// src/app/actions/update-car-pricing.ts
'use server'

import { prisma } from "@/lib/prisma"
import { requireOrgForAction } from "@/lib/session"
import { fetchCbrRates } from "@/lib/cbr"
import { calcBreakdown, ageBandFromYear, type ImportScheme, type Powertrain } from "@/lib/pricing"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const num = (msg: string) => z.coerce.number({ message: msg }).nonnegative(msg)

const pricingSchema = z.object({
  basePriceCny: num("Цена в юанях должна быть числом"),
  cnyRate: z.coerce.number().positive("Курс юаня должен быть больше нуля"),
  eurRate: z.coerce.number().positive("Курс евро должен быть больше нуля"),
  engineCc: num("Объём должен быть числом"),
  powerHp: num("Мощность должна быть числом"),
  powertrain: z.enum(["ICE", "HYBRID", "EREV", "EV"]),
  importScheme: z.enum(["INDIVIDUAL", "LEGAL_ENTITY"]),
})

export type PricingFormState = { error?: string; ok?: string }

/** Слои, которые задаёт дилер. Калькулятор их не трогает — иначе затрёт ручной ввод. */
const MANUAL_KINDS = new Set(["LOGISTICS", "MARGIN", "MANUAL"])

async function assertOwnCar(carId: string) {
  const { organizationId } = await requireOrgForAction()
  const car = await prisma.car.findFirst({
    where: { id: carId, organizationId },
    include: { costs: { orderBy: { order: "asc" } } },
  })
  if (!car) throw new Error("Машина не найдена")
  return car
}

function revalidateCar(carId: string) {
  revalidatePath(`/admin/cars/${carId}`)
  revalidatePath(`/admin/cars`)
  revalidatePath(`/car/${carId}`)
  revalidatePath(`/embed/${carId}`)
  revalidatePath(`/`)
}

/** Сохраняет входные данные и пересчитывает автоматические слои. */
export async function saveAndRecalculate(
  carId: string,
  _prev: PricingFormState,
  formData: FormData
): Promise<PricingFormState> {
  const car = await assertOwnCar(carId)

  const parsed = pricingSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }
  const input = parsed.data

  // Ручные слои переносим как есть, автоматические — считаем заново.
  const manual = car.costs.filter((c) => MANUAL_KINDS.has(c.kind))
  const logistics = manual.find((c) => c.kind === "LOGISTICS")
  const margin = manual.find((c) => c.kind === "MARGIN")

  const result = calcBreakdown({
    basePriceCny: input.basePriceCny,
    cnyRate: input.cnyRate,
    eurRate: input.eurRate,
    engineCc: input.engineCc,
    powerHp: input.powerHp,
    powertrain: input.powertrain as Powertrain,
    ageBand: ageBandFromYear(car.year),
    scheme: input.importScheme as ImportScheme,
    logisticsRub: logistics?.amount ?? 0,
    marginRub: margin?.amount ?? 0,
  })

  await prisma.$transaction(async (tx) => {
    await tx.car.update({
      where: { id: carId },
      data: {
        basePriceCny: input.basePriceCny,
        cnyRate: input.cnyRate,
        eurRate: input.eurRate,
        engineCc: input.engineCc,
        powerHp: input.powerHp,
        powertrain: input.powertrain,
        importScheme: input.importScheme,
        rateDate: new Date(),
      },
    })

    // Прочие ручные слои (kind = MANUAL) сохраняем, остальные пересоздаём.
    const keep = car.costs.filter((c) => c.kind === "MANUAL")
    await tx.costLayer.deleteMany({
      where: { carId, id: { notIn: keep.map((c) => c.id) } },
    })

    await tx.costLayer.createMany({
      data: result.layers.map((layer, index) => ({
        carId,
        label: layer.label,
        amount: layer.amount,
        color: layer.color,
        description: layer.description,
        order: index,
        kind: layer.kind,
        isAuto: !MANUAL_KINDS.has(layer.kind),
      })),
    })
  })

  revalidateCar(carId)

  const warn = result.warnings.length ? ` Внимание: ${result.warnings.join(" ")}` : ""
  return { ok: `Пересчитано, ${result.layers.length} слоёв.${warn}` }
}

/** Подтягивает курс ЦБ на сегодня. Недоступен — говорим об этом, а не молчим. */
export async function pullCbrRates(carId: string): Promise<PricingFormState> {
  await assertOwnCar(carId)
  try {
    const rates = await fetchCbrRates()
    await prisma.car.update({
      where: { id: carId },
      data: { cnyRate: rates.cny, eurRate: rates.eur, rateDate: rates.date },
    })
    revalidateCar(carId)
    return { ok: `Курс ЦБ на ${rates.date.toLocaleDateString("ru-RU")}: ${rates.cny.toFixed(4)} ₽/¥` }
  } catch (e) {
    console.error("ЦБ недоступен:", e)
    return { error: "Не удалось получить курс ЦБ. Введите вручную." }
  }
}
