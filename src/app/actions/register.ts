// src/app/actions/register.ts
'use server'

import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { z } from "zod"

const registerSchema = z.object({
  companyName: z.string().trim().min(2, "Название компании слишком короткое"),
  email: z.string().trim().toLowerCase().email("Некорректный email"),
  password: z.string().min(8, "Пароль должен быть не короче 8 символов"),
})

export type RegisterState = {
  error?: string
  fieldErrors?: Partial<Record<"companyName" | "email" | "password", string[]>>
}

/** Транслитерация для slug: «Лучший Автоимпорт» не должен схлопнуться в дефисы. */
const TRANSLIT: Record<string, string> = {
  а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'i',к:'k',л:'l',м:'m',
  н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',
  ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya',
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .split('')
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base || 'org'}-${Date.now().toString(36).slice(-4)}`
}

// Сигнатура под useActionState: раньше экшен возвращал { error }, но страница
// передавала его прямо в <form action>, и возвращённое значение выбрасывалось —
// пользователь при ошибке валидации не видел ничего.
export async function registerAction(
  _prev: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const validated = registerSchema.safeParse({
    companyName: formData.get("companyName"),
    email: formData.get("email"),
    password: formData.get("password"),
  })

  if (!validated.success) {
    return { fieldErrors: validated.error.flatten().fieldErrors }
  }

  const { companyName, email, password } = validated.data

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return { error: "Пользователь с таким email уже зарегистрирован" }
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10)
    await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: companyName, slug: slugify(companyName) },
      })
      await tx.user.create({
        data: {
          email,
          passwordHash,
          name: companyName,
          role: 'OWNER',
          organizationId: org.id,
        },
      })
    })
  } catch (e) {
    console.error("Ошибка регистрации:", e)
    return { error: "Не удалось зарегистрироваться. Попробуйте ещё раз." }
  }

  redirect("/login?registered=1")
}
