// src/app/admin/dashboard/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/session";

export default async function DashboardPage() {
  const { organizationId, name } = await requireOrg();

  const [org, activeCount, recentCars] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      include: { _count: { select: { cars: true } } },
    }),
    // Раньше «активные виджеты» считали все машины подряд, хотя поле isActive
    // уже было — метрика просто врала.
    prisma.car.count({ where: { organizationId, isActive: true } }),
    prisma.car.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
  ]);

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-white">Привет, {name || 'коллега'}!</h1>
      <p className="text-zinc-500 mb-8">Кабинет «{org?.name}»</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl">
          <div className="text-zinc-500 text-sm font-medium uppercase tracking-wider mb-2">Всего машин</div>
          <div className="text-4xl font-bold text-white">{org?._count.cars ?? 0}</div>
        </div>

        <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl">
          <div className="text-zinc-500 text-sm font-medium uppercase tracking-wider mb-2">Активных виджетов</div>
          <div className="text-4xl font-bold text-orange-500">{activeCount}</div>
        </div>

        <div className="bg-gradient-to-br from-orange-600 to-orange-800 p-6 rounded-2xl text-white">
          <div className="text-white/80 text-sm font-medium uppercase tracking-wider mb-2">Быстрое действие</div>
          <Link href="/admin/library" className="block mt-2 bg-white/20 hover:bg-white/30 text-center py-2 rounded-lg transition-colors font-bold">
            + Добавить машину
          </Link>
        </div>
      </div>

      <h2 className="text-xl font-bold mb-4">Последние машины</h2>
      <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
        {recentCars.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            Машин пока нет — добавьте первую из{' '}
            <Link href="/admin/library" className="text-orange-500 hover:text-orange-400">библиотеки</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-400">
              <thead className="bg-black text-zinc-500 uppercase text-xs font-medium">
                <tr>
                  <th className="px-6 py-4">Модель</th>
                  <th className="px-6 py-4">Добавлена</th>
                  <th className="px-6 py-4 text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentCars.map((car) => (
                  <tr key={car.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{car.brand} {car.model}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{car.createdAt.toLocaleDateString('ru-RU')}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/cars/${car.id}`} className="text-orange-500 hover:text-orange-400">Править</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
