import Link from 'next/link';
import { MOCK_CARS } from '@/data/cars';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-black text-white p-8 font-sans selection:bg-orange-500 selection:text-black">
      <div className="max-w-6xl mx-auto mt-10">
        
        {/* Заголовок */}
        <div className="text-center mb-20">
          <h1 className="text-6xl font-bold mb-6 tracking-tighter">
            Auto Price <span className="text-orange-500">Anatomy</span>
          </h1>
          <p className="text-zinc-500 text-lg max-w-2xl mx-auto">
            Визуальный разбор стоимости импортных автомобилей. <br/>
            Узнайте, сколько на самом деле стоит ваша мечта.
          </p>
        </div>

        {/* Сетка авто */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {MOCK_CARS.map((car) => {
            const total = car.costs.reduce((a, b) => a + b.amount, 0);
            
            return (
              <Link 
                href={`/car/${car.id}`} 
                key={car.id}
                className="group relative bg-[#0A0A0A] border border-white/10 rounded-[32px] overflow-hidden hover:border-orange-500/50 transition-all duration-500 hover:shadow-[0_0_40px_rgba(249,115,22,0.15)]"
              >
                {/* Блок с картинкой */}
                <div className="h-64 w-full bg-gradient-to-b from-zinc-900 to-black relative overflow-hidden flex items-center justify-center">
                   {/* Фоновое свечение */}
                   <div className="absolute inset-0 bg-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                   
                   {/* Изображение авто с зумом при наведении */}
                   <img 
                     src={car.image} 
                     alt={car.model}
                     className="w-[85%] object-contain drop-shadow-2xl transform group-hover:scale-110 transition-transform duration-700 ease-out"
                   />
                </div>

                {/* Информация */}
                <div className="p-8 relative">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-3xl font-bold text-white mb-1">{car.brand}</h2>
                      <p className="text-zinc-500 font-medium">{car.model}</p>
                    </div>
                    <div className="px-3 py-1 rounded-full border border-white/10 text-xs font-mono text-zinc-400">
                      {car.year}
                    </div>
                  </div>

                  <div className="flex items-end justify-between border-t border-white/5 pt-6 mt-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Total Price</span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold font-mono text-white group-hover:text-orange-500 transition-colors">
                          ~{(total / 1000000).toFixed(1)}
                        </span>
                        <span className="text-sm text-zinc-500 font-medium">млн ₽</span>
                      </div>
                    </div>
                    
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-black transition-colors duration-300">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
      </div>
    </main>
  );
}
