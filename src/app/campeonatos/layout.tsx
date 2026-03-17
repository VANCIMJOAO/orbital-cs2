import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campeonatos | ORBITAL ROXA",
  description: "Campeonatos de CS2 da ORBITAL ROXA. Acompanhe torneios, chaves e resultados.",
};

export default function CampeonatosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
