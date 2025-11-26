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
