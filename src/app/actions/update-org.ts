// src/app/actions/update-org.ts
'use server'

import { prisma } from "@/lib/prisma"
import { requireOrgForAction } from "@/lib/session"
import { revalidatePath } from "next/cache"
import { z } from "zod"

const schema = z.object({ name: z.string().trim().min(2, "Слишком короткое название") })

export async function updateOrganization(formData: FormData) {
  const { organizationId } = await requireOrgForAction()

  const parsed = schema.safeParse({ name: formData.get("name") })
  if (!parsed.success) throw new Error(parsed.error.issues[0].message)

  await prisma.organization.update({
    where: { id: organizationId },
    data: { name: parsed.data.name }
  })

  revalidatePath('/admin')
}
