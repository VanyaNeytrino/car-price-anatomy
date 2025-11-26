'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Car } from '@/types';
import { useMemo, useState } from 'react';

interface LiquidCarProps {
  car: Car;
}

// Хелпер для конвертации классов Tailwind в цвета для текста/теней
const getHexColor = (tailwindClass: string) => {
  const map: Record<string, string> = {
    'bg-blue-600': '#2563eb',
    'bg-slate-500': '#64748b',
    'bg-orange-600': '#ea580c',
    'bg-purple-600': '#9333ea',
    'bg-yellow-400': '#facc15',
    'bg-green-500': '#22c55e',
    'bg-cyan-500': '#06b6d4', // Новый цвет логистики
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
    // АДАПТИВНОСТЬ: flex-col (мобайл) -> lg:flex-row (десктоп)
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-center justify-center w-full max-w-[1400px] mx-auto p-4 lg:p-6">
      
      {/* --- БЛОК МАШИНЫ (СЛЕВА/СВЕРХУ) --- */}
      <div className="relative w-full max-w-4xl aspect-[2.2/1] group select-none">
        
        {maskImage ? (
           <div className="relative w-full h-full filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.7)] lg:drop-shadow-[0_40px_80px_rgba(0,0,0,0.7)]">
              
              {/* 1. Темная подложка (Силуэт) */}
              <img 
                src={maskImage} 
                alt={car.model} 
                className="absolute inset-0 w-full h-full object-contain opacity-10 grayscale brightness-50 pointer-events-none" 
              />

              {/* 2. ЖИДКОСТЬ (Маскированная область) */}
              <div 
                className="absolute inset-0 w-full h-full"
                style={{
                  maskImage: `url(${maskImage})`,
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskImage: `url(${maskImage})`,
                  WebkitMaskSize: 'contain',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskPosition: 'center',
                }}
              >
                 <div className="w-full h-full flex flex-row relative z-10">
                   {car.costs.map((layer, index) => {
                     const realPercent = (layer.amount / totalPrice) * 100;
                     // Минимальная ширина 2.5% для узких слоев (маржа), чтобы в неё можно было попасть пальцем
                     const widthPercent = realPercent > 0 && realPercent < 2.5 ? 2.5 : realPercent;

                     const isHovered = hoveredLayerId === layer.id;
                     const isAnyHovered = hoveredLayerId !== null;
                     
                     return (
                       <motion.div
                         key={layer.id}
                         initial={{ width: 0, opacity: 0 }}
                         animate={{ 
                           width: `${widthPercent}%`, 
                           opacity: isAnyHovered && !isHovered ? 0.2 : 1,
                           filter: isHovered ? 'brightness(1.4) saturate(1.6)' : 'brightness(1) saturate(1)'
                         }}
                         transition={{ 
                           width: { duration: 1.5, delay: index * 0.2, ease: [0.22, 1, 0.36, 1] },
                           opacity: { duration: 0.3 },
                           filter: { duration: 0.3 }
                         }}
                         className={`h-full relative ${layer.color} backdrop-blur-md`}
                         onMouseEnter={() => setHoveredLayerId(layer.id)}
                         onMouseLeave={() => setHoveredLayerId(null)}
                         // Клик для мобильных устройств (аналог hover)
                         onClick={() => setHoveredLayerId(isHovered ? null : layer.id)}
                       >
                          <div className="absolute top-0 right-0 w-[1px] h-full bg-white/30 z-20" />

                          {/* GLOW EFFECT (Свечение при выборе) */}
                          {isHovered && (
                             <motion.div 
                               initial={{ opacity: 0 }}
                               animate={{ opacity: 1 }}
                               className="absolute inset-0 z-30"
                               style={{
                                 boxShadow: `inset 0 0 40px 0 rgba(255,255,255,0.7), 0 0 50px 10px currentColor`
                               }}
                             />
                          )}

                          {/* TOOLTIP: Скрываем на совсем маленьких экранах (мобильных), чтобы не перекрывал контент */}
                          <AnimatePresence>
                            {isHovered && (
                              <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                animate={{ opacity: 1, y: -50, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="absolute left-1/2 -translate-x-1/2 -top-4 z-50 pointer-events-none whitespace-nowrap hidden sm:block"
                              >
                                <div className="bg-[#09090b]/90 backdrop-blur-xl border border-white/10 px-5 py-3 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col items-center relative">
                                  <span className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: getHexColor(layer.color) }}>
                                    {layer.label}
                                  </span>
                                  <span className="font-mono font-bold text-xl text-white">
                                    {(layer.amount / 1000000).toFixed(2)} <span className="text-sm text-zinc-500">млн</span>
                                  </span>
                                  {/* Стрелка тултипа */}
                                  <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#09090b]/90 border-r border-b border-white/10 rotate-45" />
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                       </motion.div>
                     );
                   })}
                 </div>
              </div>

              {/* 3. Детали поверх (Фары, двери) */}
              <img 
                src={maskImage} 
                alt="details" 
                className="absolute inset-0 w-full h-full object-contain mix-blend-overlay opacity-50 pointer-events-none" 
              />
              
              {/* Глобальный блик (Reflection) */}
              <div 
                className="absolute inset-0 w-full h-full pointer-events-none mix-blend-soft-light opacity-40"
                style={{
                  background: 'linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.8) 45%, rgba(255,255,255,0) 50%)',
                  maskImage: `url(${maskImage})`,
                  maskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskImage: `url(${maskImage})`,
                }}
              />
           </div>
        ) : (
           <div className="flex flex-col items-center justify-center h-full border border-dashed border-zinc-800 rounded-3xl text-zinc-600">
              <span>No Mask Image</span>
              <span className="text-xs mt-2 text-zinc-800 font-mono">{car.maskImage}</span>
           </div>
        )}
      </div>

      {/* --- ЛЕГЕНДА (СПРАВА/СНИЗУ) --- */}
      <div className="w-full lg:w-[400px] relative mt-6 lg:mt-0">
        <div className="relative bg-[#0A0A0A]/90 backdrop-blur-2xl p-6 lg:p-8 rounded-3xl border border-white/10 shadow-2xl">
          {/* ЗАГОЛОВОК НА АНГЛИЙСКОМ */}
          <h3 className="text-[10px] lg:text-xs font-bold text-zinc-500 mb-6 uppercase tracking-[0.2em]">
            Price Breakdown
          </h3>
          
          <div className="space-y-2 relative">
            <div className="absolute left-[15px] top-4 bottom-4 w-[1px] bg-zinc-800 z-0" />

            {[...car.costs].reverse().map((layer) => {
               const isHovered = hoveredLayerId === layer.id;
               const textColor = isHovered ? getHexColor(layer.color) : '#fff';

               return (
                <motion.div 
                  key={layer.id} 
                  // active:scale-95 для тактильного отклика при тапе
                  className={`relative z-10 p-3 rounded-xl cursor-pointer transition-all duration-300 ${isHovered ? 'bg-white/5' : 'hover:bg-white/5'} active:scale-95`}
                  onMouseEnter={() => setHoveredLayerId(layer.id)}
                  onMouseLeave={() => setHoveredLayerId(null)}
                  onClick={() => setHoveredLayerId(isHovered ? null : layer.id)}
                  whileHover={{ x: 5 }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Индикатор-точка */}
                      <motion.div 
                        animate={{ 
                          scale: isHovered ? 1.5 : 1,
                          boxShadow: isHovered ? `0 0 15px ${getHexColor(layer.color)}` : 'none' 
                        }}
                        className={`w-3 h-3 rounded-full ${layer.color} ring-2 ring-[#0A0A0A]`} 
                      />
                      
                      <div className="flex flex-col">
                        {/* Название слоя (подсвечивается цветом при наведении) */}
                        <span 
                          className="text-sm font-medium transition-colors duration-200"
                          style={{ color: isHovered ? textColor : '#a1a1aa' }}
                        >
                          {layer.label}
                        </span>
                        {/* Описание скрываем на узких экранах для экономии места */}
                        <span className="text-[10px] text-zinc-600 uppercase tracking-wider hidden sm:block">
                          {layer.description}
                        </span>
                      </div>
                    </div>
                    
                    {/* Цена (подсвечивается цветом при наведении) */}
                    <div className="text-right flex flex-col items-end">
                      <span 
                         className="font-mono font-bold text-lg transition-colors duration-200"
                         style={{ 
                           color: isHovered ? textColor : '#71717a',
                           textShadow: isHovered ? `0 0 20px ${textColor}` : 'none'
                         }}
                      >
                        {(layer.amount / 1000000).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </motion.div>
               );
            })}
          </div>

          {/* ИТОГ */}
          <div className="mt-8 pt-6 border-t border-white/10">
             <div className="flex justify-between items-baseline">
                <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Total</span>
                <span className="text-3xl lg:text-4xl font-bold text-white font-mono tracking-tighter">
                  {(totalPrice / 1000000).toFixed(2)}
                  <span className="text-base lg:text-lg text-zinc-500 font-normal ml-2">mln ₽</span>
                </span>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
