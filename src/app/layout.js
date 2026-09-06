import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata = {
  title: "Numa · Control de pedidos",
  description: "Registro y seguimiento de pedidos a proveedores.",
};

export default function RootLayout({ children }) {
  return <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}><body>{children}</body></html>;
}
