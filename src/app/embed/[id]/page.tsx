// src/app/embed/[id]/page.tsx
import LiquidCar, { type WidgetTheme } from "@/components/LiquidCar";
import { getCarForWidget } from "@/lib/cars";

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ theme?: string }>;
};

export default async function EmbedPage({ params, searchParams }: Props) {
  const [{ id }, { theme }] = await Promise.all([params, searchParams]);

  // Дилеры ставят виджет на светлые сайты (см. public/test-widget.html),
  // а он был нарисован только под чёрный фон — белый текст не читался.
  const widgetTheme: WidgetTheme = theme === 'light' ? 'light' : 'dark';

  const car = await getCarForWidget(id);

  if (!car) {
    return (
      <div data-embed className="flex items-center justify-center p-6">
        <div className={`px-6 py-4 rounded-xl border text-center ${
          widgetTheme === 'light'
            ? 'bg-white border-black/10 text-zinc-500'
            : 'bg-black/80 backdrop-blur border-white/10 text-zinc-400'
        }`}>
          <p className="text-sm font-mono">Виджет недоступен</p>
        </div>
      </div>
    );
  }

  // Раньше здесь были min-h-screen и scale-90: внутри <iframe height="600">
  // это давало обрезку и лишний скролл. Теперь высота по содержимому.
  //
  // Фон задаёт сама обёртка, а не страница. При полностью прозрачном фоне
  // тёмный виджет, открытый по ссылке напрямую, оказывался белым текстом на
  // белом листе — дилер, решивший посмотреть ссылку, видел пустоту.
  return (
    <div
      data-embed
      className={widgetTheme === 'light' ? 'bg-white text-zinc-900' : 'bg-[#0A0A0A] text-white'}
    >
      <LiquidCar car={car} theme={widgetTheme} />
    </div>
  );
}
