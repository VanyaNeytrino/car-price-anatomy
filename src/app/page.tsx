// src/app/page.tsx
import Link from 'next/link';
import Image from 'next/image';
import { prisma } from '@/lib/prisma';
import { formatMillions, getVisibleTotal } from '@/lib/pricing/format';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const cars = await prisma.car.findMany({
    where: { isActive: true },
    include: { costs: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <main className="min-h-screen bg-black text-white p-6 sm:p-8 font-sans selection:bg-orange-500 selection:text-black">
      <div className="max-w-6xl mx-auto mt-10">
        <div className="text-center mb-16 sm:mb-20">
          <h1 className="text-4xl sm:text-6xl font-bold mb-6 tracking-tighter">
            Анатомия <span className="text-orange-500">цены</span>
          </h1>
          <p className="text-zinc-500 text-base sm:text-lg max-w-2xl mx-auto">
            Наглядный разбор стоимости импортного автомобиля — от цены у завода
            до маржи дилера.
          </p>
        </div>

        {cars.length === 0 ? (
          <div className="max-w-md mx-auto text-center border border-dashed border-white/10 rounded-3xl p-12">
            <p className="text-zinc-400 mb-2">Пока нет ни одной машины</p>
            <p className="text-sm text-zinc-600">
              Добавьте её из библиотеки в{' '}
              <Link href="/admin/library" className="text-orange-500 hover:text-orange-400">
                кабинете
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
            {cars.map((car) => {
              // Только видимые слои — иначе итог на главной расходится с виджетом.
              const total = getVisibleTotal(car.costs);

              return (
                <Link
                  href={`/car/${car.id}`}
                  key={car.id}
                  className="group relative bg-[#0A0A0A] border border-white/10 rounded-[32px] overflow-hidden hover:border-orange-500/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(249,115,22,0.15)]"
                >
                  <div className="h-56 sm:h-64 w-full bg-gradient-to-b from-zinc-900 to-black relative overflow-hidden flex items-center justify-center">
                    <div className="absolute inset-0 bg-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <Image
                      src={car.image}
                      alt={`${car.brand} ${car.model}`}
                      width={600}
                      height={340}
                      className="w-[85%] h-auto object-contain drop-shadow-2xl transform group-hover:scale-110 transition-transform duration-700 ease-out"
                    />
                  </div>

                  <div className="p-6 sm:p-8 relative">
                    <div className="flex justify-between items-start mb-4 gap-4">
                      <div className="min-w-0">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1 truncate">{car.brand}</h2>
                        <p className="text-zinc-500 font-medium truncate">{car.model}</p>
                      </div>
                      <div className="px-3 py-1 rounded-full border border-white/10 text-xs font-mono text-zinc-400 shrink-0">
                        {car.year}
                      </div>
                    </div>

                    <div className="flex items-end justify-between border-t border-white/5 pt-6 mt-6 gap-4">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">
                          Итоговая цена
                        </span>
                        <span className="text-2xl sm:text-3xl font-bold font-mono text-white group-hover:text-orange-500 transition-colors truncate">
                          {formatMillions(total)}
                        </span>
                      </div>

                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-black transition-colors duration-300 shrink-0">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M5 12h14" />
                          <path d="M12 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
