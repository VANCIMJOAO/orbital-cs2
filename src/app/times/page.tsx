import { Metadata } from "next";
import { getTeams, Team } from "@/lib/api";
import { TimesContent } from "./times-content";

export const metadata: Metadata = {
  title: "Times | ORBITAL ROXA",
  description: "Todos os times de CS2 cadastrados na ORBITAL ROXA. Veja rosters, logos e estatísticas.",
};

export const revalidate = 60;

export default async function TimesPage() {
  let teams: Team[] = [];

  try {
    const res = await getTeams();
    teams = res.teams || [];
  } catch {
    // API offline
  }

  return <TimesContent teams={teams} />;
}
