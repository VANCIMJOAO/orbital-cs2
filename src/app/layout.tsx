import type { Metadata, Viewport } from "next";
import { Orbitron, JetBrains_Mono, Inter, Rajdhani, Anton, Russo_One, Chakra_Petch } from "next/font/google";
import "./globals.css";
import { LayoutShell } from "@/components/layout-shell";
import { AuthProvider } from "@/lib/auth-context";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const russoOne = Russo_One({
  variable: "--font-russo",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ORBITAL ROXA | CS2 Tournament",
  description: "Plataforma de gerenciamento de campeonatos CS2 - ORBITAL ROXA",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ORBITAL ROXA",
  },
  icons: {
    icon: [
      { url: "/app-icon/192", sizes: "192x192", type: "image/png" },
      { url: "/app-icon/512", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/app-icon/192", sizes: "192x192", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${orbitron.variable} ${jetbrains.variable} ${inter.variable} ${rajdhani.variable} ${anton.variable} ${russoOne.variable} ${chakraPetch.variable} antialiased`}
      >
        <AuthProvider>
          <LayoutShell>
            {children}
          </LayoutShell>
          <Analytics />
          <SpeedInsights />
        </AuthProvider>
      </body>
    </html>
  );
}
