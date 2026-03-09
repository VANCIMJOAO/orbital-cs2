import type { Metadata } from "next";
import { Orbitron, JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { AuthProvider } from "@/lib/auth-context";

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ORBITAL ROXA | CS2 Tournament",
  description: "Plataforma de gerenciamento de campeonatos CS2 - ORBITAL ROXA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${orbitron.variable} ${jetbrains.variable} ${inter.variable} antialiased scanlines grid-bg`}
      >
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen pt-20">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
