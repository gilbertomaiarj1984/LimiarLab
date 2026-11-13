import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import RegisterSW from "@/components/RegisterSW";
import "./globals.css";

// Fontes servidas pelo próprio app (sem chamada ao Google em tempo de uso; funciona offline).
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "LimiarLab",
  description: "Prescrição, registro e estatísticas de treino",
  appleWebApp: { capable: true, title: "LimiarLab", statusBarStyle: "default" },
  icons: { icon: "/icons/icon.svg", apple: "/icons/apple-touch-icon.png" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef2f1" },
    { media: "(prefers-color-scheme: dark)", color: "#101614" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${body.variable} ${display.variable}`}>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
