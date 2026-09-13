// src/app/admin/cars/[id]/page.tsx
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/session";
import LiquidCar from "@/components/LiquidCar";
import CostEditor from "./_components/CostEditor";
import PricingInputs from "./_components/PricingInputs";
import EmbedSnippet from "./_components/EmbedSnippet";
import { toWidgetCar } from "@/lib/cars";

export default async function EditCarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organizationId } = await requireOrg();

  const car = await prisma.car.findFirst({
    where: { id, organizationId },
    include: { costs: { orderBy: { order: 'asc' } } },
  });
  if (!car) notFound();

  const carForPreview = toWidgetCar(car);

  // Раньше адрес собирался из NEXT_PUBLIC_URL с фоллбэком на localhost —
  // без переменной дилер копировал нерабочий код.
  const h = await headers();
  const origin =
    process.env.NEXT_PUBLIC_URL ??
    `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host') ?? 'localhost:3000'}`;

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-xl sm:text-2xl font-bold mb-8 text-zinc-400">
        Редактирование <span className="text-white">{car.brand} {car.model}</span>
      </h1>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div className="space-y-6 min-w-0">
          <PricingInputs
            carId={car.id}
            initial={{
              basePriceCny: car.basePriceCny,
              cnyRate: car.cnyRate?.toString() ?? null,
              eurRate: car.eurRate?.toString() ?? null,
              rateDate: car.rateDate,
              engineCc: car.engineCc,
              powerHp: car.powerHp,
              powertrain: car.powertrain,
              importScheme: car.importScheme,
            }}
          />

          <CostEditor carId={car.id} initialCosts={car.costs} initialIsActive={car.isActive} />

          <EmbedSnippet origin={origin} carId={car.id} layerCount={car.costs.filter((c) => c.isVisible).length} />
        </div>

        {/* Превью раньше было scale-75 внутри overflow-hidden и обрезалось. */}
        <div className="min-w-0">
          <div className="sticky top-6 bg-black border border-white/10 rounded-3xl p-4 relative">
            <div className="absolute top-4 right-4 z-50 bg-orange-500/20 text-orange-500 text-xs px-2 py-1 rounded border border-orange-500/20">
              Превью
            </div>
            <LiquidCar car={carForPreview} />
          </div>
        </div>
      </div>
    </div>
  );
}
