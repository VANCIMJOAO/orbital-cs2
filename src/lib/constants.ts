// ══════════════════════════════════════════════════════════════════════════════
// ORBITAL ROXA - Constantes Centralizadas
// ══════════════════════════════════════════════════════════════════════════════
// Todas as URLs, configurações e valores compartilhados do sistema.
// NUNCA defina estas constantes localmente em outros arquivos.
// ══════════════════════════════════════════════════════════════════════════════

// ── G5API URLs ──
// Backend REST API para gestão de partidas, times, servidores e stats

/** URL direta do G5API (Railway) - usar em server-side */
export const G5API_URL =
  process.env.G5API_URL ||
  process.env.NEXT_PUBLIC_G5API_URL ||
  "https://g5api-production-998f.up.railway.app";

/** URL do proxy API (Next.js) - usar em client-side para evitar CORS */
export const API_PROXY_URL = "/api";

/** URL do write-proxy (Next.js) - usar para POST/PUT/DELETE com cookie forwarding */
export const WRITE_PROXY_URL = "/write-proxy";

// ── CS2 Map Pool ──
// Pool de mapas ativos do CS2 (Active Duty)

/** Lista de mapas CS2 (array) */
export const CS2_MAP_POOL = [
  "de_ancient",
  "de_anubis",
  "de_dust2",
  "de_inferno",
  "de_mirage",
  "de_nuke",
  "de_vertigo",
] as const;

/** Map pool como string separada por espaços (formato G5API) */
export const CS2_MAP_POOL_STRING = CS2_MAP_POOL.join(" ");

/** Type para mapas CS2 */
export type CS2Map = typeof CS2_MAP_POOL[number];

// ── Cloudflare R2 (Highlights) ──

/** URL pública do bucket R2 */
export const R2_PUBLIC_URL =
  process.env.R2_PUBLIC_URL ||
  "https://pub-894e2fa8c7684e2095cedd60a72f4536.r2.dev";

// ── Auth ──

/** Nome do cookie de sessão G5API */
export const G5API_COOKIE_NAME = "G5API";

/** Timeout para verificação de admin (ms) */
export const ADMIN_CHECK_TIMEOUT = 5000;

// ── Cache TTLs (segundos) ──

export const CACHE_TTL = {
  /** Matches - sem cache (tempo real) */
  MATCHES: 0,
  /** Teams - 5 minutos */
  TEAMS: 300,
  /** Leaderboard - 15 segundos */
  LEADERBOARD: 15,
  /** Player profile - 5 minutos */
  PLAYER_PROFILE: 300,
  /** Highlights - 1 minuto */
  HIGHLIGHTS: 60,
  /** OG images - 5 minutos */
  OG_IMAGE: 300,
} as const;

// ── Defaults ──

export const DEFAULTS = {
  /** Jogadores por time */
  PLAYERS_PER_TEAM: 5,
  /** Mínimo de jogadores prontos para começar */
  MIN_PLAYER_READY: 1,
  /** Máximo de mapas em BO3 */
  MAX_MAPS_BO3: 3,
  /** Máximo de mapas em BO5 */
  MAX_MAPS_BO5: 5,
} as const;

// ══════════════════════════════════════════════════════════════════════════════
// Write Proxy Configuration
// ══════════════════════════════════════════════════════════════════════════════
// O write-proxy encaminha requisições POST/PUT/DELETE para o G5API.
// IMPORTANTE: Adicione novos endpoints do G5API aqui para permitir acesso.
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Prefixos de path permitidos no write-proxy.
 * Se um endpoint do G5API retornar 403, provavelmente falta aqui.
 *
 * Para adicionar um novo endpoint:
 * 1. Adicione o prefixo nesta lista
 * 2. Faça deploy
 *
 * Exemplo: Para permitir `/challenges/123`, adicione "challenges"
 */
export const WRITE_PROXY_ALLOWED_PREFIXES = [
  "teams",
  "servers",
  "seasons",
  "matches",
  "auth",
  "leaderboard",
  "playerstats",
  "mapstats",
  "vetoes",
  "isloggedin",
  "highlights",
] as const;

/**
 * Se true, permite QUALQUER path no write-proxy (bypass da allowlist).
 * USE APENAS EM DESENVOLVIMENTO para descobrir novos endpoints.
 * NUNCA habilite em produção.
 */
export const WRITE_PROXY_ALLOW_ALL = process.env.WRITE_PROXY_ALLOW_ALL === "true";
