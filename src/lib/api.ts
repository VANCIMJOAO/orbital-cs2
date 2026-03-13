// Server-side usa URL direta, client-side usa proxy /api para evitar CORS
const API_BASE_DIRECT =
  process.env.NEXT_PUBLIC_G5API_URL ||
  "https://g5api-production-998f.up.railway.app";
const API_BASE_PROXY = "/api";
// Proxy manual para operações de escrita (POST/PUT/DELETE)
// O rewrite do Next.js não repassa cookies corretamente em POSTs
const API_WRITE_PROXY = "/write-proxy";

function getApiBase() {
  if (typeof window === "undefined") return API_BASE_DIRECT;
  return API_BASE_PROXY;
}

export interface Match {
  id: number;
  user_id: number;
  server_id: number;
  team1_id: number;
  team2_id: number;
  winner: number | null;
  team1_score: number;
  team2_score: number;
  team1_string: string;
  team2_string: string;
  num_maps: number;
  max_maps: number;
  skip_veto: boolean;
  veto_first: string;
  side_type: string;
  players_per_team: number;
  min_player_ready: number;
  season_id: number | null;
  is_pug: boolean;
  start_time: string | null;
  end_time: string | null;
  max_rounds: number;
  title: string;
  cancelled: boolean;
  forfeit: boolean;
  status: number; // 0=pending, 1=live, 2=finished
}

export interface Team {
  id: number;
  user_id: number;
  name: string;
  tag: string;
  flag: string;
  logo: string | null;
  public_team: boolean;
  auth_name: Record<string, { name: string; captain: number; coach: number } | string>;
}

export interface PlayerStats {
  id: number;
  match_id: number;
  map_id: number;
  team_id: number;
  steam_id: string;
  name: string;
  kills: number;
  deaths: number;
  assists: number;
  flash_assists: number;
  headshot_kills: number;
  roundsplayed: number;
  damage: number;
  rating: number;
  kdr: number;
  fba: number;
  firstkill_t: number;
  firstkill_ct: number;
  firstdeath_t: number;
  firstdeath_ct: number;
  kast: number;
  contribution_score: number;
  mvp: number;
  k1: number;
  k2: number;
  k3: number;
  k4: number;
  k5: number;
  team_name?: string;
}

export interface MapStats {
  id: number;
  match_id: number;
  winner: number;
  map_number: number;
  map_name: string;
  team1_score: number;
  team2_score: number;
  start_time: string;
  end_time: string | null;
  demoFile: string | null;
}

export interface LeaderboardEntry {
  steamId: string;
  name: string;
  wins: number;
  total_maps: number;
  kills: number;
  deaths: number;
  assists: number;
  trp: number; // total rounds played
  hsk: number; // headshot kills
  hsp: number;
  total_damage: number;
  average_rating: number;
  fba: number;
  enemies_flashed: number;
  friendlies_flashed: number;
  util_damage: number;
}

export interface Season {
  id: number;
  user_id: number;
  name: string;
  start_date: string;
  end_date: string | null;
}

export interface User {
  id: number;
  steam_id: string;
  name: string;
  admin: boolean;
  super_admin: boolean;
  small_image: string;
  medium_image: string;
  large_image: string;
  api_key?: string;
}

export interface Server {
  id: number;
  user_id: number;
  ip_string: string;
  port: number;
  display_name: string;
  rcon_password: string;
  public_server: boolean;
  flag: string;
  gotv_port: number | null;
}

export interface PlayerProfile {
  steam_id: string;
  name: string;
  wins: number;
  total_maps: number;
  total_rounds: number;
  kills: number;
  deaths: number;
  assists: number;
  headshot_kills: number;
  flash_assists: number;
  damage: number;
  rating: number;
  kdr: number;
  hsp: number;
  average_rating: number;
  kast: number;
  contribution_score: number;
  mvp: number;
  firstkill_t: number;
  firstkill_ct: number;
  firstdeath_t: number;
  firstdeath_ct: number;
}

function getStatusText(match: Match): string {
  if (match.cancelled) return "Cancelada";
  if (match.forfeit) return "W.O.";
  if (match.end_time) return "Finalizada";
  if (match.start_time) return "AO VIVO";
  return "Pendente";
}

function getStatusType(match: Match): "live" | "finished" | "upcoming" | "cancelled" {
  if (match.cancelled || match.forfeit) return "cancelled";
  if (match.end_time) return "finished";
  if (match.start_time) return "live";
  return "upcoming";
}

export { getStatusText, getStatusType };

async function apiFetch<T>(endpoint: string, noCache = false): Promise<T> {
  const res = await fetch(`${getApiBase()}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...(noCache ? { cache: "no-store" as const } : { next: { revalidate: 15 } }),
  });
  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function getMatches(): Promise<{ matches: Match[] }> {
  return apiFetch("/matches", true);
}

export async function getMatch(id: number): Promise<{ match: Match }> {
  return apiFetch(`/matches/${id}`, true);
}

export async function getPlayerStats(matchId: number): Promise<{ playerStats: PlayerStats[] }> {
  return apiFetch(`/playerstats/match/${matchId}`, true);
}

export async function getMapStats(matchId: number): Promise<{ mapStats: MapStats[] }> {
  return apiFetch(`/mapstats/${matchId}`, true);
}

export async function getTeams(): Promise<{ teams: Team[] }> {
  return apiFetch("/teams");
}

export async function getTeam(id: number): Promise<{ team: Team }> {
  return apiFetch(`/teams/${id}`);
}

export async function getLeaderboard(seasonId?: number): Promise<{ leaderboard: LeaderboardEntry[] }> {
  const query = seasonId ? `?season_id=${seasonId}` : "";
  return apiFetch(`/leaderboard/players${query}`);
}

export async function getSeasons(): Promise<{ seasons: Season[] }> {
  return apiFetch("/seasons");
}

export interface VetoEntry {
  id: number;
  match_id: number;
  team_name: string;
  map: string;
  pick_or_ban: string; // "ban" or "pick"
}

export async function getVetoes(matchId: number): Promise<{ vetoes: VetoEntry[] }> {
  return apiFetch(`/vetoes/${matchId}`, true);
}

export interface KillEvent {
  id: number;
  player_steam_id: string;
  player_name: string;
  player_side: string;
  match_id: number;
  map_id: number;
  team_id: number;
  round_number: number;
  round_time: number;
  attacker_steam_id: string;
  attacker_name: string;
  attacker_side: string;
  weapon: string;
  bomb: boolean;
  headshot: boolean;
  thru_smoke: boolean;
  attacker_blind: boolean;
  no_scope: boolean;
  suicide: boolean;
  friendly_fire: boolean;
  assister_steam_id: string | null;
  assister_name: string | null;
  assister_side: string | null;
  assist_friendly_fire: boolean;
  flash_assist: boolean;
}

export interface BombEvent {
  id: number;
  match_id: number;
  map_id: number;
  player_name: string;
  round_number: number;
  round_time: number;
  site: string;
  defused: boolean;
  bomb_time_remaining: number | null;
}

export async function getKillEvents(matchId: number): Promise<KillEvent[]> {
  try {
    const data = await apiFetch<{ playerStatExtra: KillEvent[] }>(`/playerstatsextra/match/${matchId}`, true);
    return data.playerStatExtra || [];
  } catch {
    return [];
  }
}

export async function getBombEvents(matchId: number): Promise<BombEvent[]> {
  try {
    const data = await apiFetch<{ bombInfo: BombEvent[] }>(`/matches/${matchId}/bombs`, true);
    return data.bombInfo || [];
  } catch {
    return [];
  }
}

export function getSSEUrl(matchId: number): string {
  return `${getApiBase()}/matches/${matchId}/stream`;
}

// ── Auth ──
// O HOSTNAME do G5API aponta para o proxy do Next.js (ex: http://localhost:3001/api).
// Assim, todo o fluxo Steam OAuth passa pelo proxy e o cookie connect.sid
// é setado no domínio do frontend (localhost ou produção).
// As chamadas /isloggedin e /logout também usam o proxy.
export async function getCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch(`${API_BASE_PROXY}/isloggedin`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data === false || data === null) return null;
    return data.user || data || null;
  } catch {
    return null;
  }
}

// Login via Steam OAuth - usa o proxy para que o cookie fique no domínio correto
export function getSteamLoginUrl(): string {
  return `${API_BASE_PROXY}/auth/steam`;
}

// Logout
export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE_PROXY}/logout`, {
      credentials: "include",
      cache: "no-store",
    });
  } catch {
    // silently fail
  }
}

// ── Player Profile ──
export async function getPlayerProfile(steamId: string): Promise<PlayerProfile | null> {
  try {
    const res = await fetch(`${getApiBase()}/playerstats/${steamId}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.playerstats || data.playerStats || data || null;
  } catch {
    return null;
  }
}

export async function getPlayerMatches(steamId: string): Promise<Match[]> {
  try {
    const res = await fetch(`${getApiBase()}/playerstats/${steamId}/recent`, {
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.matches || data.playerstats || [];
  } catch {
    return [];
  }
}

// ── Admin: Teams ──
export async function createTeam(team: { name: string; tag: string; flag: string; logo?: string; public_team: boolean; auth_name: Record<string, string> }): Promise<{ team: Team }> {
  // G5API expects auth_name as { steamId: { name, captain, coach } }
  const authNested = Object.fromEntries(
    Object.entries(team.auth_name).map(([steamId, nick]) => [steamId, { name: nick, captain: 0, coach: 0 }])
  );
  const payload = { ...team, auth_name: authNested };
  const res = await fetch(`${API_WRITE_PROXY}/teams`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([payload]),  // G5API espera array: req.body[0]
  });
  if (!res.ok) throw new Error(`Erro ao criar time: ${res.status}`);
  return res.json();
}

export async function updateTeam(team: { team_id: number; name?: string; tag?: string; flag?: string; logo?: string; public_team?: boolean; auth_name?: Record<string, string>; prev_auth_name?: Record<string, string> }): Promise<void> {
  // G5API PUT /teams espera array com "id", e auth_name no formato { steamId: { name, captain, coach } }
  const { team_id, auth_name, prev_auth_name, ...rest } = team;
  const authNested: Record<string, { name: string; captain: number; coach: number }> | undefined = auth_name
    ? Object.fromEntries(Object.entries(auth_name).map(([steamId, nick]) => [steamId, { name: nick, captain: 0, coach: 0 }]))
    : undefined;
  const payload = { id: team_id, ...rest, ...(authNested ? { auth_name: authNested } : {}) };

  // G5API PUT /teams only updates/inserts players, never deletes.
  // We must explicitly DELETE removed players via DELETE /teams with steam_id.
  if (prev_auth_name && auth_name) {
    const removedSteamIds = Object.keys(prev_auth_name).filter(sid => !(sid in auth_name));
    for (const steamId of removedSteamIds) {
      await fetch(`${API_WRITE_PROXY}/teams`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([{ team_id, steam_id: steamId }]),
      });
    }
  }

  const res = await fetch(`${API_WRITE_PROXY}/teams`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([payload]),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Erro ao atualizar time: ${res.status} ${errBody}`);
  }
}

export async function deleteTeam(teamId: number): Promise<void> {
  const res = await fetch(`${API_WRITE_PROXY}/teams`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ team_id: teamId }]),
  });
  if (!res.ok) throw new Error(`Erro ao deletar time: ${res.status}`);
}

// ── Admin: Servers ──
export async function getServers(): Promise<{ servers: Server[] }> {
  return apiFetch("/servers");
}

export async function getServer(id: number): Promise<{ server: Server }> {
  return apiFetch(`/servers/${id}`);
}

export async function getAvailableServers(): Promise<{ servers: Server[] }> {
  return apiFetch("/servers/available", true);
}

export async function createServer(server: { ip_string: string; port: number; display_name: string; rcon_password: string; public_server: boolean; flag?: string }): Promise<{ server: Server }> {
  const res = await fetch(`${API_WRITE_PROXY}/servers`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([server]),
  });
  if (!res.ok) throw new Error(`Erro ao criar servidor: ${res.status}`);
  return res.json();
}

export async function updateServer(server: { server_id: number; ip_string?: string; port?: number; display_name?: string; rcon_password?: string; public_server?: boolean; flag?: string }): Promise<void> {
  // G5API PUT /servers espera "server_id" no body
  const res = await fetch(`${API_WRITE_PROXY}/servers`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([server]),
  });
  if (!res.ok) throw new Error(`Erro ao atualizar servidor: ${res.status}`);
}

export async function deleteServer(serverId: number): Promise<void> {
  const res = await fetch(`${API_WRITE_PROXY}/servers`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ server_id: serverId }]),
  });
  if (!res.ok) throw new Error(`Erro ao deletar servidor: ${res.status}`);
}

// ── Admin: Matches ──
export async function createMatch(match: {
  team1_id: number;
  team2_id: number;
  server_id: number;
  num_maps: number;
  max_maps: number;
  skip_veto: boolean;
  veto_first: string;
  side_type: string;
  players_per_team: number;
  min_player_ready: number;
  season_id?: number;
  title?: string;
  is_pug?: boolean;
  maplist?: string[];
  veto_mappool?: string;
}): Promise<{ match: { id: number } }> {
  const res = await fetch(`${API_WRITE_PROXY}/matches`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([match]),
  });
  if (!res.ok) {
    const text = await res.text();
    const msg = (() => { try { return JSON.parse(text).message; } catch { return text; } })();
    throw new Error(msg || `Erro ao criar partida: ${res.status}`);
  }
  const data = await res.json();
  // G5API retorna { message: "...", id: N } ao criar match
  if (data.match) return data;
  if (data.id) return { match: { id: data.id } as Match };
  return data;
}

export async function updateMatch(match: { match_id: number; [key: string]: unknown }): Promise<void> {
  const res = await fetch(`${API_WRITE_PROXY}/matches`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([match]),
  });
  if (!res.ok) throw new Error(`Erro ao atualizar partida: ${res.status}`);
}

export async function deleteMatch(matchId: number): Promise<void> {
  const res = await fetch(`${API_WRITE_PROXY}/matches`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ match_id: matchId }]),
  });
  if (!res.ok) throw new Error(`Erro ao deletar partida: ${res.status}`);
}

export async function sendRconCommand(serverId: number, command: string): Promise<{ response: string }> {
  const res = await fetch(`${API_WRITE_PROXY}/servers/${serverId}/rcon`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ command }]),
  });
  if (!res.ok) throw new Error(`Erro ao enviar RCON: ${res.status}`);
  return res.json();
}

// ── Match Admin Actions (RCON via G5API) ──
export async function pauseMatch(matchId: number): Promise<void> {
  const res = await fetch(`${API_WRITE_PROXY}/matches/${matchId}/pause`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Erro ao pausar partida: ${res.status}`);
}

export async function unpauseMatch(matchId: number): Promise<void> {
  const res = await fetch(`${API_WRITE_PROXY}/matches/${matchId}/unpause`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Erro ao despausar partida: ${res.status}`);
}

export async function restartMatch(matchId: number): Promise<void> {
  const res = await fetch(`${API_WRITE_PROXY}/matches/${matchId}/restart`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Erro ao reiniciar partida: ${res.status}`);
}

export async function addPlayerToMatch(matchId: number, steamId: string, nickname: string, teamId: string): Promise<void> {
  const res = await fetch(`${API_WRITE_PROXY}/matches/${matchId}/adduser`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ steam_id: steamId, nickname, team_id: teamId }]),
  });
  if (!res.ok) throw new Error(`Erro ao adicionar jogador: ${res.status}`);
}

export async function getMatchBackups(matchId: number): Promise<string[]> {
  // Tenta buscar backups via RCON (servidor ativo) e via remote (filesystem do G5API)
  const results: string[] = [];

  // 1. RCON (get5_listbackups no servidor de jogo)
  try {
    const res = await fetch(`${API_WRITE_PROXY}/matches/${matchId}/backup`, {
      credentials: "include",
    });
    const data = await res.json();
    console.log("[backups] RCON response:", res.status, data);
    if (res.ok && typeof data.response === "string") {
      const rconBackups = data.response.split("\n").map((s: string) => s.trim()).filter(Boolean);
      results.push(...rconBackups);
    }
  } catch (err) {
    console.error("[backups] RCON error:", err);
  }

  // 2. Remote (backups salvos no filesystem do G5API)
  try {
    const res = await fetch(`${API_WRITE_PROXY}/matches/${matchId}/backup/remote`, {
      credentials: "include",
    });
    const data = await res.json();
    console.log("[backups] Remote response:", res.status, data);
    if (res.ok && Array.isArray(data.response)) {
      for (const f of data.response) {
        if (!results.includes(f)) results.push(f);
      }
    }
  } catch (err) {
    console.error("[backups] Remote error:", err);
  }

  return results;
}

export async function restoreMatchBackup(matchId: number, backupFile: string): Promise<void> {
  const res = await fetch(`${API_WRITE_PROXY}/matches/${matchId}/backup`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ backup_name: backupFile }]),
  });
  if (!res.ok) throw new Error(`Erro ao restaurar backup: ${res.status}`);
}

export async function sendMatchRcon(matchId: number, command: string): Promise<{ response: string }> {
  const res = await fetch(`${API_WRITE_PROXY}/matches/${matchId}/rcon`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ rcon_command: command }]),
  });
  if (!res.ok) throw new Error(`Erro ao enviar RCON: ${res.status}`);
  return res.json();
}

// ── Admin: Seasons ──
export async function createSeason(season: { name: string; start_date: string; end_date?: string }): Promise<{ season: Season }> {
  const res = await fetch(`${API_WRITE_PROXY}/seasons`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([season]),
  });
  if (!res.ok) throw new Error(`Erro ao criar season: ${res.status}`);
  return res.json();
}

export async function updateSeason(season: { season_id: number; name?: string; start_date?: string; end_date?: string }): Promise<void> {
  const res = await fetch(`${API_WRITE_PROXY}/seasons`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([season]),
  });
  if (!res.ok) throw new Error(`Erro ao atualizar season: ${res.status}`);
}

export async function deleteSeason(seasonId: number): Promise<void> {
  const res = await fetch(`${API_WRITE_PROXY}/seasons`, {
    method: "DELETE",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ season_id: seasonId }]),
  });
  if (!res.ok) throw new Error(`Erro ao deletar season: ${res.status}`);
}
