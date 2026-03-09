import { getMatches, Match } from "@/lib/api";
import { PartidasContent } from "./partidas-content";

export const revalidate = 30;

export default async function PartidasPage() {
  let matches: Match[] = [];

  try {
    const res = await getMatches();
    matches = res.matches || [];
  } catch {
    // API offline
  }

  return <PartidasContent matches={matches} />;
}
