import { MOCK_CARS } from '@/data/cars';
import LiquidCar from '@/components/LiquidCar';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function CarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const car = MOCK_CARS.find((c) => c.id === id);

  if (!car) return <div className="text-white text-center mt-20">Car not found</div>;

  return (
    <div className="min-h-screen bg-black text-white selection:bg-orange-500 selection:text-black relative overflow-hidden">
      
      {/* Фоновое оранжевое свечение */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-orange-600/10 blur-[150px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-10">
        <Link 
          href="/" 
          className="inline-flex items-center text-zinc-500 hover:text-orange-500 mb-10 transition-colors duration-300 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> 
          Back
        </Link>

        <header className="mb-20 text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight">
            {car.brand} <span className="text-orange-500 drop-shadow-[0_0_25px_rgba(249,115,22,0.4)]">{car.model}</span>
          </h1>
          
          {/* Исправленная читаемость характеристик */}
          <div className="flex justify-center gap-8 md:gap-16 font-mono text-sm uppercase tracking-[0.15em]">
             <div className="flex flex-col items-center gap-2 group">
               <span className="text-zinc-500 text-[10px] font-bold group-hover:text-orange-500 transition-colors">Engine</span>
               <span className="text-white text-lg md:text-xl font-medium">{car.specs.engine}</span>
             </div>
             <div className="w-px h-12 bg-white/10" />
             <div className="flex flex-col items-center gap-2 group">
               <span className="text-zinc-500 text-[10px] font-bold group-hover:text-orange-500 transition-colors">Power</span>
               <span className="text-white text-lg md:text-xl font-medium">{car.specs.power}</span>
             </div>
             <div className="w-px h-12 bg-white/10" />
             <div className="flex flex-col items-center gap-2 group">
               <span className="text-zinc-500 text-[10px] font-bold group-hover:text-orange-500 transition-colors">Range</span>
               <span className="text-white text-lg md:text-xl font-medium">{car.specs.range}</span>
             </div>
          </div>
        </header>

        <LiquidCar car={car} />
      </div>
    </div>
  );
}
