// ═══ Faceit → G5API Sync ═══
// Insere dados de partidas Faceit no G5API para unificar stats, leaderboard e perfil

import type { MappedMatch, MappedPlayerStats, MappedMapStats } from "./faceit-mapper";
import { estimateRating } from "./faceit-mapper";
import { getTournamentsFromDB, saveTournamentToDB } from "./tournaments-db";
import { advanceBracket, type Tournament, type BracketMatch } from "./tournament";
import { linkFaceitToG5Match } from "./faceit-db";

const G5API_URL =
  process.env.NEXT_PUBLIC_G5API_URL ||
  "https://g5api-production-998f.up.railway.app";

// Cookie de admin do G5API pra escrita (precisa estar logado como admin)
// Alternativa: usar API key direta
async function g5apiFetch(
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: unknown
) {
  const res = await fetch(`${G5API_URL}${endpoint}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(Array.isArray(body) ? body : [body]) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`G5API ${method} ${endpoint}: ${res.status} ${text}`);
  }
  return res.json();
}

// ── Encontrar time G5API pelos Steam IDs dos jogadores ──

interface TeamMatch {
  g5_team_id: number;
  faction: "team1" | "team2";
}

export async function findG5TeamsFromSteamIds(
  match: MappedMatch
): Promise<{ team1_id: number | null; team2_id: number | null }> {
  try {
    const teamsRes = await fetch(`${G5API_URL}/teams`, {
      headers: { "Content-Type": "application/json" },
    });
    const { teams } = await teamsRes.json();

    if (!Array.isArray(teams)) return { team1_id: null, team2_id: null };

    // Build map: steamId → g5 team id
    const steamToTeam = new Map<string, number>();
    for (const team of teams) {
      if (team.auth_name && typeof team.auth_name === "object") {
        for (const steamId of Object.keys(team.auth_name)) {
          steamToTeam.set(steamId, team.id);
        }
      }
    }

    // Match Faceit rosters to G5 teams by counting steam ID overlaps
    function findBestTeam(players: { steam_id: string }[]): number | null {
      const counts = new Map<number, number>();
      for (const p of players) {
        const teamId = steamToTeam.get(p.steam_id);
        if (teamId) counts.set(teamId, (counts.get(teamId) || 0) + 1);
      }
      let best: number | null = null;
      let bestCount = 0;
      for (const [teamId, count] of counts) {
        if (count > bestCount) {
          best = teamId;
          bestCount = count;
        }
      }
      return bestCount >= 3 ? best : null; // Pelo menos 3 jogadores em comum
    }

    return {
      team1_id: findBestTeam(match.players.team1),
      team2_id: findBestTeam(match.players.team2),
    };
  } catch (err) {
    console.error("[FACEIT SYNC] Error finding teams:", err);
    return { team1_id: null, team2_id: null };
  }
}

// ── Sincronizar partida Faceit → G5API ──

export async function syncFaceitMatchToG5API(
  match: MappedMatch,
  seasonId?: number | null
): Promise<{ g5_match_id: number | null; error?: string }> {
  try {
    // 1. Encontrar times no G5API
    const { team1_id, team2_id } = await findG5TeamsFromSteamIds(match);

    if (!team1_id || !team2_id) {
      const missing = !team1_id && !team2_id ? "ambos" : !team1_id ? match.team1_name : match.team2_name;
      return {
        g5_match_id: null,
        error: `Times não encontrados no G5API (${missing}). Verifique se os Steam IDs dos jogadores estão cadastrados.`,
      };
    }

    // 2. Criar match no G5API
    const matchPayload = {
      team1_id,
      team2_id,
      server_id: 0, // Sem servidor (Faceit)
      num_maps: match.num_maps,
      max_maps: match.num_maps,
      skip_veto: true,
      veto_first: "team1",
      side_type: "standard",
      players_per_team: 5,
      min_player_ready: 0,
      ...(seasonId ? { season_id: seasonId } : {}),
      title: `Faceit: ${match.team1_name} vs ${match.team2_name}`,
      is_pug: false,
      veto_mappool: match.maps.map((m) => m.map_name).join(" ") || "de_mirage",
    };

    const createRes = await g5apiFetch("/matches", "POST", matchPayload);
    const g5MatchId: number = createRes.id || createRes.match?.id;

    if (!g5MatchId) {
      return { g5_match_id: null, error: "G5API não retornou ID do match" };
    }

    console.log(`[FACEIT SYNC] Match criado no G5API: #${g5MatchId}`);

    // 3. Inserir map_stats pra cada mapa
    for (const map of match.maps) {
      try {
        const mapPayload = {
          match_id: g5MatchId,
          map_number: map.map_number,
          map_name: map.map_name,
          start_time: match.start_time || new Date().toISOString(),
        };
        const mapRes = await g5apiFetch("/mapstats", "POST", mapPayload);
        const mapId = mapRes.id || mapRes.mapstat?.id;

        if (mapId) {
          // Update com scores e winner
          const winnerId = map.winner === "team1" ? team1_id : map.winner === "team2" ? team2_id : null;
          await g5apiFetch("/mapstats", "PUT", {
            id: mapId,
            match_id: g5MatchId,
            team1_score: map.team1_score,
            team2_score: map.team2_score,
            winner: winnerId,
            end_time: match.end_time || new Date().toISOString(),
          });

          // 4. Inserir player_stats pra cada jogador neste mapa
          for (const ps of map.player_stats) {
            const isTeam1 = match.players.team1.some((p) => p.faceit_id === ps.faceit_id);
            const teamId = isTeam1 ? team1_id : team2_id;
            const roundsPlayed = map.team1_score + map.team2_score;

            try {
              await g5apiFetch("/playerstats", "POST", {
                match_id: g5MatchId,
                map_id: mapId,
                team_id: teamId,
                steam_id: ps.steam_id,
                name: ps.nickname,
                kills: ps.kills,
                deaths: ps.deaths,
                assists: ps.assists,
                flash_assists: ps.flash_successes,
                headshot_kills: ps.headshot_kills,
                roundsplayed: roundsPlayed,
                damage: ps.damage,
                rating: estimateRating(ps, roundsPlayed),
                kdr: ps.kdr,
                fba: ps.flash_count,
                firstkill_t: Math.floor(ps.first_kills / 2),
                firstkill_ct: Math.ceil(ps.first_kills / 2),
                firstdeath_t: 0,
                firstdeath_ct: 0,
                // KAST = % de rounds com Kill/Assist/Survived/Traded — requer dados round-by-round
                // Faceit não fornece KAST nem dados por round, qualquer estimativa por aggregated stats
                // infla o valor (K+A+S soma > rounds). Enviar 0 = "não disponível"
                kast: 0,
                contribution_score: ps.mvps * 5 + ps.kills,
                mvp: ps.mvps,
                k1: Math.max(0, ps.kills - ps.double_kills * 2 - ps.triple_kills * 3 - ps.quadro_kills * 4 - ps.penta_kills * 5),
                k2: ps.double_kills,
                k3: ps.triple_kills,
                k4: ps.quadro_kills,
                k5: ps.penta_kills,
                util_damage: ps.utility_damage,
                enemies_flashed: ps.enemies_flashed,
              });
            } catch (err) {
              console.error(`[FACEIT SYNC] Error inserting player stats for ${ps.nickname}:`, err);
            }
          }
        }
      } catch (err) {
        console.error(`[FACEIT SYNC] Error inserting map stats for map ${map.map_number}:`, err);
      }
    }

    // 5. Finalizar match (PUT com end_time e winner)
    const winnerId = match.winner === "team1" ? team1_id : match.winner === "team2" ? team2_id : null;
    try {
      await g5apiFetch("/matches", "PUT", {
        match_id: g5MatchId,
        end_time: match.end_time || new Date().toISOString(),
        team1_score: match.team1_score,
        team2_score: match.team2_score,
        winner: winnerId,
      });
    } catch (err) {
      console.error("[FACEIT SYNC] Error finalizing match:", err);
    }

    // 6. Link faceit match → g5 match
    await linkFaceitToG5Match(match.faceit_match_id, g5MatchId);

    console.log(
      `[FACEIT SYNC] Completo: Faceit ${match.faceit_match_id} → G5API #${g5MatchId} (${match.team1_name} ${match.team1_score}-${match.team2_score} ${match.team2_name})`
    );

    return { g5_match_id: g5MatchId };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[FACEIT SYNC]", msg);
    return { g5_match_id: null, error: msg };
  }
}

// ── Auto-advance tournament bracket ──

export async function autoAdvanceTournamentBracket(
  faceitMatchId: string,
  g5MatchId: number,
  winnerId: number
): Promise<boolean> {
  try {
    const tournaments = await getTournamentsFromDB();

    for (const tournament of tournaments) {
      if (tournament.mode !== "online") continue;
      if (tournament.status === "finished") continue;

      // Encontrar o bracket match vinculado a este faceit match
      const bracketMatch = tournament.matches.find(
        (m) => m.faceit_match_id === faceitMatchId
      );

      if (!bracketMatch) continue;

      // Avançar o bracket
      const updated = advanceBracket(tournament, bracketMatch.id, winnerId);

      // Atualizar o match_id do G5API no bracket
      const updatedBM = updated.matches.find((m) => m.id === bracketMatch.id);
      if (updatedBM) {
        updatedBM.match_id = g5MatchId;
      }

      await saveTournamentToDB(updated);

      console.log(
        `[FACEIT SYNC] Bracket avançado: ${tournament.name} / ${bracketMatch.label} → winner: ${winnerId}`
      );

      return true;
    }

    return false;
  } catch (err) {
    console.error("[FACEIT SYNC] Error advancing bracket:", err);
    return false;
  }
}

// ── Encontrar campeonato ORBITAL ROXA por faceit_championship_id ──

export async function findTournamentByFaceitChampionship(
  faceitCompetitionId: string
): Promise<Tournament | null> {
  try {
    const tournaments = await getTournamentsFromDB();
    return (
      tournaments.find(
        (t) =>
          t.mode === "online" &&
          t.faceit_championship_id === faceitCompetitionId &&
          t.status !== "finished"
      ) || null
    );
  } catch {
    return null;
  }
}

// ── Vincular Faceit match a um bracket match (por times) ──

export async function linkFaceitMatchToBracket(
  tournament: Tournament,
  faceitMatchId: string,
  team1_id: number,
  team2_id: number
): Promise<BracketMatch | null> {
  // Encontrar bracket match pendente que tem esses dois times
  const bracketMatch = tournament.matches.find(
    (m) =>
      m.status === "pending" &&
      m.team1_id !== null &&
      m.team2_id !== null &&
      ((m.team1_id === team1_id && m.team2_id === team2_id) ||
        (m.team1_id === team2_id && m.team2_id === team1_id))
  );

  if (!bracketMatch) return null;

  // Vincular
  bracketMatch.faceit_match_id = faceitMatchId;
  bracketMatch.status = "live";
  await saveTournamentToDB(tournament);

  console.log(
    `[FACEIT SYNC] Vinculado: ${faceitMatchId} → ${tournament.name} / ${bracketMatch.label}`
  );

  return bracketMatch;
}
