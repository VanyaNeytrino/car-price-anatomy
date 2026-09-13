// src/app/admin/layout.tsx
import Link from "next/link";
import { requireOrg } from "@/lib/session";
import { signOut } from "@/auth";

const NAV = [
  { href: "/admin/dashboard", label: "Сводка" },
  { href: "/admin/cars", label: "Мои машины" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireOrg();

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-black text-white">
      <aside className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-white/10 p-4 md:p-6 flex flex-col">
        <Link href="/" className="text-2xl font-bold mb-6 md:mb-10 text-orange-500 block hover:text-orange-400">
          PriceAnatomy
        </Link>

        <nav className="flex md:flex-col gap-2 flex-wrap md:flex-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="px-4 py-2 rounded hover:bg-white/5 text-zinc-400 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}

          <Link
            href="/admin/library"
            className="flex items-center gap-2 px-4 py-2 rounded bg-orange-600/10 text-orange-500 font-medium hover:bg-orange-600/20 transition-colors"
          >
            <span aria-hidden>+</span> Из библиотеки
          </Link>

          <div className="hidden md:block h-px bg-white/10 my-4 mx-4" />

          <Link href="/admin/settings" className="px-4 py-2 rounded hover:bg-white/5 text-zinc-400 hover:text-white transition-colors">
            Настройки
          </Link>
        </nav>

        <div className="mt-4 md:mt-auto md:pt-6 md:border-t border-white/10">
          <div className="text-xs text-zinc-500 mb-2 truncate">{session.email}</div>
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/login' });
            }}
          >
            <button type="submit" className="text-sm text-zinc-400 hover:text-white">
              Выйти
            </button>
          </form>
        </div>
      </aside>

      <main className="flex-1 bg-[#0A0A0A] min-w-0">{children}</main>
    </div>
  );
}
