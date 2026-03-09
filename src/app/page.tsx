import { getMatches, getTeams, Match, getStatusType } from "@/lib/api";
import { HomeContent } from "./home-content";

export const revalidate = 30;

export default async function HomePage() {
  let matches: Match[] = [];
  let teamCount = 0;

  try {
    const [matchesRes, teamsRes] = await Promise.all([
      getMatches(),
      getTeams(),
    ]);
    matches = matchesRes.matches || [];
    teamCount = teamsRes.teams?.length || 0;
  } catch {
    // API pode estar offline
  }

  const liveMatches = matches.filter((m) => getStatusType(m) === "live");
  const recentMatches = matches
    .filter((m) => getStatusType(m) === "finished")
    .slice(0, 5);
  const upcomingMatches = matches
    .filter((m) => getStatusType(m) === "upcoming")
    .slice(0, 3);

  return (
    <HomeContent
      liveMatches={liveMatches}
      recentMatches={recentMatches}
      upcomingMatches={upcomingMatches}
      totalMatches={matches.length}
      teamCount={teamCount}
    />
  );
}
