import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireOrg } from "@/lib/session";
import { cloneCarFromTemplate } from "@/app/actions/clone-car";
import { formatMillions, getVisibleTotal } from "@/lib/pricing/format";

export default async function LibraryPage() {
  await requireOrg();

  const templates = await prisma.car.findMany({
    where: { isTemplate: true },
    include: { costs: true },
    orderBy: { brand: 'asc' },
  });

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Библиотека моделей</h1>
      <p className="text-zinc-500 mb-8">Возьмите готовый расчёт за основу и поправьте под себя.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {templates.map((tmpl) => (
          <div key={tmpl.id} className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden hover:border-orange-500/50 transition-all flex flex-col">
            <div className="h-48 bg-black flex items-center justify-center p-4">
              <Image src={tmpl.image} width={320} height={180} className="max-w-full h-auto object-contain" alt={`${tmpl.brand} ${tmpl.model}`} />
            </div>
            <div className="p-6 flex-1 flex flex-col">
              <h3 className="text-xl font-bold text-white">{tmpl.brand} {tmpl.model}</h3>
              <p className="text-sm text-zinc-500 mt-1">
                {tmpl.year} • {formatMillions(getVisibleTotal(tmpl.costs))}
              </p>
              <form action={cloneCarFromTemplate.bind(null, tmpl.id)} className="mt-6">
                <button
                  type="submit"
                  className="w-full py-2 bg-white text-black font-bold rounded hover:bg-orange-500 hover:text-white transition-colors"
                >
                  Взять за основу
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
