// src/app/actions/update-costs.ts
'use server'

import { prisma } from "@/lib/prisma"
import { requireOrgForAction } from "@/lib/session"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const layerSchema = z.object({
  // У новых слоёв id ещё нет.
  id: z.string().optional(),
  label: z.string().trim().min(1, "У слоя должно быть название"),
  amount: z.coerce.number().int().nonnegative("Сумма не может быть отрицательной"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Цвет должен быть в формате #RRGGBB"),
  description: z.string().nullable().optional(),
  isVisible: z.boolean().optional(),
  kind: z.string().optional(),
})

export type CostInput = z.input<typeof layerSchema>

export async function updateCarData(carId: string, costs: CostInput[], isActive: boolean) {
  const { organizationId } = await requireOrgForAction()

  const car = await prisma.car.findFirst({
    where: { id: carId, organizationId },
    include: { costs: { select: { id: true } } },
  })
  if (!car) throw new Error("Машина не найдена")

  const parsed = z.array(layerSchema).safeParse(costs)
  if (!parsed.success) throw new Error(parsed.error.issues[0].message)
  const layers = parsed.data

  // Подменой id в запросе нельзя дотянуться до чужих строк.
  const ownIds = new Set(car.costs.map((c) => c.id))
  if (layers.some((l) => l.id && !ownIds.has(l.id))) {
    throw new Error("Слой не принадлежит этой машине")
  }

  const keptIds = layers.map((l) => l.id).filter((id): id is string => Boolean(id))

  await prisma.$transaction(async (tx) => {
    await tx.car.update({ where: { id: carId }, data: { isActive } })

    // Удалённые в редакторе слои убираем из базы.
    await tx.costLayer.deleteMany({ where: { carId, id: { notIn: keptIds } } })

    for (const [index, layer] of layers.entries()) {
      const data = {
        label: layer.label,
        amount: layer.amount,
        color: layer.color,
        description: layer.description ?? null,
        isVisible: layer.isVisible !== false,
        order: index,
      }

      if (layer.id) {
        await tx.costLayer.update({ where: { id: layer.id }, data })
      } else {
        await tx.costLayer.create({
          data: { ...data, carId, kind: layer.kind ?? "MANUAL", isAuto: false },
        })
      }
    }
  })

  // Раньше не ревалидировались публичная страница и главная — после правки
  // цен посетитель ещё долго видел старую сумму.
  revalidatePath(`/admin/cars/${carId}`)
  revalidatePath(`/admin/cars`)
  revalidatePath(`/embed/${carId}`)
  revalidatePath(`/car/${carId}`)
  revalidatePath(`/`)
}
