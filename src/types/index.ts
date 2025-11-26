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
  viewBox: string; // Можно оставить для совместимости
  svgPath: string; // Можно оставить для совместимости
  image: string;     // Фото для карточки на главной
  maskImage: string; // Фото БЕЗ ФОНА (PNG) для жидкого эффекта
  specs: {
    engine: string;
    power: string;
    range: string;
  };
  costs: CostLayer[];
};
