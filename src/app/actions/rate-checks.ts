// src/app/actions/rate-checks.ts
'use server'

import { prisma } from "@/lib/prisma"
import { requireOrgForAction } from "@/lib/session"
import { runRateCheck } from "@/lib/rate-check-run"
import { RATE_KEYS, RATE_KEY_LABELS, type RateKey } from "@/lib/pricing/rate-keys"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export type CheckState = { ok?: string; error?: string }

function revalidateEverywhere() {
  // Статус ставки виден и в админке, и в каждом виджете.
  revalidatePath('/admin/settings')
  revalidatePath('/admin/cars', 'layout')
  revalidatePath('/car', 'layout')
  revalidatePath('/embed', 'layout')
  revalidatePath('/')
}

/** Кнопка «Проверить сейчас». Тот же код, что и у ночного крона. */
export async function checkRatesNow(): Promise<CheckState> {
  await requireOrgForAction()

  try {
    const r = await runRateCheck()
    revalidateEverywhere()

    const head = `Просмотрено ${r.scanned} актов с ${r.since.toLocaleDateString('ru-RU')}`
    const tail = r.truncated ? ' (лента прочитана не до конца)' : ''

    if (r.changed.length === 0) {
      return { ok: `${head}${tail}. Изменений по нашим нормам нет.` }
    }
    return {
      ok: `${head}${tail}. Затронуты: ${r.changed.map((k) => RATE_KEY_LABELS[k]).join(', ')}.`,
    }
  } catch (e) {
    console.error('Проверка ставок не прошла:', e)
    // «Не проверилось» и «изменений нет» — разные вещи, и путать их нельзя.
    return { error: `Источник недоступен: ${e instanceof Error ? e.message : 'неизвестная ошибка'}` }
  }
}

const verifySchema = z.object({
  rateKey: z.enum(RATE_KEYS),
  sourceUrl: z.string().trim().url('Нужна ссылка на норму').or(z.literal('')),
  note: z.string().trim().max(500).optional(),
  redaction: z.string().trim().max(100).optional(),
})

/** «Отметить сверенной»: система запоминает кто, когда и по какой ссылке. */
export async function markRateVerified(
  _prev: CheckState,
  formData: FormData
): Promise<CheckState> {
  const session = await requireOrgForAction()

  const parsed = verifySchema.safeParse({
    rateKey: formData.get('rateKey'),
    sourceUrl: formData.get('sourceUrl') ?? '',
    note: formData.get('note') ?? undefined,
    redaction: formData.get('redaction') ?? undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const { rateKey, sourceUrl, note, redaction } = parsed.data
  const row = await prisma.rateCheck.findUnique({ where: { rateKey } })
  if (!row) return { error: 'Ставка не найдена' }

  const now = new Date()
  await prisma.rateCheck.update({
    where: { id: row.id },
    data: {
      status: 'VERIFIED',
      verifiedAt: now,
      verifiedBy: session.email,
      sourceUrl: sourceUrl || row.sourceUrl,
      lawRedaction: redaction || row.lawRedaction,
      note: note || row.note,
      events: {
        create: {
          kind: 'VERIFIED_BY_HUMAN',
          message: `${session.email} сверил ставку${redaction ? ` (${redaction})` : ''}${note ? `: ${note}` : ''}`,
          documentUrl: sourceUrl || row.sourceUrl,
        },
      },
    },
  })

  revalidateEverywhere()
  return { ok: `«${RATE_KEY_LABELS[rateKey as RateKey]}» отмечена сверенной` }
}
