'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Car } from '@/types';
import { useMemo, useState } from 'react';

interface LiquidCarProps {
  car: Car;
}

const getHexColor = (tailwindClass: string) => {
  const map: Record<string, string> = {
    'bg-blue-600': '#2563eb',
    'bg-orange-600': '#ea580c',
    'bg-purple-600': '#9333ea',
    'bg-yellow-400': '#facc15',
    'bg-green-500': '#22c55e',
    'bg-cyan-500': '#06b6d4',
  };
  return map[tailwindClass] || '#ffffff';
};

export default function LiquidCar({ car }: LiquidCarProps) {
  const [hoveredLayerId, setHoveredLayerId] = useState<string | null>(null);

  const totalPrice = useMemo(() => 
    car.costs.reduce((acc, item) => acc + item.amount, 0), 
  [car]);

  const maskImage = car.maskImage;

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-center justify-center w-full max-w-[1400px] mx-auto p-4 lg:p-6">
      
      {/* --- БЛОК МАШИНЫ --- */}
      <div className="relative w-full max-w-4xl aspect-[2.2/1] group select-none">
        
        {maskImage ? (
           <div className="relative w-full h-full filter drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)]">
              
              <img src={maskImage} alt={car.model} className="absolute inset-0 w-full h-full object-contain opacity-10 grayscale brightness-50 pointer-events-none" />

              {/* КОНТЕЙНЕР ДЛЯ "ЖИДКОСТИ" */}
              <div 
                className="absolute inset-0 w-full h-full"
                style={{
                  maskImage: `url(${maskImage})`,
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskImage: `url(${maskImage})`,
                }}
              >
                 <div className="w-full h-full flex flex-row relative z-10">
                   {car.costs.map((layer, index) => {
                     const realPercent = (layer.amount / totalPrice) * 100;
                     const widthPercent = realPercent > 0 && realPercent < 2.5 ? 2.5 : realPercent;
                     const isHovered = hoveredLayerId === layer.id;
                     const isAnyHovered = hoveredLayerId !== null;
                     
                     return (
                       // ОПТИМИЗАЦИЯ: Слой имеет финальную ширину, анимируется только transform: scaleX
                       <div
                         key={layer.id}
                         className="h-full origin-left" // <-- Указываем, что scale должен идти от левого края
                         style={{ width: `${widthPercent}%`, willChange: 'transform' }}
                         onMouseEnter={() => setHoveredLayerId(layer.id)}
                         onMouseLeave={() => setHoveredLayerId(null)}
                         onClick={() => setHoveredLayerId(isHovered ? null : layer.id)}
                       >
                         <motion.div
                           initial={{ scaleX: 0 }}
                           animate={{ 
                             scaleX: 1,
                             opacity: isAnyHovered && !isHovered ? 0.3 : 1,
                           }}
                           transition={{ 
                             scaleX: { duration: 1.5, delay: index * 0.15, ease: [0.22, 1, 0.36, 1] },
                             opacity: { duration: 0.3 },
                           }}
                           // ОПТИМИЗАЦИЯ: Убираем backdrop-blur на мобильных
                           className={`w-full h-full relative ${layer.color} bg-opacity-90 lg:backdrop-blur-lg origin-left`}
                         >
                            <div className="absolute top-0 right-0 w-px h-full bg-white/20 z-20" />

                            {/* Эффект свечения, упрощен */}
                            {isHovered && (
                               <motion.div 
                                 initial={{ opacity: 0 }}
                                 animate={{ opacity: 1 }}
                                 className="absolute inset-0 z-30 shadow-[inset_0_0_20px_rgba(255,255,255,0.6),0_0_30px_5px_currentColor]"
                               />
                            )}

                            {/* Тултип */}
                            <AnimatePresence>
                              {isHovered && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: -50 }}
                                  exit={{ opacity: 0 }}
                                  className="absolute left-1/2 -translate-x-1/2 -top-4 z-50 pointer-events-none whitespace-nowrap hidden sm:block"
                                >
                                  <div className="bg-black/80 backdrop-blur-md border border-white/10 px-4 py-2 rounded-lg shadow-lg">
                                    <span className="font-mono font-bold text-lg text-white">
                                      {(layer.amount / 1000000).toFixed(2)} млн
                                    </span>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                         </motion.div>
                       </div>
                     );
                   })}
                 </div>
              </div>

              <img src={maskImage} alt="details" className="absolute inset-0 w-full h-full object-contain mix-blend-overlay opacity-40 pointer-events-none" />
              
              <div 
                className="absolute inset-0 w-full h-full pointer-events-none mix-blend-soft-light opacity-30"
                style={{
                  background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.7) 50%, transparent 60%)',
                  maskImage: `url(${maskImage})`,
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                }}
              />
           </div>
        ) : (
           <div className="flex items-center justify-center h-full border border-dashed border-zinc-800 rounded-3xl text-zinc-600">
              <span>Mask Image Not Found</span>
           </div>
        )}
      </div>

      {/* --- ЛЕГЕНДА --- */}
      <div className="w-full lg:w-[400px] relative mt-6 lg:mt-0">
        <div className="relative bg-[#111]/80 backdrop-blur-2xl p-6 lg:p-8 rounded-3xl border border-white/10">
          <h3 className="text-xs font-bold text-zinc-500 mb-6 uppercase tracking-[0.2em]">Price Breakdown</h3>
          <div className="space-y-2">
            {[...car.costs].reverse().map((layer) => {
               const isHovered = hoveredLayerId === layer.id;
               const textColor = isHovered ? getHexColor(layer.color) : '#fff';

               return (
                <motion.div 
                  key={layer.id} 
                  className="relative z-10 p-3 rounded-xl cursor-pointer"
                  onMouseEnter={() => setHoveredLayerId(layer.id)}
                  onMouseLeave={() => setHoveredLayerId(null)}
                  onClick={() => setHoveredLayerId(isHovered ? null : layer.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <motion.div 
                        animate={{ scale: isHovered ? 1.4 : 1 }}
                        className={`w-3 h-3 rounded-full ${layer.color}`} 
                      />
                      <span className="text-sm font-medium" style={{ color: isHovered ? textColor : '#a1a1aa' }}>
                          {layer.label}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-lg" style={{ color: isHovered ? textColor : '#71717a' }}>
                        {(layer.amount / 1000000).toFixed(2)}
                    </span>
                  </div>
                </motion.div>
               );
            })}
          </div>
          <div className="mt-8 pt-6 border-t border-white/10">
             <div className="flex justify-between items-baseline">
                <span className="text-zinc-500 text-xs uppercase tracking-widest">Total</span>
                <span className="text-3xl lg:text-4xl font-bold text-white font-mono">
                  {(totalPrice / 1000000).toFixed(2)}
                  <span className="text-base text-zinc-500 ml-2">млн ₽</span>
                </span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
