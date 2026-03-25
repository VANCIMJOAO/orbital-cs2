import { G5API_URL, API_PROXY_URL, WRITE_PROXY_URL } from "./constants";

// Server-side usa URL direta, client-side usa proxy /api para evitar CORS
const API_BASE_DIRECT = G5API_URL;
const API_BASE_PROXY = API_PROXY_URL;
// Proxy manual para operações de escrita (POST/PUT/DELETE)
// O rewrite do Next.js não repassa cookies corretamente em POSTs
const API_WRITE_PROXY = WRITE_PROXY_URL;

function getApiBase() {
  if (typeof window === "undefined") return API_BASE_DIRECT;
  return API_BASE_PROXY;
}

// ══════════════════════════════════════════════════════════════════════════════
// G5API Write Operations - CENTRALIZADO
// ══════════════════════════════════════════════════════════════════════════════
// IMPORTANTE: G5API espera SEMPRE um array no body: req.body[0]
// Este wrapper garante que TODAS as operações de escrita usem o formato correto.
// ══════════════════════════════════════════════════════════════════════════════

interface G5ApiWriteOptions {
  /** Endpoint path (sem base URL), ex: "/teams" ou "/matches" */
  endpoint: string;
  /** HTTP method */
  method: "POST" | "PUT" | "DELETE";
  /** Payload - será automaticamente envolvido em array se não for array */
  body?: unknown;
  /** Mensagem de erro customizada */
  errorMessage?: string;
}

/**
 * Wrapper centralizado para operações de escrita no G5API (client-side via write-proxy).
 *
 * CRÍTICO: G5API lê `req.body[0]` - enviar objeto puro causa crash.
 * Este wrapper SEMPRE envolve o body em array automaticamente.
 *
 * @example
 * // Criar time
 * await g5apiWrite({ endpoint: "/teams", method: "POST", body: { name: "FURIA" } });
 *
 * // Deletar match
 * await g5apiWrite({ endpoint: "/matches", method: "DELETE", body: { match_id: 123 } });
 */
export async function g5apiWrite<T = unknown>({
  endpoint,
  method,
  body,
  errorMessage,
}: G5ApiWriteOptions): Promise<T> {
  // Garantir que body é sempre array
  const wrappedBody = body !== undefined
    ? JSON.stringify(Array.isArray(body) ? body : [body])
    : undefined;

  const res = await fetch(`${API_WRITE_PROXY}${endpoint}`, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: wrappedBody,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const defaultMsg = `G5API ${method} ${endpoint}: ${res.status}`;
    const parsed = (() => {
      try {
        return JSON.parse(text).message;
      } catch {
        return text;
      }
    })();
    throw new Error(errorMessage ? `${errorMessage}: ${parsed || res.status}` : `${defaultMsg} ${parsed}`);
  }

  // Alguns endpoints retornam 204 No Content
  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return {} as T;
  }

  return res.json();
}

/**
 * Wrapper server-side para operações de escrita no G5API (direto, sem proxy).
 * Use este em API routes e server components que precisam chamar G5API diretamente.
 *
 * CRÍTICO: G5API lê `req.body[0]` - enviar objeto puro causa crash.
 */
export async function g5apiWriteServer<T = unknown>({
  endpoint,
  method,
  body,
  errorMessage,
}: G5ApiWriteOptions): Promise<T> {
  // Garantir que body é sempre array
  const wrappedBody = body !== undefined
    ? JSON.stringify(Array.isArray(body) ? body : [body])
    : undefined;

  const res = await fetch(`${API_BASE_DIRECT}${endpoint}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: wrappedBody,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const defaultMsg = `G5API ${method} ${endpoint}: ${res.status}`;
    const parsed = (() => {
      try {
        return JSON.parse(text).message;
      } catch {
        return text;
      }
    })();
    throw new Error(errorMessage ? `${errorMessage}: ${parsed || res.status}` : `${defaultMsg} ${parsed}`);
  }

  const contentType = res.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return {} as T;
  }

  return res.json();
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

export interface HighlightClip {
  id: number;
  match_id: number;
  map_number: number;
  rank: number;
  player_name: string | null;
  steam_id: string | null;
  kills_count: number;
  score: number;
  description: string | null;
  round_number: number | null;
  tick_start: number | null;
  tick_end: number | null;
  video_file: string | null;
  thumbnail_file: string | null;
  duration_s: number | null;
  status: string;
  error_message: string | null;
  created_at: string;
  team1_string: string;
  team2_string: string;
}

export function parseMapStats(raw: Record<string, unknown>): { team1_score: number; team2_score: number; map_name: string }[] {
  const stats = (raw.mapstats || raw.mapStats || []) as { team1_score: number; team2_score: number; map_name: string }[];
  return Array.isArray(stats) ? stats : [];
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
  return g5apiWrite({ endpoint: "/teams", method: "POST", body: payload, errorMessage: "Erro ao criar time" });
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
      await g5apiWrite({ endpoint: "/teams", method: "DELETE", body: { team_id, steam_id: steamId } });
    }
  }

  await g5apiWrite({ endpoint: "/teams", method: "PUT", body: payload, errorMessage: "Erro ao atualizar time" });
}

export async function deleteTeam(teamId: number): Promise<void> {
  await g5apiWrite({ endpoint: "/teams", method: "DELETE", body: { team_id: teamId }, errorMessage: "Erro ao deletar time" });
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
  return g5apiWrite({ endpoint: "/servers", method: "POST", body: server, errorMessage: "Erro ao criar servidor" });
}

export async function updateServer(server: { server_id: number; ip_string?: string; port?: number; display_name?: string; rcon_password?: string; public_server?: boolean; flag?: string }): Promise<void> {
  await g5apiWrite({ endpoint: "/servers", method: "PUT", body: server, errorMessage: "Erro ao atualizar servidor" });
}

export async function deleteServer(serverId: number): Promise<void> {
  await g5apiWrite({ endpoint: "/servers", method: "DELETE", body: { server_id: serverId }, errorMessage: "Erro ao deletar servidor" });
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
  spectator_auths?: { [key: string]: string };
}): Promise<{ match: { id: number } }> {
  // G5API expects veto_mappool as space-separated string, not maplist array
  // Fallback: full CS2 active duty pool (for in-game veto when no maps pre-selected)
  const CS2_FULL_POOL = "de_ancient de_anubis de_dust2 de_inferno de_mirage de_nuke de_vertigo";
  const { maplist, ...rest } = match;
  const payload = {
    ...rest,
    veto_mappool: maplist ? maplist.join(" ") : (rest.veto_mappool || CS2_FULL_POOL),
  };
  const data = await g5apiWrite<{ match?: { id: number }; id?: number; message?: string }>({
    endpoint: "/matches",
    method: "POST",
    body: payload,
    errorMessage: "Erro ao criar partida",
  });
  // G5API retorna { message: "...", id: N } ao criar match
  if (data.match) return data as { match: { id: number } };
  if (data.id) return { match: { id: data.id } as Match };
  return data as { match: { id: number } };
}

export async function updateMatch(match: { match_id: number; [key: string]: unknown }): Promise<void> {
  await g5apiWrite({ endpoint: "/matches", method: "PUT", body: match, errorMessage: "Erro ao atualizar partida" });
}

export async function deleteMatch(matchId: number): Promise<void> {
  await g5apiWrite({ endpoint: "/matches", method: "DELETE", body: { match_id: matchId }, errorMessage: "Erro ao deletar partida" });
}

export async function sendRconCommand(serverId: number, command: string): Promise<{ response: string }> {
  return g5apiWrite({ endpoint: `/servers/${serverId}/rcon`, method: "POST", body: { command }, errorMessage: "Erro ao enviar RCON" });
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
  await g5apiWrite({ endpoint: `/matches/${matchId}/adduser`, method: "PUT", body: { steam_id: steamId, nickname, team_id: teamId }, errorMessage: "Erro ao adicionar jogador" });
}

export interface BackupEntry {
  filename: string;
  label: string;
}

function parseBackupLine(line: string): BackupEntry {
  // Format from get5_listbackups: "filename.json date time team1 team2 map score1 score2"
  const parts = line.split(/\s+/);
  const filename = parts[0];

  // Extract round number from filename (e.g. matchzy_29_0_round06.json -> 6)
  const roundMatch = filename.match(/round(\d+)/);
  const round = roundMatch ? parseInt(roundMatch[1]) : null;

  if (parts.length >= 8) {
    const date = parts[1]; // 2026-03-15
    const time = parts[2]; // 02:32:08
    const team1 = parts[3];
    const team2 = parts[4];
    const map = parts[5].replace("de_", "");
    const score1 = parts[6];
    const score2 = parts[7];
    const timeStr = time.substring(0, 5); // HH:MM
    const label = `Round ${round ?? "?"} · ${team1} ${score1}×${score2} ${team2} · ${map} · ${timeStr}`;
    return { filename, label };
  }

  // Fallback: just format the filename nicely
  if (round !== null) {
    return { filename, label: `Round ${round}` };
  }
  return { filename, label: filename };
}

export async function getMatchBackups(matchId: number): Promise<BackupEntry[]> {
  const results: BackupEntry[] = [];
  const seen = new Set<string>();

  // 1. RCON (get5_listbackups no servidor de jogo)
  try {
    const res = await fetch(`${API_WRITE_PROXY}/matches/${matchId}/backup`, {
      credentials: "include",
    });
    const data = await res.json();
    if (res.ok && typeof data.response === "string") {
      const rconBackups = data.response.split("\n").map((s: string) => s.trim()).filter(Boolean);
      for (const line of rconBackups) {
        const entry = parseBackupLine(line);
        if (!seen.has(entry.filename)) {
          seen.add(entry.filename);
          results.push(entry);
        }
      }
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
    if (res.ok && Array.isArray(data.response)) {
      for (const f of data.response) {
        if (!seen.has(f)) {
          seen.add(f);
          const roundMatch = f.match(/round(\d+)/);
          const round = roundMatch ? parseInt(roundMatch[1]) : null;
          results.push({ filename: f, label: round !== null ? `Round ${round} (remoto)` : f });
        }
      }
    }
  } catch (err) {
    console.error("[backups] Remote error:", err);
  }

  return results;
}

export async function restoreMatchBackup(matchId: number, backupFile: string): Promise<void> {
  await g5apiWrite({ endpoint: `/matches/${matchId}/backup`, method: "POST", body: { backup_name: backupFile }, errorMessage: "Erro ao restaurar backup" });
}

export async function sendMatchRcon(matchId: number, command: string): Promise<{ response: string }> {
  return g5apiWrite({ endpoint: `/matches/${matchId}/rcon`, method: "PUT", body: { rcon_command: command }, errorMessage: "Erro ao enviar RCON" });
}

// ── Admin: Seasons ──
export async function createSeason(season: { name: string; start_date: string; end_date?: string }): Promise<{ season: Season }> {
  return g5apiWrite({ endpoint: "/seasons", method: "POST", body: season, errorMessage: "Erro ao criar season" });
}

export async function updateSeason(season: { season_id: number; name?: string; start_date?: string; end_date?: string }): Promise<void> {
  await g5apiWrite({ endpoint: "/seasons", method: "PUT", body: season, errorMessage: "Erro ao atualizar season" });
}

export async function deleteSeason(seasonId: number): Promise<void> {
  await g5apiWrite({ endpoint: "/seasons", method: "DELETE", body: { season_id: seasonId }, errorMessage: "Erro ao deletar season" });
}
