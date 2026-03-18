// ═══ FACEIT Data API v4 Client ═══

const FACEIT_API_KEY = process.env.FACEIT_API_KEY || "";
const FACEIT_BASE = "https://open.faceit.com/data/v4";

// ── Types ──

export interface FaceitMatch {
  match_id: string;
  game: string;
  region: string;
  competition_id: string;
  competition_name: string;
  competition_type: string; // "championship" | "hub" | "tournament"
  organizer_id: string;
  status: string; // "SUBSTITUTION" | "CAPTAIN_PICK" | "VOTING" | "CONFIGURING" | "READY" | "ONGOING" | "FINISHED" | "CANCELLED"
  started_at: number;
  finished_at: number;
  results?: {
    winner: string; // "faction1" | "faction2"
    score: { faction1: number; faction2: number };
  };
  faceit_url: string;
  teams: {
    faction1: FaceitTeam;
    faction2: FaceitTeam;
  };
  voting?: {
    map: { pick: string[] };
  };
  demo_url?: string[];
  best_of: number;
  configured_at: number;
}

export interface FaceitTeam {
  faction_id: string;
  leader: string;
  avatar: string;
  roster: FaceitPlayer[];
  name: string;
  type: string;
}

export interface FaceitPlayer {
  player_id: string;
  nickname: string;
  avatar: string;
  game_player_id: string; // Steam ID (Steam64)
  game_player_name: string;
  game_skill_level: number;
  membership: string;
  anticheat_required: boolean;
}

export interface FaceitMatchStats {
  rounds: FaceitRoundStats[];
}

export interface FaceitRoundStats {
  best_of: string;
  competition_id: string;
  game_id: string;
  game_mode: string;
  match_id: string;
  match_round: string;
  played: string;
  round_stats: {
    Map: string;
    Rounds: string;
    Score: string; // "16 / 13"
    Winner: string; // faction_id
  };
  teams: FaceitTeamStats[];
}

export interface FaceitTeamStats {
  team_id: string;
  premade: boolean;
  team_stats: {
    Team: string;
    "Team Win": string;
    "Team Headshots": string;
    "Final Score": string;
    "First Half Score": string;
    "Second Half Score": string;
    "Overtime score": string;
  };
  players: FaceitPlayerStats[];
}

export interface FaceitPlayerStats {
  player_id: string;
  nickname: string;
  player_stats: {
    // Core
    Kills: string;
    Deaths: string;
    Assists: string;
    Headshots: string;
    "Headshots %": string;
    MVPs: string;
    "K/D Ratio": string;
    "K/R Ratio": string;
    Result: string; // "1" or "0"
    // Multi-kills
    "Double Kills": string;
    "Triple Kills": string;
    "Quadro Kills": string;
    "Penta Kills": string;
    // Damage
    Damage: string;
    ADR: string;
    // Entry
    "First Kills": string;
    "Entry Count": string;
    "Entry Wins": string;
    "Match Entry Rate": string;
    "Match Entry Success Rate": string;
    // Clutch
    "Clutch Kills": string;
    "1v1Count": string;
    "1v1Wins": string;
    "Match 1v1 Win Rate": string;
    "1v2Count": string;
    "1v2Wins": string;
    "Match 1v2 Win Rate": string;
    // Utility
    "Flash Count": string;
    "Flash Successes": string;
    "Flash Success Rate per Match": string;
    "Enemies Flashed": string;
    "Enemies Flashed per Round in a Match": string;
    "Flashes per Round in a Match": string;
    "Utility Count": string;
    "Utility Successes": string;
    "Utility Success Rate per Match": string;
    "Utility Damage": string;
    "Utility Damage per Round in a Match": string;
    "Utility Damage Success Rate per Match": string;
    "Utility Enemies": string;
    "Utility Usage per Round": string;
    // Weapon
    "Sniper Kills": string;
    "Sniper Kill Rate per Match": string;
    "Sniper Kill Rate per Round": string;
    "Pistol Kills": string;
    "Knife Kills": string;
    "Zeus Kills": string;
    // Outros campos possíveis
    [key: string]: string;
  };
}

export interface FaceitPlayerProfile {
  player_id: string;
  nickname: string;
  avatar: string;
  country: string;
  cover_image: string;
  games: Record<string, {
    region: string;
    game_player_id: string; // Steam64
    skill_level: number;
    faceit_elo: number;
    game_player_name: string;
    game_profile_id: string;
  }>;
  steam_id_64: string;
  faceit_url: string;
}

export interface FaceitChampionship {
  championship_id: string;
  name: string;
  description: string;
  game_id: string;
  region: string;
  status: string;
  type: string;
  organizer_id: string;
  slots: number;
  current_subscriptions: number;
  faceit_url: string;
}

// ── Webhook event types ──

export interface FaceitWebhookEvent {
  transaction_id: string;
  event: string; // "match_status_ready" | "match_status_finished" | "match_status_cancelled" | "match_object_created" | "match_demo_ready"
  event_id: string;
  third_party_id: string;
  app_id: string;
  timestamp: string;
  retry_count: number;
  version: number;
  payload: {
    id: string; // match_id
    organizer_id: string;
    region: string;
    game: string;
    version: number;
    entity: {
      id: string;
      name: string;
      type: string; // "championship" | "hub"
    };
    teams: Array<{
      id: string;
      name: string;
      type: string;
      avatar: string;
      leader_id: string;
      co_leader_id: string;
      roster: Array<{
        id: string;
        nickname: string;
        avatar: string;
        game_id: string;
        game_name: string;
        game_skill_level: number;
        membership: string;
        anticheat_required: boolean;
      }>;
    }>;
    // match_status_finished extras
    demo_url?: string[];
    started_at?: string;
    finished_at?: string;
  };
}

// ── API Client ──

async function faceitFetch<T>(endpoint: string): Promise<T> {
  if (!FACEIT_API_KEY) {
    throw new Error("FACEIT_API_KEY not configured");
  }

  const res = await fetch(`${FACEIT_BASE}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${FACEIT_API_KEY}`,
      Accept: "application/json",
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Faceit API ${res.status}: ${text}`);
  }

  return res.json();
}

// ── Match endpoints ──

export async function getFaceitMatch(matchId: string): Promise<FaceitMatch> {
  return faceitFetch(`/matches/${matchId}`);
}

export async function getFaceitMatchStats(matchId: string): Promise<FaceitMatchStats> {
  return faceitFetch(`/matches/${matchId}/stats`);
}

// ── Player endpoints ──

export async function getFaceitPlayer(playerId: string): Promise<FaceitPlayerProfile> {
  return faceitFetch(`/players/${playerId}`);
}

export async function getFaceitPlayerByNickname(nickname: string): Promise<FaceitPlayerProfile> {
  return faceitFetch(`/players?nickname=${encodeURIComponent(nickname)}`);
}

export async function getFaceitPlayerStats(playerId: string, gameId = "cs2") {
  return faceitFetch(`/players/${playerId}/stats/${gameId}`);
}

export async function getFaceitPlayerHistory(
  playerId: string,
  gameId = "cs2",
  offset = 0,
  limit = 20
) {
  return faceitFetch(
    `/players/${playerId}/history?game=${gameId}&offset=${offset}&limit=${limit}`
  );
}

// ── Championship/Tournament endpoints ──

// Internal Faceit API (acessível sem key, funciona pra championships não-publicados)
const FACEIT_INTERNAL = "https://api.faceit.com";

async function faceitInternalFetch<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${FACEIT_INTERNAL}${endpoint}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Faceit Internal API ${res.status}: ${text}`);
  }
  return res.json();
}

export async function getFaceitChampionship(championshipId: string): Promise<FaceitChampionship> {
  try {
    // Tenta Data API primeiro
    return await faceitFetch(`/championships/${championshipId}`);
  } catch {
    // Fallback: API interna (funciona pra championships não-publicados/free organizers)
    const internal = await faceitInternalFetch<{ payload: Record<string, unknown> }>(
      `/championships/v1/championship/${championshipId}`
    );
    const p = internal.payload;
    return {
      championship_id: p.id as string,
      name: p.name as string,
      description: (p.description as string) || "",
      game_id: p.game as string,
      region: p.region as string,
      status: p.status as string,
      type: p.type as string,
      organizer_id: p.organizerId as string,
      slots: (p.slots as number) || 16,
      current_subscriptions: (p.currentSubscriptions as number) || 0,
      faceit_url: `https://www.faceit.com/pt-br/championship/${championshipId}`,
    };
  }
}

export async function getFaceitChampionshipMatches(
  championshipId: string,
  type = "all",
  offset = 0,
  limit = 20
) {
  return faceitFetch(
    `/championships/${championshipId}/matches?type=${type}&offset=${offset}&limit=${limit}`
  );
}

export async function getFaceitTournamentBrackets(tournamentId: string) {
  return faceitFetch(`/tournaments/${tournamentId}/brackets`);
}

export async function getFaceitTournamentMatches(
  tournamentId: string,
  offset = 0,
  limit = 20
) {
  return faceitFetch(
    `/tournaments/${tournamentId}/matches?offset=${offset}&limit=${limit}`
  );
}

// ── Hub endpoints ──

export async function getFaceitHub(hubId: string) {
  return faceitFetch(`/hubs/${hubId}`);
}

export async function getFaceitHubMatches(
  hubId: string,
  type = "all",
  offset = 0,
  limit = 20
) {
  return faceitFetch(
    `/hubs/${hubId}/matches?type=${type}&offset=${offset}&limit=${limit}`
  );
}

// ── Search ──

export async function searchFaceitPlayers(nickname: string, gameId = "cs2", limit = 10) {
  return faceitFetch(
    `/search/players?nickname=${encodeURIComponent(nickname)}&game=${gameId}&limit=${limit}`
  );
}

// ── Leaderboard ──

export async function getFaceitChampionshipLeaderboard(championshipId: string, offset = 0, limit = 20) {
  return faceitFetch(
    `/leaderboards/championships/${championshipId}?offset=${offset}&limit=${limit}`
  );
}
