import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PriceAnatomy — из чего складывается цена авто",
    template: "%s — PriceAnatomy",
  },
  description:
    "Наглядный разбор стоимости импортного автомобиля: цена в Китае, логистика, пошлина, утильсбор, налоги и маржа дилера.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="bg-black text-white antialiased">{children}</body>
    </html>
  );
}
