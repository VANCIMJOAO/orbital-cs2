import { Metadata } from "next";
import { HighlightsContent } from "./highlights-content";

export const metadata: Metadata = {
  title: "Highlights | ORBITAL ROXA",
  description: "Melhores momentos e highlights das partidas de CS2 da ORBITAL ROXA.",
};

export const revalidate = 30;

export default function HighlightsPage() {
  return <HighlightsContent />;
}
