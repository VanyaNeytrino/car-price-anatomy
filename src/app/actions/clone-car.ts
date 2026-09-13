'use server'

import { prisma } from "@/lib/prisma"
import { requireOrgForAction } from "@/lib/session"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function cloneCarFromTemplate(templateId: string) {
  const { organizationId } = await requireOrgForAction()

  // isTemplate в условии обязателен: без него любой залогиненный пользователь
  // клонировал чужую машину по id вместе с её ценами.
  const template = await prisma.car.findFirst({
    where: { id: templateId, isTemplate: true },
    include: { costs: { orderBy: { order: "asc" } } }
  })

  if (!template) throw new Error("Шаблон не найден")

  // 2. Создаем копию для организации пользователя
  const newCar = await prisma.car.create({
    data: {
      organizationId,
      brand: template.brand,
      model: template.model,
      year: template.year,
      image: template.image,
      maskImage: template.maskImage,
      viewBox: template.viewBox,
      svgPath: template.svgPath,
      basePriceCny: template.basePriceCny,
      cnyRate: template.cnyRate,
      eurRate: template.eurRate,
      rateDate: template.rateDate,
      engineCc: template.engineCc,
      powerHp: template.powerHp,
      thirtyMinutePowerHp: template.thirtyMinutePowerHp,
      powertrain: template.powertrain,
      importScheme: template.importScheme,
      specs: template.specs ?? {},
      isTemplate: false, // Это уже не шаблон, а реальная машина
      
      // Копируем слои цены
      costs: {
        create: template.costs.map((cost) => ({
          label: cost.label,
          amount: cost.amount,
          color: cost.color,
          description: cost.description,
          order: cost.order,
          kind: cost.kind,
          isAuto: cost.isAuto
        }))
      }
    }
  })

  revalidatePath('/admin/cars')
  redirect(`/admin/cars/${newCar.id}`) // Сразу кидаем в редактор
}
