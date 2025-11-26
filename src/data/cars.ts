import { Car } from '@/types';

export const MOCK_CARS: Car[] = [
  {
    id: 'lixiang-l9',
    brand: 'Lixiang',
    model: 'L9 Ultra',
    year: 2025,
    viewBox: "0 0 1000 380",
    svgPath: "M50,150 Q60,100 120,90 L280,85 L680,75 Q750,80 780,130 L890,140 Q910,160 910,220 L910,260 Q910,290 880,300 L800,300 Q800,230 730,230 Q660,230 660,300 L340,300 Q340,230 270,230 Q200,230 200,300 L100,300 Q80,300 80,270 L80,220 Q80,180 50,150 Z",
    
    image: '/cars/lixiang.png',       
    maskImage: '/cars/l9-mask.png',   
    
    specs: { engine: '1.5T EREV', power: '449 HP', range: '1315 KM' },
    costs: [
      { id: 'factory', label: 'Цена завода', amount: 6100000, color: 'bg-blue-600', description: 'China Price' },
      // ЛОГИСТИКА ТЕПЕРЬ CYAN (БИРЮЗОВАЯ)
      { id: 'logistics', label: 'Логистика', amount: 460000, color: 'bg-cyan-500', description: 'Delivery & Docs' },
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
    
    image: '/cars/zeekr.png',         
    maskImage: '/cars/zeekr-mask.png', 
    
    specs: { engine: 'EV', power: '544 HP', range: '702 KM' },
    costs: [
      { id: 'factory', label: 'Factory Price', amount: 8500000, color: 'bg-blue-600', description: '' },
      // ЛОГИСТИКА ТЕПЕРЬ CYAN
      { id: 'logistics', label: 'Logistics', amount: 500000, color: 'bg-cyan-500', description: '' },
      { id: 'customs', label: 'Customs', amount: 3200000, color: 'bg-orange-600', description: '' },
      { id: 'util', label: 'Util Fee', amount: 34000, color: 'bg-green-500', description: '' },
      { id: 'margin', label: 'Margin', amount: 300000, color: 'bg-yellow-400', description: '' },
    ],
  },
];
