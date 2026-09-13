// src/app/actions/login.ts
'use server'

import { signIn } from "@/auth"
import { AuthError } from "next-auth"

export type LoginState = { error?: string }

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const callbackUrl = (formData.get("callbackUrl") as string) || "/admin/dashboard"

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: callbackUrl,
    })
    return {}
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Неверный email или пароль" }
    }
    // signIn бросает NEXT_REDIRECT при успехе — его нельзя глотать.
    throw error
  }
}
