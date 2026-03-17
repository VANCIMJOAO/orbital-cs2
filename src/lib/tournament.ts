// Tournament bracket logic for double elimination

export interface TournamentTeam {
  id: number;
  name: string;
  tag: string;
  seed: number;
}

export interface BracketMatch {
  id: string;              // e.g. "WQF-1", "LR1-A", "GF"
  round: number;           // round within bracket section
  position: number;        // position in round (0-based)
  bracket: "winner" | "lower" | "grand_final";
  label: string;           // display label e.g. "Winner QF 1"
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

export interface Tournament {
  id: string;
  name: string;
  season_id: number | null;
  server_id: number | null;
  format: "double_elimination";
  mode: "presencial" | "online";
  faceit_championship_id?: string | null;
  teams: TournamentTeam[];
  matches: BracketMatch[];
  map_pool: string[];
  players_per_team: number;
  created_at: string;
  status: "pending" | "active" | "finished";
  current_match_id: string | null;
  // Event details (optional, for homepage display)
  start_date?: string | null;
  end_date?: string | null;
  location?: string | null;
  prize_pool?: string | null;
  description?: string | null;
  spectator_auth?: string | null; // SteamID64;Label for spectator (e.g. "76561198806637089;ORBITAL ROXA")
}

const CS2_MAPS = [
  "de_ancient", "de_anubis", "de_dust2", "de_inferno",
  "de_mirage", "de_nuke", "de_overpass",
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
  teams: TournamentTeam[]
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
  // Priority: winner bracket first, then lower, then grand final
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
