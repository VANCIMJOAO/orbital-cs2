import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Demos | ORBITAL ROXA",
  description: "Downloads de demos das partidas de CS2 da ORBITAL ROXA.",
};

export default function DemosLayout({ children }: { children: React.ReactNode }) {
  return children;
}
