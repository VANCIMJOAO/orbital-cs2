import { getTeams, Team } from "@/lib/api";
import { TimesContent } from "./times-content";

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
