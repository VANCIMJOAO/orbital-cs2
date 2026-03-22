// Tournament bracket logic for double elimination + swiss

export interface TournamentTeam {
  id: number;
  name: string;
  tag: string;
  seed: number;
}

export interface BracketMatch {
  id: string;              // e.g. "WQF-1", "LR1-A", "GF", "SW-R1-1"
  round: number;           // round within bracket section
  position: number;        // position in round (0-based)
  bracket: "winner" | "lower" | "grand_final" | "swiss";
  label: string;           // display label e.g. "Winner QF 1", "Swiss R1 #1"
  team1_id: number | null; // null = TBD (comes from previous match)
  team2_id: number | null;
  team1_from: string | null; // match id where team1 comes from (winner)
  team2_from: string | null;
  winner_id: number | null;
  match_id: number | null; // G5API match id once created
  faceit_match_id?: string | null; // Faceit match id (online mode)
  map: string | null;      // map chosen after veto
  maps: string[] | null;   // for BO3 grand final
  status: "pending" | "veto" | "ready" | "live" | "finished";
  num_maps: number;        // 1 for BO1, 3 for BO3
  veto_actions: VetoAction[];
}

export interface VetoAction {
  team_id: number;
  team_name: string;
  action: "ban" | "pick";
  map: string;
}

// Swiss-specific: track W/L record per team
export interface SwissRecord {
  team_id: number;
  wins: number;
  losses: number;
  buchholz: number; // tiebreaker: sum of opponents' wins
  opponents: number[]; // team_ids already faced
}

export interface Tournament {
  id: string;
  name: string;
  season_id: number | null;
  server_id: number | null;
  format: "double_elimination" | "swiss";
  mode: "presencial" | "online";
  faceit_championship_id?: string | null;
  teams: TournamentTeam[];
  matches: BracketMatch[];
  map_pool: string[];
  players_per_team: number;
  created_at: string;
  status: "pending" | "active" | "finished";
  current_match_id: string | null;
  // Swiss-specific
  swiss_records?: SwissRecord[];
  swiss_round?: number; // current round (1-5)
  swiss_advance_wins?: number; // wins needed to advance (default 3)
  swiss_eliminate_losses?: number; // losses to be eliminated (default 3)
  // Event details (optional, for homepage display)
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  prize_pool?: string | null;
  description?: string | null;
  spectator_auth?: string | null;
}

// CS2 active duty pool (must match api.ts CS2_FULL_POOL)
const CS2_MAPS = [
  "de_ancient", "de_anubis", "de_dust2", "de_inferno",
  "de_mirage", "de_nuke", "de_vertigo",
];

export function getDefaultMapPool(): string[] {
  return [...CS2_MAPS];
}

// Generate random bracket pairing (shuffle and pair sequentially)
function randomPairing(numTeams: number): [number, number][] {
  const indices = Array.from({ length: numTeams }, (_, i) => i);
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const pairs: [number, number][] = [];
  for (let i = 0; i < numTeams; i += 2) {
    pairs.push([indices[i], indices[i + 1]]);
  }
  return pairs;
}

export function generateDoubleEliminationBracket(teams: TournamentTeam[]): BracketMatch[] {
  if (teams.length !== 8) {
    throw new Error("Eliminação dupla requer exatamente 8 times");
  }

  const matches: BracketMatch[] = [];
  const pairs = randomPairing(8);

  // === WINNER BRACKET ===

  // Winner Quarterfinals (4 matches)
  pairs.forEach(([seedA, seedB], i) => {
    matches.push({
      id: `WQF-${i + 1}`,
      round: 1,
      position: i,
      bracket: "winner",
      label: `Winner QF ${i + 1}`,
      team1_id: teams[seedA].id,
      team2_id: teams[seedB].id,
      team1_from: null,
      team2_from: null,
      winner_id: null,
      match_id: null,
      map: null,
      maps: null,
      status: "pending",
      num_maps: 1,
      veto_actions: [],
    });
  });

  // Winner Semifinals (2 matches)
  matches.push({
    id: "WSF-1",
    round: 2,
    position: 0,
    bracket: "winner",
    label: "Winner SF 1",
    team1_id: null,
    team2_id: null,
    team1_from: "WQF-1",
    team2_from: "WQF-2",
    winner_id: null,
    match_id: null,
    map: null,
    maps: null,
    status: "pending",
    num_maps: 1,
    veto_actions: [],
  });

  matches.push({
    id: "WSF-2",
    round: 2,
    position: 1,
    bracket: "winner",
    label: "Winner SF 2",
    team1_id: null,
    team2_id: null,
    team1_from: "WQF-3",
    team2_from: "WQF-4",
    winner_id: null,
    match_id: null,
    map: null,
    maps: null,
    status: "pending",
    num_maps: 1,
    veto_actions: [],
  });

  // Winner Final (1 match)
  matches.push({
    id: "WF",
    round: 3,
    position: 0,
    bracket: "winner",
    label: "Winner Final",
    team1_id: null,
    team2_id: null,
    team1_from: "WSF-1",
    team2_from: "WSF-2",
    winner_id: null,
    match_id: null,
    map: null,
    maps: null,
    status: "pending",
    num_maps: 1,
    veto_actions: [],
  });

  // === LOWER BRACKET ===

  // Lower Round 1 (2 matches) - Losers of WQF
  matches.push({
    id: "LR1-A",
    round: 1,
    position: 0,
    bracket: "lower",
    label: "Lower R1 A",
    team1_id: null,
    team2_id: null,
    team1_from: "WQF-1:loser",
    team2_from: "WQF-2:loser",
    winner_id: null,
    match_id: null,
    map: null,
    maps: null,
    status: "pending",
    num_maps: 1,
    veto_actions: [],
  });

  matches.push({
    id: "LR1-B",
    round: 1,
    position: 1,
    bracket: "lower",
    label: "Lower R1 B",
    team1_id: null,
    team2_id: null,
    team1_from: "WQF-3:loser",
    team2_from: "WQF-4:loser",
    winner_id: null,
    match_id: null,
    map: null,
    maps: null,
    status: "pending",
    num_maps: 1,
    veto_actions: [],
  });

  // Lower Round 2 (2 matches) - Winners of LR1 vs Losers of WSF
  matches.push({
    id: "LR2-A",
    round: 2,
    position: 0,
    bracket: "lower",
    label: "Lower R2 A",
    team1_id: null,
    team2_id: null,
    team1_from: "LR1-A",
    team2_from: "WSF-1:loser",
    winner_id: null,
    match_id: null,
    map: null,
    maps: null,
    status: "pending",
    num_maps: 1,
    veto_actions: [],
  });

  matches.push({
    id: "LR2-B",
    round: 2,
    position: 1,
    bracket: "lower",
    label: "Lower R2 B",
    team1_id: null,
    team2_id: null,
    team1_from: "LR1-B",
    team2_from: "WSF-2:loser",
    winner_id: null,
    match_id: null,
    map: null,
    maps: null,
    status: "pending",
    num_maps: 1,
    veto_actions: [],
  });

  // Lower Round 3 (1 match) - Lower Semifinal
  matches.push({
    id: "LR3",
    round: 3,
    position: 0,
    bracket: "lower",
    label: "Lower SF",
    team1_id: null,
    team2_id: null,
    team1_from: "LR2-A",
    team2_from: "LR2-B",
    winner_id: null,
    match_id: null,
    map: null,
    maps: null,
    status: "pending",
    num_maps: 1,
    veto_actions: [],
  });

  // Lower Final (1 match) - Lower bracket winner vs WF loser
  matches.push({
    id: "LF",
    round: 4,
    position: 0,
    bracket: "lower",
    label: "Lower Final",
    team1_id: null,
    team2_id: null,
    team1_from: "LR3",
    team2_from: "WF:loser",
    winner_id: null,
    match_id: null,
    map: null,
    maps: null,
    status: "pending",
    num_maps: 1,
    veto_actions: [],
  });

  // === GRAND FINAL ===
  matches.push({
    id: "GF",
    round: 1,
    position: 0,
    bracket: "grand_final",
    label: "GRAND FINAL",
    team1_id: null,
    team2_id: null,
    team1_from: "WF",
    team2_from: "LF",
    winner_id: null,
    match_id: null,
    map: null,
    maps: null,
    status: "pending",
    num_maps: 3, // BO3
    veto_actions: [],
  });

  return matches;
}

// Get the team that should advance from a completed match
function getTeamFromMatch(
  matches: BracketMatch[],
  fromRef: string,
  _teams: TournamentTeam[]
): number | null {
  const isLoser = fromRef.endsWith(":loser");
  const matchId = isLoser ? fromRef.replace(":loser", "") : fromRef;
  const match = matches.find(m => m.id === matchId);
  if (!match || !match.winner_id) return null;

  if (isLoser) {
    // Return the loser
    if (match.winner_id === match.team1_id) return match.team2_id;
    if (match.winner_id === match.team2_id) return match.team1_id;
    return null;
  }

  return match.winner_id;
}

// After a match finishes, propagate the winner/loser to subsequent matches
export function advanceBracket(tournament: Tournament, finishedMatchId: string, winnerId: number): Tournament {
  // Delegate to Swiss if format is swiss
  if (tournament.format === "swiss") {
    return advanceSwiss(tournament, finishedMatchId, winnerId);
  }
  const updated = { ...tournament, matches: tournament.matches.map(m => ({ ...m })) };
  const finishedMatch = updated.matches.find(m => m.id === finishedMatchId);
  if (!finishedMatch) return updated;

  finishedMatch.winner_id = winnerId;
  finishedMatch.status = "finished";

  // Propagate to all matches that depend on this one
  for (const match of updated.matches) {
    if (match.status !== "pending") continue;

    let changed = false;

    if (match.team1_from) {
      const teamId = getTeamFromMatch(updated.matches, match.team1_from, updated.teams);
      if (teamId && match.team1_id !== teamId) {
        match.team1_id = teamId;
        changed = true;
      }
    }

    if (match.team2_from) {
      const teamId = getTeamFromMatch(updated.matches, match.team2_from, updated.teams);
      if (teamId && match.team2_id !== teamId) {
        match.team2_id = teamId;
        changed = true;
      }
    }

    if (changed) {
      // Match stays pending until both teams are set
    }
  }

  // Check if tournament is finished (grand final has a winner)
  const gf = updated.matches.find(m => m.id === "GF");
  if (gf && gf.winner_id) {
    updated.status = "finished";
  }

  return updated;
}

// Get the next match that can be played (both teams set, status pending)
export function getNextPlayableMatch(tournament: Tournament): BracketMatch | null {
  if (tournament.format === "swiss") {
    // Swiss: find first pending match in current round
    const currentRound = tournament.swiss_round || 1;
    return tournament.matches.find(
      m => m.bracket === "swiss" && m.round === currentRound && m.status === "pending" && m.team1_id && m.team2_id
    ) || null;
  }

  // Double elimination: priority winner → lower → grand final
  const order: BracketMatch["bracket"][] = ["winner", "lower", "grand_final"];

  for (const bracket of order) {
    const match = tournament.matches.find(
      m => m.bracket === bracket && m.status === "pending" && m.team1_id && m.team2_id
    );
    if (match) return match;
  }
  return null;
}

// Get team name by id
export function getTeamName(tournament: Tournament, teamId: number | null): string {
  if (!teamId) return "TBD";
  const team = tournament.teams.find(t => t.id === teamId);
  return team?.name || `Time ${teamId}`;
}

// BO1 veto sequence: ban-ban-ban-ban-ban-ban (6 bans, 1 map left)
// BO3 veto sequence: ban-ban-pick-pick-ban-ban (2 bans, 2 picks, 2 bans, 1 decider)
export function getVetoSequence(numMaps: number): ("ban" | "pick")[] {
  if (numMaps === 1) {
    return ["ban", "ban", "ban", "ban", "ban", "ban"]; // 6 bans, 7th map is played
  }
  // BO3
  return ["ban", "ban", "pick", "pick", "ban", "ban"]; // 6 actions, 7th map is decider
}

export function getVetoTeamOrder(numMaps: number, team1First: boolean): number[] {
  // Which team acts at each step (0 = team1, 1 = team2)
  const first = team1First ? 0 : 1;
  const second = team1First ? 1 : 0;

  if (numMaps === 1) {
    return [first, second, first, second, first, second];
  }
  // BO3: ban, ban, pick, pick, ban, ban
  return [first, second, first, second, first, second];
}

// ═══════════════════════════════════════════════════════════
// SWISS SYSTEM
// ═══════════════════════════════════════════════════════════
// Format: 16 teams, 5 rounds max
// 3 wins = advanced, 3 losses = eliminated
// Each round: teams with same W-L record face each other
// Round 1: 0-0 (8 matches)
// Round 2: 1-0 vs 1-0 (4 matches), 0-1 vs 0-1 (4 matches)
// Round 3: 2-0 vs 2-0, 1-1 vs 1-1, 0-2 vs 0-2
// ...and so on until all teams have 3W or 3L

export function generateSwissInitialRound(teams: TournamentTeam[]): {
  matches: BracketMatch[];
  records: SwissRecord[];
} {
  if (teams.length < 8 || teams.length > 16 || teams.length % 2 !== 0) {
    throw new Error(`Swiss requer número par de times (8-16). Recebido: ${teams.length}`);
  }

  const records: SwissRecord[] = teams.map((t) => ({
    team_id: t.id,
    wins: 0,
    losses: 0,
    buchholz: 0,
    opponents: [],
  }));

  // Round 1: random pairing
  const pairs = randomPairing(teams.length);
  const matches: BracketMatch[] = pairs.map(([a, b], i) => ({
    id: `SW-R1-${i + 1}`,
    round: 1,
    position: i,
    bracket: "swiss" as const,
    label: `Swiss R1 #${i + 1}`,
    team1_id: teams[a].id,
    team2_id: teams[b].id,
    team1_from: null,
    team2_from: null,
    winner_id: null,
    match_id: null,
    faceit_match_id: null,
    map: null,
    maps: null,
    status: "pending" as const,
    num_maps: 1,
    veto_actions: [],
  }));

  return { matches, records };
}

// After all matches in a round finish, generate next round pairings
export function generateSwissNextRound(tournament: Tournament): Tournament {
  const updated = {
    ...tournament,
    matches: [...tournament.matches],
    swiss_records: tournament.swiss_records?.map((r) => ({ ...r, opponents: [...r.opponents] })) || [],
  };

  const currentRound = updated.swiss_round || 1;
  const advanceWins = updated.swiss_advance_wins || 3;
  const eliminateLosses = updated.swiss_eliminate_losses || 3;

  // Update records from finished matches in current round
  const roundMatches = updated.matches.filter(
    (m) => m.bracket === "swiss" && m.round === currentRound && m.status === "finished"
  );

  for (const match of roundMatches) {
    if (!match.winner_id || !match.team1_id || !match.team2_id) continue;

    const loserId = match.winner_id === match.team1_id ? match.team2_id : match.team1_id;

    const winnerRec = updated.swiss_records!.find((r) => r.team_id === match.winner_id);
    const loserRec = updated.swiss_records!.find((r) => r.team_id === loserId);

    if (winnerRec && !winnerRec.opponents.includes(loserId)) {
      winnerRec.wins++;
      winnerRec.opponents.push(loserId);
    }
    if (loserRec && !loserRec.opponents.includes(match.winner_id)) {
      loserRec.losses++;
      loserRec.opponents.push(match.winner_id);
    }
  }

  // Check if all round matches are done
  const allRoundMatches = updated.matches.filter(
    (m) => m.bracket === "swiss" && m.round === currentRound
  );
  const allDone = allRoundMatches.every((m) => m.status === "finished");
  if (!allDone) return updated;

  // Update buchholz scores
  for (const rec of updated.swiss_records!) {
    rec.buchholz = rec.opponents.reduce((sum, oppId) => {
      const opp = updated.swiss_records!.find((r) => r.team_id === oppId);
      return sum + (opp?.wins || 0);
    }, 0);
  }

  // Check if tournament is finished
  const active = updated.swiss_records!.filter(
    (r) => r.wins < advanceWins && r.losses < eliminateLosses
  );

  if (active.length === 0) {
    updated.status = "finished";
    updated.swiss_round = currentRound;
    return updated;
  }

  // Generate next round
  const nextRound = currentRound + 1;
  updated.swiss_round = nextRound;

  // Group active teams by W-L record
  const groups = new Map<string, SwissRecord[]>();
  for (const rec of active) {
    const key = `${rec.wins}-${rec.losses}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(rec);
  }

  // Sort groups by record (highest W first, then lowest L)
  const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
    const [aw, al] = a.split("-").map(Number);
    const [bw, bl] = b.split("-").map(Number);
    if (aw !== bw) return bw - aw;
    return al - bl;
  });

  let matchIdx = 0;
  const newMatches: BracketMatch[] = [];

  for (const key of sortedKeys) {
    const group = groups.get(key)!;
    // Sort by buchholz (tiebreaker), then by seed
    group.sort((a, b) => {
      if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
      const seedA = updated.teams.find((t) => t.id === a.team_id)?.seed || 99;
      const seedB = updated.teams.find((t) => t.id === b.team_id)?.seed || 99;
      return seedA - seedB;
    });

    // Pair teams avoiding rematches
    const paired = new Set<number>();
    for (let i = 0; i < group.length; i++) {
      if (paired.has(group[i].team_id)) continue;

      let opponent: SwissRecord | null = null;
      for (let j = i + 1; j < group.length; j++) {
        if (paired.has(group[j].team_id)) continue;
        if (!group[i].opponents.includes(group[j].team_id)) {
          opponent = group[j];
          break;
        }
      }

      // Fallback: if no non-rematch available, pick next unpaired
      if (!opponent) {
        for (let j = i + 1; j < group.length; j++) {
          if (!paired.has(group[j].team_id)) {
            opponent = group[j];
            break;
          }
        }
      }

      if (opponent) {
        paired.add(group[i].team_id);
        paired.add(opponent.team_id);
        matchIdx++;

        // Elimination match (2-2 or equivalent) = BO3, otherwise BO1
        const isEliminationOrAdvance =
          (group[i].wins === advanceWins - 1 && opponent.wins === advanceWins - 1) ||
          (group[i].losses === eliminateLosses - 1 && opponent.losses === eliminateLosses - 1);

        newMatches.push({
          id: `SW-R${nextRound}-${matchIdx}`,
          round: nextRound,
          position: matchIdx - 1,
          bracket: "swiss",
          label: `Swiss R${nextRound} #${matchIdx} (${key})`,
          team1_id: group[i].team_id,
          team2_id: opponent.team_id,
          team1_from: null,
          team2_from: null,
          winner_id: null,
          match_id: null,
          faceit_match_id: null,
          map: null,
          maps: null,
          status: "pending",
          num_maps: isEliminationOrAdvance ? 3 : 1,
          veto_actions: [],
        });
      }
    }
  }

  updated.matches = [...updated.matches, ...newMatches];

  return updated;
}

// Swiss advance bracket: update records and potentially generate next round
export function advanceSwiss(tournament: Tournament, finishedMatchId: string, winnerId: number): Tournament {
  const updated = {
    ...tournament,
    matches: tournament.matches.map((m) => ({ ...m })),
    swiss_records: tournament.swiss_records?.map((r) => ({ ...r, opponents: [...r.opponents] })),
  };

  const match = updated.matches.find((m) => m.id === finishedMatchId);
  if (!match) return updated;

  match.winner_id = winnerId;
  match.status = "finished";

  // Check if all matches in this round are done
  const currentRound = match.round;
  const roundMatches = updated.matches.filter(
    (m) => m.bracket === "swiss" && m.round === currentRound
  );
  const allDone = roundMatches.every((m) => m.status === "finished");

  if (allDone) {
    // Generate next round (handles record updates internally)
    return generateSwissNextRound(updated);
  }

  return updated;
}

// Get Swiss standings sorted
export function getSwissStandings(tournament: Tournament): (SwissRecord & { name: string; tag: string; status: "active" | "advanced" | "eliminated" })[] {
  if (!tournament.swiss_records) return [];

  const advanceWins = tournament.swiss_advance_wins || 3;
  const eliminateLosses = tournament.swiss_eliminate_losses || 3;

  return tournament.swiss_records
    .map((r) => {
      const team = tournament.teams.find((t) => t.id === r.team_id);
      const status: "active" | "advanced" | "eliminated" =
        r.wins >= advanceWins ? "advanced" : r.losses >= eliminateLosses ? "eliminated" : "active";
      return {
        ...r,
        name: team?.name || `Time ${r.team_id}`,
        tag: team?.tag || "",
        status,
      };
    })
    .sort((a, b) => {
      // Advanced first, then active, then eliminated
      const order = { advanced: 0, active: 1, eliminated: 2 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      // Then by wins desc, losses asc, buchholz desc
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (a.losses !== b.losses) return a.losses - b.losses;
      return b.buchholz - a.buchholz;
    });
}
