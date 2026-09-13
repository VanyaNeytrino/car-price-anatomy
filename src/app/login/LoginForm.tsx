'use client'

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { loginAction, type LoginState } from "@/app/actions/login"

const inputClass =
  "mt-1 block w-full rounded-md bg-black border border-white/10 px-3 py-2 text-white focus:border-orange-500 outline-none"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
    >
      {pending ? 'Входим…' : 'Войти'}
    </button>
  )
}

export default function LoginForm() {
  const params = useSearchParams()
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {})
  const justRegistered = params.get("registered") === "1"
  const callbackUrl = params.get("callbackUrl") ?? "/admin/dashboard"

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="text-center">
        <Link href="/" className="text-4xl font-bold tracking-tight">
          Price<span className="text-orange-500">Anatomy</span>
        </Link>
        <h2 className="mt-6 text-2xl font-bold tracking-tight">Вход в кабинет</h2>
      </div>

      <form action={formAction} className="space-y-6 bg-zinc-900 p-8 rounded-xl border border-white/10">
        {justRegistered && (
          <div className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-300">
            Аккаунт создан. Войдите, пожалуйста.
          </div>
        )}
        {state.error && (
          <div role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {state.error}
          </div>
        )}

        <input type="hidden" name="callbackUrl" value={callbackUrl} />

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-400">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-400">Пароль</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className={inputClass} />
        </div>

        <SubmitButton />

        <div className="text-center text-sm text-zinc-500">
          Нет аккаунта?{' '}
          <Link href="/register" className="font-medium text-orange-500 hover:text-orange-400">Зарегистрироваться</Link>
        </div>
      </form>
    </div>
  )
}
