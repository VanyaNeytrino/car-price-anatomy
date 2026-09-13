// src/app/car/[id]/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { notFound } from 'next/navigation';
import LiquidCar from '@/components/LiquidCar';
import { getCarForWidget } from '@/lib/cars';
import { formatMillions, getVisibleTotal } from '@/lib/pricing/format';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const car = await getCarForWidget(id);
  if (!car) return { title: 'Машина не найдена' };

  const total = formatMillions(getVisibleTotal(car.costs));
  return {
    title: `${car.brand} ${car.model} — ${total}`,
    description: `Из чего складывается цена ${car.brand} ${car.model} ${car.year}: пошлина, утильсбор, налоги и маржа дилера.`,
    openGraph: {
      title: `${car.brand} ${car.model} — ${total}`,
      images: [car.image],
    },
  };
}

export default async function CarPage({ params }: Props) {
  const { id } = await params;

  // onlyActive по умолчанию: раньше публичная страница показывала черновики,
  // хотя embed их прятал.
  const car = await getCarForWidget(id);
  if (!car) return notFound();

  const specs = [
    { label: 'Двигатель', value: car.specs.engine },
    { label: 'Мощность', value: car.specs.power },
    { label: 'Запас хода', value: car.specs.range },
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-orange-500 selection:text-black relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-orange-600/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8 sm:py-10">
        <Link
          href="/"
          className="inline-flex items-center text-zinc-500 hover:text-orange-500 mb-8 sm:mb-10 transition-colors duration-300 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Назад
        </Link>

        <header className="mb-12 sm:mb-16 text-center">
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold mb-8 tracking-tight">
            {car.brand}{' '}
            <span className="text-orange-500 drop-shadow-[0_0_25px_rgba(249,115,22,0.4)]">
              {car.model}
            </span>
          </h1>

          <div className="flex justify-center gap-6 sm:gap-12 md:gap-16 font-mono text-sm uppercase tracking-[0.15em]">
            {specs.map((spec, i) => (
              <div key={spec.label} className="flex items-center gap-6 sm:gap-12 md:gap-16">
                {i > 0 && <div className="w-px h-12 bg-white/10" />}
                <div className="flex flex-col items-center gap-2">
                  <span className="text-zinc-500 text-[10px] font-bold">{spec.label}</span>
                  <span className="text-white text-base sm:text-lg md:text-xl font-medium normal-case tracking-normal">
                    {spec.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </header>

        <LiquidCar car={car} />
      </div>
    </div>
  );
}
