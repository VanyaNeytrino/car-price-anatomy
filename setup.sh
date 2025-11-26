#!/bin/bash

echo "🚗 Начало настройки проекта..."

# 1. Создаем структуру папок
echo "📂 Создаем папки..."
mkdir -p src/app/car/[id]
mkdir -p src/components
mkdir -p src/data
mkdir -p src/types

# 2. src/types/index.ts
echo "📝 Создаем типы..."
cat > src/types/index.ts << 'EOF'
export type CostLayer = {
  id: string;
  label: string;
  amount: number;
  color: string;
  description: string;
};

export type Car = {
  id: string;
  brand: string;
  model: string;
  year: number;
  viewBox: string;
  svgPath: string;
  specs: {
    engine: string;
    power: string;
    range: string;
  };
  costs: CostLayer[];
};
EOF

# 3. src/data/cars.ts
echo "📝 Создаем данные машин..."
cat > src/data/cars.ts << 'EOF'
import { Car } from '@/types';

export const MOCK_CARS: Car[] = [
  {
    id: 'lixiang-l9',
    brand: 'Lixiang',
    model: 'L9 Ultra',
    year: 2025,
    viewBox: "0 0 500 200",
    svgPath: "M40,140 Q40,100 90,85 L160,60 L380,60 Q440,65 460,110 L470,140 Q470,170 430,170 L390,170 Q390,130 350,130 Q310,130 310,170 L190,170 Q190,130 150,130 Q110,130 110,170 L50,170 Q30,170 40,140 Z",
    specs: { engine: '1.5T EREV', power: '449 HP', range: '1315 KM' },
    costs: [
      { id: 'factory', label: 'Цена завода', amount: 6100000, color: 'bg-blue-600', description: 'China Price' },
      { id: 'logistics', label: 'Логистика', amount: 460000, color: 'bg-slate-500', description: 'Delivery & Docs' },
      { id: 'customs', label: 'Таможня', amount: 2900000, color: 'bg-orange-600', description: '48% Duty' },
      { id: 'util', label: 'Утильсбор', amount: 1828000, color: 'bg-purple-600', description: 'New Fee 2025' },
      { id: 'margin', label: 'Маржа', amount: 100000, color: 'bg-yellow-400', description: 'Dealer Profit' },
    ],
  },
  {
    id: 'zeekr-009',
    brand: 'Zeekr',
    model: '009 Grand',
    year: 2025,
    viewBox: "0 0 500 200",
    svgPath: "M30,140 L40,70 L140,40 L400,40 L460,80 L460,150 L430,170 L390,170 Q390,130 350,130 Q310,130 310,170 L190,170 Q190,130 150,130 Q110,130 110,170 L30,170 Z",
    specs: { engine: 'EV', power: '544 HP', range: '702 KM' },
    costs: [
      { id: 'factory', label: 'Factory Price', amount: 8500000, color: 'bg-blue-600', description: '' },
      { id: 'logistics', label: 'Logistics', amount: 500000, color: 'bg-slate-500', description: '' },
      { id: 'customs', label: 'Customs', amount: 3200000, color: 'bg-orange-600', description: '' },
      { id: 'util', label: 'Util Fee', amount: 34000, color: 'bg-green-500', description: '' },
      { id: 'margin', label: 'Margin', amount: 300000, color: 'bg-yellow-400', description: '' },
    ],
  },
];
EOF

# 4. src/components/LiquidCar.tsx
echo "📝 Создаем компонент LiquidCar..."
cat > src/components/LiquidCar.tsx << 'EOF'
'use client';

import { motion } from 'framer-motion';
import { Car } from '@/types';
import { useMemo } from 'react';

interface LiquidCarProps {
  car: Car;
}

export default function LiquidCar({ car }: LiquidCarProps) {
  const totalPrice = useMemo(() => 
    car.costs.reduce((acc, item) => acc + item.amount, 0), 
  [car]);

  return (
    <div className="flex flex-col lg:flex-row gap-12 items-center justify-center w-full max-w-7xl mx-auto p-4">
      
      <div className="relative w-full max-w-2xl aspect-[2.5/1] group">
        <svg className="absolute inset-0 w-full h-full text-zinc-800" viewBox={car.viewBox}>
           <path d={car.svgPath} fill="currentColor" fillOpacity="0.3" stroke="#333" strokeWidth="1" />
        </svg>

        <div className="absolute inset-0 w-full h-full">
           <div 
             className="w-full h-full flex flex-col-reverse justify-end relative z-10"
             style={{
               maskImage: `url("data:image/svg+xml,%3Csvg viewBox='${car.viewBox}' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='${car.svgPath}' fill='black'/%3E%3C/svg%3E")`,
               maskSize: 'contain',
               maskRepeat: 'no-repeat',
               maskPosition: 'center',
               WebkitMaskImage: `url("data:image/svg+xml,%3Csvg viewBox='${car.viewBox}' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='${car.svgPath}' fill='black'/%3E%3C/svg%3E")`,
               WebkitMaskSize: 'contain',
               WebkitMaskRepeat: 'no-repeat',
               WebkitMaskPosition: 'center',
             }}
           >
             {car.costs.map((layer, index) => {
               const heightPercent = (layer.amount / totalPrice) * 100;
               return (
                 <motion.div
                   key={layer.id}
                   initial={{ height: 0 }}
                   animate={{ height: `${heightPercent}%` }}
                   transition={{ duration: 1.2, delay: index * 0.2, ease: "easeInOut" }}
                   className={`w-full relative ${layer.color} backdrop-blur-sm bg-opacity-80 border-t border-white/10`}
                 >
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-50" />
                 </motion.div>
               );
             })}
           </div>
        </div>

        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" viewBox={car.viewBox}>
            <path d={car.svgPath} fill="url(#shine)" className="opacity-20 mix-blend-overlay" />
            <path d={car.svgPath} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
            <defs>
              <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(45)">
                <stop offset="0%" stopColor="white" stopOpacity="0" />
                <stop offset="50%" stopColor="white" stopOpacity="0.8" />
                <stop offset="100%" stopColor="white" stopOpacity="0" />
              </linearGradient>
            </defs>
        </svg>
      </div>

      <div className="w-full lg:w-96 bg-zinc-900/50 p-8 rounded-3xl border border-zinc-800 backdrop-blur-xl">
        <h3 className="text-lg font-medium text-zinc-400 mb-6 border-b border-zinc-800 pb-2">Калькуляция</h3>
        <div className="space-y-4">
          {[...car.costs].reverse().map((layer) => (
            <div key={layer.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${layer.color} shadow-[0_0_10px_currentColor]`} />
                <div className="flex flex-col">
                  <span className="text-zinc-200 font-semibold">{layer.label}</span>
                  <span className="text-[10px] text-zinc-500">{layer.description}</span>
                </div>
              </div>
              <div className="text-right">
                 <div className="text-white font-mono font-bold">{(layer.amount / 1000000).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 pt-6 border-t border-zinc-800">
            <span className="text-3xl font-bold text-white font-mono">{(totalPrice / 1000000).toFixed(2)} млн ₽</span>
        </div>
      </div>
    </div>
  );
}
EOF

# 5. src/app/page.tsx
echo "📝 Перезаписываем главную страницу..."
cat > src/app/page.tsx << 'EOF'
import Link from 'next/link';
import { MOCK_CARS } from '@/data/cars';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white p-8 font-sans">
      <div className="max-w-6xl mx-auto mt-10">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-600">
            Auto Price Anatomy
          </h1>
          <p className="text-zinc-500">Visual breakdown of imported car costs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {MOCK_CARS.map((car) => {
            const total = car.costs.reduce((a, b) => a + b.amount, 0);
            return (
              <Link 
                href={`/car/${car.id}`} 
                key={car.id}
                className="group bg-zinc-900/40 border border-zinc-800 rounded-3xl overflow-hidden hover:border-purple-500/50 transition-all"
              >
                <div className="h-48 bg-zinc-950/50 flex items-center justify-center p-8">
                   <svg className="w-full h-full text-zinc-700 group-hover:text-purple-500 transition-colors" viewBox={car.viewBox}>
                     <path d={car.svgPath} fill="currentColor" />
                   </svg>
                </div>
                <div className="p-8">
                  <h2 className="text-2xl font-bold mb-2">{car.brand} {car.model}</h2>
                  <div className="text-3xl font-mono font-bold text-purple-400">
                    ~{(total / 1000000).toFixed(1)} млн ₽
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
EOF

# 6. src/app/car/[id]/page.tsx
echo "📝 Создаем страницу автомобиля..."
cat > src/app/car/[id]/page.tsx << 'EOF'
import { MOCK_CARS } from '@/data/cars';
import LiquidCar from '@/components/LiquidCar';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function CarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const car = MOCK_CARS.find((c) => c.id === id);

  if (!car) return <div className="text-white text-center mt-20">Car not found</div>;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-purple-500 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-10">
        <Link href="/" className="inline-flex items-center text-zinc-500 hover:text-white mb-10 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Link>

        <header className="mb-16 text-center">
          <h1 className="text-5xl font-bold mb-4">{car.brand} <span className="text-purple-400">{car.model}</span></h1>
          <div className="flex justify-center gap-8 text-zinc-600 font-mono text-sm">
             <span>{car.specs.engine}</span>
             <span>{car.specs.power}</span>
          </div>
        </header>

        <LiquidCar car={car} />
      </div>
    </div>
  );
}
EOF

# 7. src/app/layout.tsx
echo "📝 Обновляем Layout..."
cat > src/app/layout.tsx << 'EOF'
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Auto Price Anatomy",
  description: "Visual cost breakdown",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">
        {children}
      </body>
    </html>
  );
}
EOF

# 8. src/app/globals.css
echo "📝 Чистим CSS..."
cat > src/app/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

# 9. tailwind.config.ts
echo "⚙️ Настраиваем Tailwind..."
cat > tailwind.config.ts << 'EOF'
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/data/**/*.{js,ts,jsx,tsx,mdx}", 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  safelist: [
    'bg-blue-600', 'bg-slate-500', 'bg-orange-600', 'bg-purple-600', 'bg-yellow-400', 'bg-green-500', 'shadow-[0_0_10px_currentColor]'
  ]
};
export default config;
EOF

echo "✅ Все готово! Запускай: npm run dev"
