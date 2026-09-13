// src/app/admin/cars/page.tsx
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/session";
import { formatMillions, getVisibleTotal } from "@/lib/pricing/format";
import type { CarSpecs } from "@/types";

export default async function AdminCarsPage() {
  const { organizationId } = await requireOrg();

  const cars = await prisma.car.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
    include: { costs: true },
  });

  return (
    <div className="p-6 sm:p-8">
      <div className="flex justify-between items-center mb-8 gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Мои машины</h1>
        {/* Раньше это была кнопка без обработчика — нажималась и ничего не делала. */}
        <Link
          href="/admin/library"
          className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
        >
          + Добавить
        </Link>
      </div>

      {cars.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center text-zinc-500">
          Здесь пока пусто. Возьмите модель из{' '}
          <Link href="/admin/library" className="text-orange-500 hover:text-orange-400">библиотеки</Link>.
        </div>
      ) : (
        <div className="grid gap-4">
          {cars.map((car) => {
            const total = getVisibleTotal(car.costs);
            const specs = car.specs as unknown as Partial<CarSpecs>;

            return (
              <Link
                href={`/admin/cars/${car.id}`}
                key={car.id}
                className="flex flex-wrap sm:flex-nowrap items-center gap-4 p-4 bg-zinc-900/50 border border-white/5 rounded-xl hover:border-orange-500/50 transition-all group"
              >
                <div className="w-24 h-16 bg-black rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                  <Image src={car.image} width={96} height={64} className="w-20 h-auto object-contain" alt={`${car.brand} ${car.model}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg group-hover:text-orange-500 transition-colors truncate">
                    {car.brand} {car.model}
                  </h3>
                  <p className="text-zinc-500 text-sm truncate">{car.year} • {specs?.engine ?? '—'}</p>
                </div>

                <div className="text-right sm:px-6 sm:border-r border-white/10 shrink-0">
                  <div className="text-xs text-zinc-500 uppercase tracking-wider">Итог</div>
                  <div className="font-mono text-lg">{formatMillions(total)}</div>
                </div>

                <div className="sm:pl-6 shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs border ${car.isActive ? 'border-green-500/20 text-green-500 bg-green-500/10' : 'border-red-500/20 text-red-500'}`}>
                    {car.isActive ? 'Опубликована' : 'Черновик'}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
