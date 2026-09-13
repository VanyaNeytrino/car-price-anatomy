'use client'

import Link from "next/link"
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { registerAction, type RegisterState } from "@/app/actions/register"

const inputClass =
  "mt-1 block w-full rounded-md bg-black border border-white/10 px-3 py-2 text-white focus:border-orange-500 outline-none"

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return <p className="mt-1 text-xs text-red-400">{messages[0]}</p>
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
    >
      {pending ? 'Создаём аккаунт…' : 'Начать'}
    </button>
  )
}

export default function RegisterPage() {
  const [state, formAction] = useActionState<RegisterState, FormData>(registerAction, {})

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">
            Price<span className="text-orange-500">Anatomy</span>
          </h1>
          <h2 className="mt-6 text-2xl font-bold tracking-tight">Создать аккаунт</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Покажите клиентам, из чего складывается цена
          </p>
        </div>

        <form action={formAction} className="mt-8 space-y-6 bg-zinc-900 p-8 rounded-xl border border-white/10">
          {state.error && (
            <div role="alert" className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {state.error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-zinc-400">
                Название компании
              </label>
              <input id="companyName" name="companyName" type="text" required className={inputClass} placeholder="Лучший Автоимпорт" />
              <FieldError messages={state.fieldErrors?.companyName} />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-400">Email</label>
              <input id="email" name="email" type="email" required autoComplete="email" className={inputClass} placeholder="boss@bestauto.ru" />
              <FieldError messages={state.fieldErrors?.email} />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-400">Пароль</label>
              <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
              <FieldError messages={state.fieldErrors?.password} />
              <p className="mt-1 text-xs text-zinc-600">Не короче 8 символов</p>
            </div>
          </div>

          <SubmitButton />

          <div className="text-center text-sm text-zinc-500">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="font-medium text-orange-500 hover:text-orange-400">Войти</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
