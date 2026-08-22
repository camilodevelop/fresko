import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import { CartProvider } from "@/components/cart/CartProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FRESKO | Bowls y ensaladas frescas en Bogotá",
  description:
    "Ensaladas y bowls preparados diariamente con ingredientes frescos y balanceados. Pide hoy, arma tu bowl y disfruta comida saludable premium en Bogotá.",
  keywords: [
    "bowls",
    "ensaladas",
    "comida saludable",
    "Bogotá",
    "delivery",
    "FRESKO",
  ],
  openGraph: {
    title: "FRESKO | Fresco. Saludable. Hecho para ti.",
    description:
      "Bowls y ensaladas premium con entrega en Bogotá. Arma tu bowl personalizado.",
    type: "website",
    locale: "es_CO",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${inter.variable} ${poppins.variable}`}>
      <body className="min-h-screen antialiased">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
