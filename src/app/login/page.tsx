// src/app/login/page.tsx
// Своя страница вместо дефолтного экрана NextAuth: тот не стилизован
// и выпадает из оформления продукта.
import { Suspense } from "react"
import LoginForm from "./LoginForm"

// Суффикс « — PriceAnatomy» добавляет шаблон в корневом layout.
export const metadata = { title: "Вход" }

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
