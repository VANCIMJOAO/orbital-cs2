import { Metadata } from "next";
import { getTeams, getMapStats, parseMapStats, Team, MapStats } from "@/lib/api";
import { getTournamentsFromDB, dbPool } from "@/lib/tournaments-db";
import { Tournament } from "@/lib/tournament";
import { TeamsMap, MapScoresMap } from "@/components/bracket";
import { CampeonatoContent } from "./campeonato-content";

export const revalidate = 15;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const tournaments = await getTournamentsFromDB();
    const t = tournaments.find(t => t.id === id);
    if (t) {
      return {
        title: `${t.name} | ORBITAL ROXA`,
        description: `Campeonato ${t.format === "swiss" ? "Sistema Suíço" : "Eliminação Dupla"} — ${t.teams.length} times`,
      };
    }
  } catch { /* fallback */ }
  return { title: "Campeonato | ORBITAL ROXA" };
}

export default async function CampeonatoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch data server-side
  let initialTournament: Tournament | null = null;
  let initialTeamsMap: TeamsMap = {};
  let initialMapScores: MapScoresMap = {};
  type Inscrito = {
    team_name: string; team_tag: string; logo_url: string | null; status: string;
    captain_name: string; captain_steam_id: string;
    players: { name: string; steam_id: string }[];
  };
  let inscritos: Inscrito[] = [];

  // Inscritos do campeonato (pra mostrar os times participantes + a line no flip
  // enquanto o bracket não foi montado — pending sem teams)
  try {
    const [rows] = await dbPool.query(
      "SELECT team_name, team_tag, logo_url, status, captain_name, captain_steam_id, players FROM inscricoes WHERE tournament_id = ? AND status != 'rejeitado' ORDER BY created_at ASC",
      [id]
    );
    inscritos = (rows as Record<string, unknown>[]).map(r => ({
      team_name: String(r.team_name),
      team_tag: String(r.team_tag ?? ""),
      logo_url: (r.logo_url as string | null) ?? null,
      status: String(r.status),
      captain_name: String(r.captain_name ?? ""),
      captain_steam_id: String(r.captain_steam_id ?? ""),
      players: typeof r.players === "string" ? JSON.parse(r.players) : ((r.players as { name: string; steam_id: string }[]) ?? []),
    }));
  } catch { /* tabela pode não existir */ }

  try {
    const [tournaments, teamsRes] = await Promise.all([
      getTournamentsFromDB(),
      getTeams().catch(() => ({ teams: [] as Team[] })),
    ]);

    initialTournament = tournaments.find(t => t.id === id) || null;

    // Build teams map
    const teams = teamsRes.teams || [];
    for (const t of teams) {
      initialTeamsMap[t.id] = { name: t.name, logo: t.logo };
    }

    // Fetch map scores for finished bracket matches
    if (initialTournament) {
      const finishedMatchIds = initialTournament.matches
        .filter(m => m.match_id && m.status === "finished")
        .map(m => m.match_id!)
        .slice(0, 20);

      if (finishedMatchIds.length > 0) {
        const results = await Promise.all(
          finishedMatchIds.map(mid =>
            getMapStats(mid)
              .then(r => {
                const maps = Array.isArray(r) ? r as MapStats[] : parseMapStats(r as Record<string, unknown>) as MapStats[];
                return { id: mid, maps };
              })
              .catch(() => ({ id: mid, maps: [] as MapStats[] }))
          )
        );
        for (const { id: matchId, maps } of results) {
          if (maps.length > 0) {
            initialMapScores[matchId] = maps.map(ms => ({
              team1_score: ms.team1_score,
              team2_score: ms.team2_score,
              map_name: ms.map_name,
            }));
          }
        }
      }
    }
  } catch (err) {
    console.error("[CAMPEONATO SSR]", err);
  }

  return (
    <CampeonatoContent
      id={id}
      initialTournament={initialTournament}
      initialTeamsMap={initialTeamsMap}
      initialMapScores={initialMapScores}
      inscritos={inscritos}
    />
  );
}
