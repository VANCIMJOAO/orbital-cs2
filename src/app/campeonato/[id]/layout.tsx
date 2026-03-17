import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Campeonato | ORBITAL ROXA",
  description: "Detalhes do campeonato de CS2 na ORBITAL ROXA. Chaves, partidas e classificação.",
};

export default function CampeonatoDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
