"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy, Swords, X, Check, ArrowLeft, Loader2, Play, Trash2, BarChart3,
  Calendar, MapPin, DollarSign, Users, Shield, Sparkles, Target, Skull, Crosshair,
  Medal, Map, Layers, ChevronRight, Crown, Star,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { HudCard } from "@/components/hud-card";
import { VideoPlayer } from "@/components/video-player";
import { FullBracket, MapScoresMap } from "@/components/bracket";
import { BracketExportButton } from "@/components/bracket-export-button";
import { useAuth } from "@/lib/auth-context";
import { createMatch, getServers, getTeams, getMapStats, getMatches, getLeaderboard, getPlayerStats, parseMapStats, Server, Match, LeaderboardEntry, HighlightClip, PlayerStats } from "@/lib/api";
import { calculateAwards, Award } from "@/lib/awards";
import { TeamsMap } from "@/components/bracket";
import { MAP_IMAGES } from "@/lib/maps";
import {
  Tournament,
  BracketMatch,
  advanceBracket,
  getTeamName,
  getNextPlayableMatch,
  getVetoSequence,
  getVetoTeamOrder,
  VetoAction,
  getSwissStandings,
} from "@/lib/tournament";

// ── Types ──
type TabId = "overview" | "partidas" | "ranking" | "highlights";

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "OVERVIEW" },
  { id: "partidas", label: "PARTIDAS" },
  { id: "ranking", label: "RANKING" },
  { id: "highlights", label: "HIGHLIGHTS" },
];

interface InscritoLite {
  team_name: string; team_tag: string; logo_url: string | null; status: string;
  team_id?: number | null; captain_name?: string; captain_steam_id?: string;
  players?: { name: string; steam_id: string }[];
}

interface CampeonatoContentProps {
  id: string;
  initialTournament: Tournament | null;
  initialTeamsMap: TeamsMap;
  initialMapScores: MapScoresMap;
  inscritos?: InscritoLite[];
}

// ─── Lobby (estado pendente: inscrições abertas, sem bracket) ───
const LOBBY_CSS = `
.cmp-slotgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
@media(max-width:900px){.cmp-slotgrid{grid-template-columns:repeat(2,1fr)}}
.cmp-slot{height:232px;border:1px solid var(--orbital-border,#2E2038);background:#150A1D;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;position:relative;clip-path:polygon(0 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%)}
.cmp-slot.filled{border-color:rgba(124,92,255,.4);background:linear-gradient(180deg,rgba(124,92,255,.08),#150A1D)}
.cmp-num{position:absolute;top:9px;left:12px;font-family:var(--font-jetbrains),monospace;font-size:10px;color:#7e7b88;z-index:3}
.cmp-logo{width:54px;height:54px;border:1px solid rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-family:var(--font-russo),sans-serif;font-size:19px;color:#FF8A3D;overflow:hidden;position:relative}
.cmp-slot.filled .cmp-logo{border-color:#FF5A1F}
.cmp-logo img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:6px}
.cmp-nm{font-family:var(--font-russo),sans-serif;font-size:14px;text-transform:uppercase;letter-spacing:.02em;text-align:center;padding:0 8px}
.cmp-st{font-family:var(--font-jetbrains),monospace;font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;display:flex;align-items:center;gap:6px}
.cmp-st.ok{color:#4ade80}.cmp-st.pend{color:#f5c542}
.cmp-st i{width:6px;height:6px;border-radius:50%;background:currentColor}
.cmp-slot.empty .cmp-logo{color:#33313b;border-style:dashed}
.cmp-slot.empty .cmp-nm{color:#48454f;font-size:11px;font-family:var(--font-jetbrains),monospace;letter-spacing:.14em}
/* flip */
.cmp-slot.flip{perspective:1200px;cursor:pointer}
.cmp-flip-inner{position:relative;width:100%;height:100%;transition:transform .6s cubic-bezier(.4,0,.2,1);transform-style:preserve-3d}
.cmp-slot.flip:hover .cmp-flip-inner{transform:rotateY(180deg)}
.cmp-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;display:flex;flex-direction:column}
.cmp-face.front{align-items:center;justify-content:center;gap:12px}
.cmp-face.back{transform:rotateY(180deg);padding:12px;justify-content:flex-start;background:linear-gradient(180deg,rgba(124,92,255,.1),#150A1D);overflow:hidden auto}
.cmp-face.back::-webkit-scrollbar{width:4px}
.cmp-face.back::-webkit-scrollbar-thumb{background:rgba(124,92,255,.4)}
.cmp-face a{text-decoration:none;color:inherit;cursor:pointer}
.cmp-hint{position:absolute;bottom:10px;right:12px;font-family:var(--font-jetbrains),monospace;font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:#7e7b88;opacity:.5}
.cmp-bkh{display:flex;align-items:center;gap:8px;padding-bottom:8px;margin-bottom:8px;border-bottom:1px solid rgba(255,255,255,.08);color:inherit}
a.cmp-bkh:hover .nm{color:#FF8A3D}
.cmp-bkh .lg{width:22px;height:22px;border:1px solid #FF5A1F;display:flex;align-items:center;justify-content:center;font-family:var(--font-russo),sans-serif;font-size:9px;color:#FF8A3D;flex:0 0 auto;overflow:hidden;position:relative}
.cmp-bkh .lg img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain}
.cmp-bkh .nm{font-family:var(--font-russo),sans-serif;font-size:12px;text-transform:uppercase;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cmp-bkh .cnt{margin-left:auto;font-family:var(--font-jetbrains),monospace;font-size:9.5px;color:#7e7b88;flex:0 0 auto}
.cmp-roster{list-style:none;display:flex;flex-direction:column;gap:3px;margin:0;padding:0}
.cmp-roster a{display:flex;align-items:center;gap:9px;padding:4px 7px;background:rgba(255,255,255,.02);border-left:2px solid transparent;color:inherit;transition:background .15s}
.cmp-roster a:hover{background:rgba(124,92,255,.12)}
.cmp-roster a.cap-row{border-left-color:#f5c542;background:rgba(245,197,66,.06)}
.cmp-roster a.cap-row:hover{background:rgba(245,197,66,.12)}
.cmp-roster .av{width:23px;height:23px;border-radius:50%;background:linear-gradient(135deg,#FF5A1F,#C24A1A);display:flex;align-items:center;justify-content:center;font-family:var(--font-russo),sans-serif;font-size:10px;color:#fff;flex:0 0 auto;text-transform:uppercase;overflow:hidden;position:relative}
.cmp-roster a.cap-row .av{background:linear-gradient(135deg,#f5c542,#c79a1f);color:#1a1400}
.cmp-roster .av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cmp-roster .pn{flex:1;font-family:var(--font-jetbrains),monospace;font-size:12px;color:#efedf4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cmp-roster .cap{font-family:var(--font-jetbrains),monospace;font-size:8px;letter-spacing:.05em;color:#f5c542;flex:0 0 auto}
/* map pool cards */
.cmp-mapgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
@media(max-width:900px){.cmp-mapgrid{grid-template-columns:repeat(2,1fr)}}
.cmp-mp{aspect-ratio:16/10;position:relative;border:1px solid rgba(255,255,255,.08);overflow:hidden;display:flex;align-items:flex-end;clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)}
.cmp-mp img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.5;filter:grayscale(.35) contrast(1.05);transition:.3s}
.cmp-mp:hover img{opacity:.78;transform:scale(1.04)}
.cmp-mp::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,rgba(27,15,35,.95),transparent 62%)}
.cmp-mp span{position:relative;z-index:1;font-family:var(--font-russo),sans-serif;font-size:12px;letter-spacing:.05em;text-transform:uppercase;padding:9px 11px;color:#fff}
/* evento compacto */
.cmp-kv{display:flex;flex-direction:column;gap:15px}
.cmp-kv .k{font-family:var(--font-jetbrains),monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:#7e7b88}
.cmp-kv .v{font-family:var(--font-russo),sans-serif;font-size:15px;margin-top:5px;color:#efedf4}
`;

/* ═══════════ Overworld skin — escopado em .cpv (não afeta admin/globais) ═══════════
   Remapeia os tokens Tailwind --color-orbital-* dentro da página + fundo roxo,
   aura viva, título lâmina e cantos chanfrados nos cards. Toda a lógica preservada. */
const CAMP_CSS = `
.cpv{
  --color-orbital-bg:#1B0F23;
  --color-orbital-card:#22132E;
  --color-orbital-border:#2E2038;
  --color-orbital-border-light:#3C2A4E;
  --color-orbital-purple:#FF5A1F;
  --color-orbital-purple-dim:#C24A1A;
  --color-orbital-purple-bright:#FF8A3D;
  --color-orbital-text:#F3ECF7;
  --color-orbital-text-dim:#9C8AAE;
  --color-orbital-success:#54E08A;
  --color-orbital-danger:#FF3B57;
  --color-orbital-live:#FF3B57;
  --color-orbital-gold:#FFC24B;
  --color-orbital-warning:#FFC24B;
  position:relative;
  background:#1B0F23;
  background-image:
    radial-gradient(120% 60% at 88% -2%, rgba(255,90,31,.13), transparent 52%),
    radial-gradient(90% 55% at 0% 1%, rgba(124,92,255,.12), transparent 55%);
}
.cpv::before{content:'';position:fixed;inset:0;z-index:0;pointer-events:none;
  background:radial-gradient(40% 44% at 16% 14%,rgba(255,90,31,.10),transparent 62%),radial-gradient(36% 40% at 88% 6%,rgba(124,92,255,.10),transparent 66%);
  animation:cpvaura 22s ease-in-out infinite alternate}
@keyframes cpvaura{0%{transform:translate3d(-2%,-1%,0) scale(1)}100%{transform:translate3d(3%,2%,0) scale(1.12)}}
.cpv > *{position:relative;z-index:1}
/* título lâmina (contorno) */
.cpv h1{ -webkit-text-stroke:2px #241038; paint-order:stroke fill; }
/* cantos chanfrados nos cards — linguagem angular Overworld.
   O polígono começa em -20px pra NÃO cortar o label do HudCard (absolute -top-3,
   flutua acima da borda do card). */
.cpv .bg-orbital-card{ clip-path:polygon(0 -20px,100% -20px,100% calc(100% - 11px),calc(100% - 11px) 100%,0 100%); }
@media(prefers-reduced-motion:reduce){ .cpv::before{ animation:none; } }
`;

// Modelo "FACEIT": o time no G5API é o CLUBE (todos os membros, histórico);
// a INSCRIÇÃO é o roster do campeonato (só quem joga ESTA edição).
// A inscrição manda na LISTA (quem/quantos aparecem); o time ao vivo só
// CORRIGE os dados — nick corrigido casa por steamid, steamid corrigido
// casa por nome (caso LANGO). Nunca adiciona gente além dos inscritos.
function rosterOf(insc: InscritoLite, teamsMap?: TeamsMap): { name: string; steam_id: string; cap: boolean }[] {
  const seen = new Set<string>();
  const out: { name: string; steam_id: string; cap: boolean }[] = [];
  const norm = (s: string) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
  const live = insc.team_id != null && teamsMap ? teamsMap[insc.team_id]?.players : null;

  const push = (name: string, steam_id: string, cap: boolean) => {
    // enriquece com o dado ao vivo: por steamid (nick corrigido) ou por nome (steamid corrigido)
    const fixed = live?.find(p => p.steamId === steam_id) || live?.find(p => norm(p.name) === norm(name));
    const finalId = fixed?.steamId || steam_id;
    const finalName = fixed?.name || name;
    if (!finalId || seen.has(finalId)) return;
    seen.add(finalId); out.push({ name: finalName || finalId, steam_id: finalId, cap });
  };

  // 1) Roster da inscrição (capitão primeiro)
  if (insc.captain_steam_id) push(insc.captain_name || "Capitão", insc.captain_steam_id, true);
  for (const p of insc.players || []) push(p.name, p.steam_id, false);
  if (out.length) return out;

  // 2) Fallback: inscrição sem players (dado antigo) → roster ao vivo do time
  if (live && live.length) {
    for (const p of [...live].sort((a, b) => (b.captain === 1 ? 1 : 0) - (a.captain === 1 ? 1 : 0))) {
      if (!p.steamId || seen.has(p.steamId)) continue;
      seen.add(p.steamId); out.push({ name: p.name || p.steamId, steam_id: p.steamId, cap: p.captain === 1 });
    }
  }
  return out;
}
const initialOf = (s?: string) => (s || "?").trim().charAt(0).toUpperCase() || "?";

function FlipSlot({ num, insc, teamsMap }: { num: number; insc: InscritoLite; teamsMap?: TeamsMap }) {
  const confirmed = insc.status === "aprovado" || insc.status === "pago";
  const roster = rosterOf(insc, teamsMap);
  return (
    <div className="cmp-slot filled flip">
      <span className="cmp-num">{String(num).padStart(2, "0")}</span>
      <div className="cmp-flip-inner">
        <div className="cmp-face front">
          <div className="cmp-logo">
            {insc.logo_url ? <img src={insc.logo_url} alt="" /> : initialOf(insc.team_tag || insc.team_name)}
          </div>
          <div className="cmp-nm">{insc.team_name}</div>
          <div className={`cmp-st ${confirmed ? "ok" : "pend"}`}><i></i>{confirmed ? "Confirmado" : "Pendente"}</div>
          <span className="cmp-hint">↻ ver line</span>
        </div>
        <div className="cmp-face back">
          {insc.team_id ? (
            <Link href={`/times/${insc.team_id}`} className="cmp-bkh">
              <span className="lg">{insc.logo_url ? <img src={insc.logo_url} alt="" /> : initialOf(insc.team_tag || insc.team_name)}</span>
              <span className="nm">{insc.team_name}</span>
              <span className="cnt">{roster.length}</span>
            </Link>
          ) : (
            <div className="cmp-bkh">
              <span className="lg">{insc.logo_url ? <img src={insc.logo_url} alt="" /> : initialOf(insc.team_tag || insc.team_name)}</span>
              <span className="nm">{insc.team_name}</span>
              <span className="cnt">{roster.length}</span>
            </div>
          )}
          <div className="cmp-roster">
            {roster.map((p) => (
              <Link key={p.steam_id} href={`/perfil/${p.steam_id}`} className={p.cap ? "cap-row" : ""}>
                <span className="av"><img src={`/api/steam/avatar-image/${p.steam_id}`} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />{initialOf(p.name)}</span>
                <span className="pn">{p.name}</span>
                {p.cap && <span className="cap">★ CAP</span>}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LobbyTeams({ inscritos, teamsMap }: { inscritos: InscritoLite[]; teamsMap: TeamsMap }) {
  // Fallback: inscrições antigas sem team_id resolvem o time pelo nome (G5API)
  const nameToId: Record<string, number> = {};
  for (const [tid, t] of Object.entries(teamsMap)) {
    const n = (t.name || "").trim().toLowerCase();
    if (n && !(n in nameToId)) nameToId[n] = Number(tid);
  }
  const resolve = (i: InscritoLite): InscritoLite =>
    i.team_id ? i : { ...i, team_id: nameToId[(i.team_name || "").trim().toLowerCase()] ?? null };
  const SLOTS = 8;
  const slots = Array.from({ length: SLOTS }, (_, i) => inscritos[i] ? resolve(inscritos[i]) : null);
  return (
    <>
      <style>{LOBBY_CSS}</style>
      <div className="cmp-slotgrid">
        {slots.map((insc, i) => insc ? (
          <FlipSlot key={i} num={i + 1} insc={insc} teamsMap={teamsMap} />
        ) : (
          <div key={i} className="cmp-slot empty">
            <span className="cmp-num">{String(i + 1).padStart(2, "0")}</span>
            <div className="cmp-logo">+</div>
            <div className="cmp-nm">Vaga aberta</div>
          </div>
        ))}
      </div>
    </>
  );
}

// Overview full-width do estado pendente (lobby) — layout "Mix"
function MixLobby({ tournament, inscritos, teamsMap }: { tournament: Tournament; inscritos: InscritoLite[]; teamsMap: TeamsMap }) {
  const filled = inscritos.length;
  const fmtD = (d?: string | null) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }) : "—";
  return (
    <div className="space-y-4">
      <style>{LOBBY_CSS}</style>

      {/* Lobby + Evento */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <HudCard className="p-5 h-full" label="LOBBY DO CAMPEONATO">
            <div className="text-center py-6">
              <div className="font-[family-name:var(--font-russo)] text-2xl sm:text-3xl tracking-wider text-orbital-text">INSCRIÇÕES ABERTAS</div>
              <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-2">O bracket é montado quando o lobby fechar (8 times).</p>
              <div className="max-w-md mx-auto mt-5">
                <div className="flex justify-between font-[family-name:var(--font-jetbrains)] text-[0.6rem] tracking-wider uppercase text-orbital-text-dim mb-2">
                  <span>Vagas preenchidas</span><span>{filled} / 8</span>
                </div>
                <div className="flex gap-[3px] h-2.5">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <span key={i} className={`flex-1 ${i < filled ? "bg-gradient-to-r from-orbital-purple to-orbital-purple-bright" : "bg-white/[0.06]"}`} />
                  ))}
                </div>
              </div>
              <Link href="/inscricao" className="inline-block mt-6 px-7 py-3 bg-orbital-purple text-orbital-bg hover:bg-orbital-purple-bright transition-all font-[family-name:var(--font-russo)] text-[0.62rem] tracking-wider">
                INSCREVER TIME →
              </Link>
            </div>
          </HudCard>
        </div>
        <HudCard className="p-5" label="EVENTO">
          <div className="cmp-kv mt-1">
            <div><div className="k">Datas</div><div className="v">{fmtD(tournament.start_date)}{tournament.end_date ? ` — ${fmtD(tournament.end_date)}` : ""}</div></div>
            <div><div className="k">Formato</div><div className="v">Eliminação Dupla</div></div>
            {tournament.location && <div><div className="k">Local</div><div className="v">{tournament.location}</div></div>}
            <div><div className="k">Progresso</div><div className="v">0 / 0 partidas</div></div>
          </div>
        </HudCard>
      </div>

      {/* Times no lobby (flip) */}
      <HudCard className="p-5" label={`TIMES NO LOBBY · ${filled}/8`}>
        <LobbyTeams inscritos={inscritos} teamsMap={teamsMap} />
      </HudCard>

      {/* Map pool — cards */}
      <HudCard className="p-5" label={`MAP POOL · ${tournament.map_pool.length} MAPAS`}>
        <div className="cmp-mapgrid mt-1">
          {tournament.map_pool.map(map => (
            <div key={map} className="cmp-mp">
              {MAP_IMAGES[map] && <img src={MAP_IMAGES[map]} alt={map} />}
              <span>{map.replace("de_", "")}</span>
            </div>
          ))}
        </div>
      </HudCard>
    </div>
  );
}

export function CampeonatoContent({ id, initialTournament, initialTeamsMap, initialMapScores, inscritos = [] }: CampeonatoContentProps) {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(initialTournament);
  const [loading, setLoading] = useState(!initialTournament);
  const [vetoMatch, setVetoMatch] = useState<BracketMatch | null>(null);
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [vetoFirstTeam, setVetoFirstTeam] = useState<"team1" | "team2" | null>(null);
  const [teamsMap, setTeamsMap] = useState<TeamsMap>(initialTeamsMap);
  const [mapScoresMap, setMapScoresMap] = useState<MapScoresMap>(initialMapScores);
  const [mvp, setMvp] = useState<{ name: string; steamId: string; rating: number; kills: number; deaths: number; hs_percent: number } | null>(null);
  const [hlPage, setHlPage] = useState(1);
  const HL_PER_PAGE = 6;
  const [matchPage, setMatchPage] = useState(1);
  const MATCHES_PER_PAGE = 8;
  const [rankPage, setRankPage] = useState(1);
  const RANK_PER_PAGE = 10;
  const bracketRef = useRef<HTMLDivElement>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Partidas tab state
  const [seasonMatches, setSeasonMatches] = useState<Match[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  // Ranking tab state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);

  // Highlights tab state
  const [highlights, setHighlights] = useState<HighlightClip[]>([]);
  const [highlightsLoading, setHighlightsLoading] = useState(false);

  // Awards
  const [awards, setAwards] = useState<Award[]>([]);

  const fetchTournament = useCallback(async () => {
    try {
      const res = await fetch("/api/tournaments");
      const data = await res.json();
      const t = (data.tournaments || []).find((t: Tournament) => t.id === id);
      if (t) {
        setTournament(t);
        // Fetch MVP immediately if finished
        if (t.status === "finished" && t.season_id) {
          try {
            const lbRes = await fetch(`/api/leaderboard/players?season_id=${t.season_id}`);
            const lbData = await lbRes.json();
            const lb = lbData.leaderboard || [];
            const sorted = [...lb].sort((a: Record<string, number>, b: Record<string, number>) => (b.average_rating || 0) - (a.average_rating || 0));
            if (sorted[0]) {
              const p = sorted[0];
              setMvp({
                name: p.name || p.steam_name || "Unknown",
                steamId: p.steamId || p.steam_id || "",
                rating: p.average_rating || 0,
                kills: p.kills || 0,
                deaths: p.deaths || 0,
                hs_percent: Math.round(p.hsp || 0),
              });
            }
          } catch { /* */ }
        }
      }
    } catch { /* */ }
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchTournament(); }, [fetchTournament]);

  // Fetch teams for logos
  useEffect(() => {
    getTeams().then(r => {
      const map: TeamsMap = {};
      (r.teams || []).forEach((t: { id: number; name: string; logo: string | null; auth_name?: Record<string, string | { name: string; captain?: number }> }) => {
        const players = t.auth_name ? Object.entries(t.auth_name).map(([steamId, val]) => ({
          steamId,
          name: typeof val === "string" ? val : val.name,
          captain: typeof val === "string" ? 0 : (val.captain || 0),
        })) : [];
        map[t.id] = { name: t.name, logo: t.logo, players };
      });
      setTeamsMap(map);
    }).catch(() => {});
  }, []);

  // Fetch map scores for bracket display
  useEffect(() => {
    if (!tournament) return;
    const matchIds = tournament.matches.filter(m => m.match_id && m.status === "finished").map(m => m.match_id!);
    if (matchIds.length === 0) return;

    Promise.all(matchIds.map(async (mid) => {
      try {
        const raw = await getMapStats(mid) as Record<string, unknown>;
        const stats = parseMapStats(raw);
        return { mid, stats };
      } catch { return { mid, stats: [] as { team1_score: number; team2_score: number; map_name: string }[] }; }
    })).then(results => {
      const map: MapScoresMap = {};
      for (const r of results) {
        if (r.stats.length > 0) {
          map[r.mid] = r.stats.map(s => ({ team1_score: s.team1_score, team2_score: s.team2_score, map_name: s.map_name }));
        }
      }
      setMapScoresMap(map);
    });
  }, [tournament]);

  // Auto-advance: poll live G5API matches for completion
  const tournamentRef = useRef(tournament);
  tournamentRef.current = tournament;

  const hasLiveMatches = tournament?.status !== "finished" && tournament?.matches.some(m => m.status === "live" && m.match_id);

  useEffect(() => {
    // Auto-advance "movido pela torcida" (como no Cup #1), mas seguro: qualquer
    // visitante com a página aberta só APERTA A CAMPAINHA — quem confere o
    // placar no G5API e salva o bracket é o SERVIDOR (/api/tournaments/advance),
    // sem aceitar dado nenhum do cliente. Não exige admin nem aba do admin aberta.
    if (!hasLiveMatches) return;

    const checkAutoAdvance = async () => {
      if (document.visibilityState === "hidden") return;
      const t = tournamentRef.current;
      if (!t || t.status === "finished") return;
      try {
        const res = await fetch("/api/tournaments/advance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tournamentId: t.id }),
        });
        const data = await res.json();
        if (Array.isArray(data.advanced) && data.advanced.length > 0) {
          await fetchTournament(); // bracket mudou no servidor → recarrega
        }
      } catch { /* rede oscilou; tenta no próximo tick */ }
    };

    const interval = setInterval(checkAutoAdvance, 10000);
    checkAutoAdvance();
    return () => clearInterval(interval);
  }, [hasLiveMatches]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isAdmin) {
      getServers().then(r => setServers(r.servers || [])).catch(() => {});
    }
  }, [isAdmin]);

  // Fetch season matches when PARTIDAS tab is activated
  useEffect(() => {
    if (activeTab !== "partidas" || !tournament?.season_id) return;
    setMatchesLoading(true);
    getMatches().then(r => {
      const filtered = (r.matches || []).filter(m => m.season_id === tournament.season_id);
      setSeasonMatches(filtered.sort((a, b) => {
        // Sort by start_time desc, nulls last
        if (!a.start_time && !b.start_time) return b.id - a.id;
        if (!a.start_time) return 1;
        if (!b.start_time) return -1;
        return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
      }));
    }).catch(() => {}).finally(() => setMatchesLoading(false));
  }, [activeTab, tournament?.season_id]);

  // Fetch awards for finished tournament
  useEffect(() => {
    if (!tournament || tournament.status !== "finished") return;
    const matchIds = tournament.matches.filter(m => m.match_id && m.status === "finished").map(m => m.match_id!);
    if (matchIds.length === 0) return;

    Promise.all(matchIds.map(mid => getPlayerStats(mid).then(r => {
      const raw = r as unknown as Record<string, unknown>;
      return ((raw.playerstats || raw.playerStats || []) as PlayerStats[]);
    }).catch(() => [] as PlayerStats[]))).then(results => {
      const allStats = results.flat();
      if (allStats.length > 0) setAwards(calculateAwards(allStats));
    });
  }, [tournament]);

  // Fetch ranking when RANKING tab is activated
  useEffect(() => {
    if (activeTab !== "ranking" || !tournament?.season_id) return;
    setRankingLoading(true);
    getLeaderboard(tournament.season_id).then(r => {
      setLeaderboard(r.leaderboard || []);
    }).catch(() => {}).finally(() => setRankingLoading(false));
  }, [activeTab, tournament?.season_id]);

  // Fetch highlights when HIGHLIGHTS tab is activated
  useEffect(() => {
    if (activeTab !== "highlights" || !tournament) return;
    const matchIds = tournament.matches.filter(m => m.match_id).map(m => m.match_id!);
    if (matchIds.length === 0) { setHighlights([]); return; }
    setHighlightsLoading(true);

    Promise.all(matchIds.map(async (mid) => {
      try {
        const res = await fetch(`/api/highlights/${mid}`);
        const data = await res.json();
        return (data.clips || []) as HighlightClip[];
      } catch { return [] as HighlightClip[]; }
    })).then(results => {
      const all = results.flat().filter(c => c.status === "ready" && c.video_file);
      all.sort((a, b) => b.score - a.score);
      setHighlights(all);
    }).finally(() => setHighlightsLoading(false));
  }, [activeTab, tournament]);

  const saveTournament = async (t: Tournament) => {
    setTournament(t);
    await fetch("/api/tournaments", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(t),
    });
  };

  const openVeto = (match: BracketMatch) => {
    setVetoMatch({ ...match, veto_actions: [] });
    setVetoFirstTeam(null);
  };

  const handleVetoBan = async (map: string) => {
    if (!vetoMatch || !tournament) return;

    const sequence = getVetoSequence(vetoMatch.num_maps);
    const teamOrder = getVetoTeamOrder(vetoMatch.num_maps, vetoFirstTeam === "team1");
    const stepIndex = vetoMatch.veto_actions.length;

    if (stepIndex >= sequence.length) return;

    const action = sequence[stepIndex];
    const teamIdx = teamOrder[stepIndex];
    const teamId = teamIdx === 0 ? vetoMatch.team1_id! : vetoMatch.team2_id!;

    const vetoAction: VetoAction = {
      team_id: teamId,
      team_name: getTeamName(tournament, teamId),
      action,
      map,
    };

    const updatedActions = [...vetoMatch.veto_actions, vetoAction];
    const updatedMatch = { ...vetoMatch, veto_actions: updatedActions };

    if (updatedActions.length >= sequence.length) {
      const usedMaps = updatedActions.map(a => a.map);
      const remaining = tournament.map_pool.filter(m => !usedMaps.includes(m));
      const picks = updatedActions.filter(a => a.action === "pick").map(a => a.map);

      if (vetoMatch.num_maps === 1) {
        updatedMatch.map = remaining[0];
        updatedMatch.status = "ready";
      } else {
        updatedMatch.maps = [...picks, remaining[0]];
        updatedMatch.status = "ready";
      }
    }

    setVetoMatch(updatedMatch);

    const updatedTournament = {
      ...tournament,
      matches: tournament.matches.map(m => m.id === updatedMatch.id ? updatedMatch : m),
    };
    await saveTournament(updatedTournament);
  };

  const handleStartMatch = async () => {
    if (!vetoMatch || !tournament || !selectedServer) return;
    setActionLoading(true);
    setMatchError(null);

    try {
      const maplist = vetoMatch.num_maps === 1
        ? [vetoMatch.map!]
        : vetoMatch.maps!;

      const result = await createMatch({
        team1_id: vetoMatch.team1_id!,
        team2_id: vetoMatch.team2_id!,
        server_id: parseInt(selectedServer),
        num_maps: vetoMatch.num_maps,
        max_maps: vetoMatch.num_maps,
        skip_veto: true,
        veto_first: "team1",
        side_type: "always_knife",
        players_per_team: 5,
        min_player_ready: 5,
        season_id: tournament.season_id || undefined,
        title: `${tournament.name} — ${vetoMatch.label}`,
        maplist,
        veto_mappool: maplist.join(" "),
        spectator_auths: tournament.spectator_auth ? { "0": tournament.spectator_auth } : undefined,
      });

      const updatedMatch = { ...vetoMatch, match_id: result.match.id, status: "live" as const };
      const updatedTournament = {
        ...tournament,
        status: "active" as const,
        current_match_id: vetoMatch.id,
        matches: tournament.matches.map(m => m.id === vetoMatch.id ? updatedMatch : m),
      };

      await saveTournament(updatedTournament);
      setMatchError(null);
      setVetoMatch(null);
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : "Erro ao criar partida");
    }
    setActionLoading(false);
  };

  const handleResetVeto = async () => {
    if (!vetoMatch || !tournament) return;
    if (!confirm("Resetar veto e voltar ao inicio?")) return;

    const resetMatch = { ...vetoMatch, veto_actions: [], map: null, maps: null, status: "pending" as const };
    const updatedTournament = {
      ...tournament,
      matches: tournament.matches.map(m => m.id === resetMatch.id ? resetMatch : m),
    };
    await saveTournament(updatedTournament);
    setVetoMatch(null);
    setMatchError(null);
  };

  const handleDeleteTournament = async () => {
    if (!tournament) return;
    if (!confirm(`Deletar campeonato "${tournament.name}"? Esta acao e irreversivel.`)) return;

    await fetch("/api/tournaments", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: tournament.id }),
    });
    router.push("/admin/campeonatos");
  };

  const handleSetWinner = async (matchId: string, winnerId: number) => {
    if (!tournament) return;
    const teamName = getTeamName(tournament, winnerId);
    if (!confirm(`Confirmar ${teamName} como vencedor?`)) return;

    const updated = advanceBracket(tournament, matchId, winnerId);
    await saveTournament(updated);
  };

  // ── Loading State ──
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-6">
        <div className="h-8 w-64 bg-orbital-border/30 rounded animate-pulse" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-8 w-24 bg-orbital-border/30 rounded animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-orbital-card border border-orbital-border rounded animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="h-16 bg-orbital-card border border-orbital-border rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ── Not Found ──
  if (!tournament) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <Trophy size={48} className="text-orbital-border mx-auto mb-4" />
        <p className="font-[family-name:var(--font-russo)] text-orbital-text-dim">
          Campeonato nao encontrado
        </p>
        <Link href="/admin/campeonatos" className="inline-flex items-center gap-2 mt-6 px-4 py-2 border border-orbital-border text-orbital-text-dim hover:text-orbital-purple hover:border-orbital-purple/30 transition-all font-[family-name:var(--font-russo)] text-xs">
          <ArrowLeft size={14} /> VOLTAR
        </Link>
      </div>
    );
  }

  const nextMatch = getNextPlayableMatch(tournament);
  const adminActions = isAdmin ? { isAdmin, onSetWinner: handleSetWinner, onStartVeto: openVeto } : undefined;

  const finishedCount = tournament.matches.filter(m => m.status === "finished").length;
  const liveCount = tournament.matches.filter(m => m.status === "live").length;
  const grandFinal = tournament.matches.find(m => m.bracket === "grand_final");
  const champion = tournament.status === "finished" && grandFinal?.winner_id
    ? getTeamName(tournament, grandFinal.winner_id)
    : null;
  const championLogo = tournament.status === "finished" && grandFinal?.winner_id
    ? teamsMap[grandFinal.winner_id]?.logo
    : null;

  const statusColor = tournament.status === "active" ? "text-[#EF4444]" : tournament.status === "finished" ? "text-[#22C55E]" : "text-[#EAB308]";
  const statusBorder = tournament.status === "active" ? "border-[#EF4444]/30" : tournament.status === "finished" ? "border-[#22C55E]/30" : "border-[#EAB308]/30";
  const statusLabel = tournament.status === "active" ? "AO VIVO" : tournament.status === "finished" ? "FINALIZADO" : "PENDENTE";

  return (
    <div className="cpv min-h-screen pb-20">
      <style>{CAMP_CSS}</style>
      {/* ════════════════ HERO BANNER ════════════════ */}
      <div className="relative overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img src="https://i.imgur.com/0irj00x.jpeg" alt="" className="w-full h-full object-cover opacity-15" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1B0F23] via-[#1B0F23]/80 to-[#1B0F23]" />
        </div>
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-orbital-purple/40 to-transparent" />

        <div className="relative w-full px-4 sm:px-6 lg:px-10 xl:px-16 pt-8 pb-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Back + Status Row */}
            <div className="flex items-center gap-3 mb-4">
              <Link href="/admin/campeonatos" className="text-orbital-text-dim hover:text-orbital-purple transition-colors">
                <ArrowLeft size={16} />
              </Link>
              <span className={`font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.2em] px-3 py-1 border ${statusColor} ${statusBorder} uppercase`}>
                {statusLabel}
              </span>
              {tournament.status === "active" && liveCount > 0 && (
                <span className="flex items-center gap-1.5 font-[family-name:var(--font-russo)] text-[0.65rem] text-[#EF4444]">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                  {liveCount} PARTIDA{liveCount > 1 ? "S" : ""} AO VIVO
                </span>
              )}
              {isAdmin && (
                <button
                  onClick={handleDeleteTournament}
                  className="ml-auto p-2 text-orbital-text-dim hover:text-red-500 transition-colors"
                  title="Deletar campeonato"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Tournament Name */}
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 border border-orbital-purple/30 bg-orbital-purple/10 flex items-center justify-center shrink-0">
                <Trophy size={24} className="text-orbital-purple" />
              </div>
              <div>
                <h1 className="font-[family-name:var(--font-russo)] text-2xl sm:text-3xl font-bold tracking-wider text-orbital-text">
                  {tournament.name}
                </h1>
                <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-0.5">
                  {tournament.format === "double_elimination" ? "Eliminacao Dupla" : tournament.format || "Eliminacao Dupla"} — {tournament.teams.length || inscritos.length} times — {finishedCount}/{tournament.matches.length} partidas
                </p>
              </div>
            </div>

            {/* Info Pills */}
            <div className="flex flex-wrap gap-3 mt-4">
              {tournament.start_date && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-orbital-border">
                  <Calendar size={12} className="text-orbital-purple" />
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                    {new Date(tournament.start_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    {tournament.end_date && ` — ${new Date(tournament.end_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}`}
                  </span>
                </div>
              )}
              {tournament.prize_pool && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-orbital-border">
                  <DollarSign size={12} className="text-orbital-purple" />
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{tournament.prize_pool}</span>
                </div>
              )}
              {tournament.location && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-orbital-border">
                  <MapPin size={12} className="text-orbital-purple" />
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{tournament.location}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-orbital-border">
                <Users size={12} className="text-orbital-purple" />
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{tournament.teams.length || inscritos.length} Times</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.03] border border-orbital-border">
                <Layers size={12} className="text-orbital-purple" />
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{tournament.map_pool.length} Mapas</span>
              </div>
              {tournament.status === "finished" && (
                <Link
                  href={`/campeonato/${tournament.id}/recap`}
                  className="flex items-center gap-2 px-3 py-1.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 hover:bg-orbital-purple/20 transition-all font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider text-orbital-purple"
                >
                  <BarChart3 size={12} /> RECAP
                </Link>
              )}
            </div>
          </motion.div>
        </div>
        {/* Bottom border */}
        <div className="h-[1px] bg-gradient-to-r from-transparent via-orbital-purple/30 to-transparent" />
      </div>

      {/* ════════════════ TAB NAVIGATION ════════════════ */}
      <div className="sticky top-0 z-30 bg-orbital-bg/95 backdrop-blur-sm border-b border-orbital-border">
        <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16">
          <div className="flex gap-0 overflow-x-auto scrollbar-none" role="tablist" aria-label="Seções do campeonato">
            {TABS.map(tab => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-5 py-3 font-[family-name:var(--font-russo)] text-[0.6rem] tracking-[0.2em] transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "text-orbital-purple"
                    : "text-orbital-text-dim hover:text-orbital-text"
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-orbital-purple"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ════════════════ MAIN CONTENT ════════════════ */}
      <div className="w-full px-4 sm:px-6 lg:px-10 xl:px-16 mt-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ─── Left / Main Column ─── */}
          <div className="flex-1 min-w-0">
            <AnimatePresence mode="wait">
              {/* ═══ OVERVIEW TAB ═══ */}
              {activeTab === "overview" && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  {tournament.matches.length === 0 ? (
                    <MixLobby tournament={tournament} inscritos={inscritos} teamsMap={teamsMap} />
                  ) : (
                  <>
                  {/* Champion Banner */}
                  {champion && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative overflow-hidden border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6"
                    >
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-amber-500/60 via-amber-500/30 to-transparent" />
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-500/70" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-500/70" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-500/70" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-500/70" />
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 flex items-center justify-center shrink-0">
                          {championLogo ? (
                            <Image src={championLogo} alt={champion} width={56} height={56} className="object-contain" unoptimized />
                          ) : (
                            <Crown size={36} className="text-amber-500" />
                          )}
                        </div>
                        <div>
                          <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.3em] text-amber-500/80 mb-1">CAMPEAO</div>
                          <div className="font-[family-name:var(--font-russo)] text-xl font-bold tracking-wider text-amber-400">{champion}</div>
                          {grandFinal?.winner_id && (() => {
                            // roster da EDIÇÃO (inscrição) quando existe; senão o clube (Cup #1, pré-inscrições)
                            const winInsc = inscritos.find(i => i.team_id === grandFinal.winner_id);
                            const names = winInsc
                              ? rosterOf(winInsc, teamsMap).map(p => p.name)
                              : (teamsMap[grandFinal.winner_id]?.players || []).map(p => p.name);
                            return names.length > 0 ? (
                              <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-amber-500/60 mt-1">
                                {names.join(" • ")}
                              </div>
                            ) : null;
                          })()}
                        </div>
                        <Trophy size={32} className="ml-auto text-amber-500/30" />
                      </div>
                    </motion.div>
                  )}

                  {/* MVP Banner */}
                  {mvp && tournament.status === "finished" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="relative overflow-hidden border border-red-500/30 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent p-5"
                    >
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-red-500/60 via-red-500/30 to-transparent" />
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-500/70" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-red-500/70" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-red-500/70" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-500/70" />
                      <div className="flex items-center gap-4">
                        <Star size={28} className="text-red-500 shrink-0" />
                        <div>
                          <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.3em] text-red-500/80 mb-1">MVP DO CAMPEONATO</div>
                          <Link href={`/perfil/${mvp.steamId}`} className="font-[family-name:var(--font-russo)] text-lg font-bold tracking-wider text-red-400 hover:text-red-300 transition-colors">
                            {mvp.name}
                          </Link>
                          <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-1">
                            Rating {mvp.rating.toFixed(2)} &nbsp; {mvp.kills}K / {mvp.deaths}D &nbsp; HS {mvp.hs_percent}%
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Next Match Banner (Admin) */}
                  {isAdmin && nextMatch && !vetoMatch && (
                    <div className="bg-orbital-purple/5 border border-orbital-purple/30 p-4 flex items-center justify-between">
                      <div>
                        <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.2em] text-orbital-purple mb-1">PROXIMA PARTIDA</div>
                        <div className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text">
                          {getTeamName(tournament, nextMatch.team1_id)} <span className="text-orbital-text-dim">vs</span> {getTeamName(tournament, nextMatch.team2_id)}
                        </div>
                        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mt-0.5">
                          {nextMatch.label} — {nextMatch.num_maps === 1 ? "BO1" : "BO3"}
                        </div>
                      </div>
                      <button
                        onClick={() => openVeto(nextMatch)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-orbital-purple/20 border border-orbital-purple/50 hover:bg-orbital-purple/30 transition-all font-[family-name:var(--font-russo)] text-[0.6rem] tracking-wider text-orbital-purple"
                      >
                        <Swords size={14} /> INICIAR VETO
                      </button>
                    </div>
                  )}

                  {/* Classificação (Standings) */}
                  {(() => {
                    const finishedBracketMatches = tournament.matches.filter(m => m.status === "finished" && m.winner_id);
                    if (finishedBracketMatches.length === 0) return null;

                    const standingsMap: Record<number, { teamId: number; wins: number; losses: number; mapWins: number; mapLosses: number; placement: number }> = {};

                    const ensureTeam = (tid: number) => {
                      if (!standingsMap[tid]) standingsMap[tid] = { teamId: tid, wins: 0, losses: 0, mapWins: 0, mapLosses: 0, placement: 99 };
                    };

                    for (const m of finishedBracketMatches) {
                      if (!m.team1_id || !m.team2_id || !m.winner_id) continue;
                      ensureTeam(m.team1_id);
                      ensureTeam(m.team2_id);

                      const loserId = m.winner_id === m.team1_id ? m.team2_id : m.team1_id;
                      standingsMap[m.winner_id].wins++;
                      standingsMap[loserId].losses++;

                      // Map scores from mapScoresMap
                      if (m.match_id && mapScoresMap[m.match_id]) {
                        const maps = mapScoresMap[m.match_id];
                        for (const ms of maps) {
                          standingsMap[m.team1_id].mapWins += ms.team1_score;
                          standingsMap[m.team1_id].mapLosses += ms.team2_score;
                          standingsMap[m.team2_id].mapWins += ms.team2_score;
                          standingsMap[m.team2_id].mapLosses += ms.team1_score;
                        }
                      }
                    }

                    // Also ensure teams with no finished matches appear
                    for (const team of tournament.teams) {
                      ensureTeam(team.id);
                    }

                    // Double elimination placement based on bracket position
                    // 1st = GF winner, 2nd = GF loser, 3rd = LF loser, 4th = LR3 loser
                    // 5-6th = LR2 losers, 7-8th = LR1 losers
                    const placementMap: Record<string, number> = {
                      "GF": 2,       // GF loser = 2nd
                      "LF": 3,       // LF loser = 3rd
                      "LR3": 4,      // LR3 loser = 4th (lower SF)
                      "LR2-A": 5, "LR2-B": 5,  // LR2 losers = 5-6th
                      "LR1-A": 7, "LR1-B": 7,  // LR1 losers = 7-8th
                    };

                    // GF winner = 1st
                    const gfMatch = tournament.matches.find(m => m.id === "GF");
                    if (gfMatch?.winner_id && standingsMap[gfMatch.winner_id]) {
                      standingsMap[gfMatch.winner_id].placement = 1;
                    }

                    // Set placements for losers of each bracket match
                    for (const m of finishedBracketMatches) {
                      if (!m.winner_id || !m.team1_id || !m.team2_id) continue;
                      const loserId = m.winner_id === m.team1_id ? m.team2_id : m.team1_id;
                      const place = placementMap[m.id];
                      if (place && standingsMap[loserId]) {
                        standingsMap[loserId].placement = place;
                      }
                    }

                    const sorted = Object.values(standingsMap).sort((a, b) => {
                      // Sort by placement first (lower = better)
                      if (a.placement !== b.placement) return a.placement - b.placement;
                      // Then by wins desc, map diff desc
                      if (b.wins !== a.wins) return b.wins - a.wins;
                      return (b.mapWins - b.mapLosses) - (a.mapWins - a.mapLosses);
                    });

                    const isChampion = (tid: number) => tournament.status === "finished" && grandFinal?.winner_id === tid;

                    return (
                      <HudCard className="p-5" label="CLASSIFICAÇÃO">
                        <div className="overflow-x-auto mt-2">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-orbital-border">
                                <th className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2 w-8">#</th>
                                <th className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2">TIME</th>
                                <th className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2 text-center">J</th>
                                <th className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2 text-center">V</th>
                                <th className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2 text-center">D</th>
                                <th className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2 text-center">MW</th>
                                <th className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2 text-center">ML</th>
                                <th className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.15em] text-orbital-text-dim py-2 px-2 text-center">+/−</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sorted.map((s, i) => {
                                const teamData = teamsMap[s.teamId];
                                const teamName = teamData?.name || tournament.teams.find(t => t.id === s.teamId)?.name || "TBD";
                                const mapDiff = s.mapWins - s.mapLosses;
                                const isTop = i === 0;
                                const champ = isChampion(s.teamId);

                                return (
                                  <tr
                                    key={s.teamId}
                                    className={`border-b border-orbital-border/30 transition-colors hover:bg-white/[0.02] ${isTop ? "border-l-2 border-l-amber-500" : ""}`}
                                  >
                                    <td className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim py-2.5 px-2">
                                      {i + 1}
                                    </td>
                                    <td className="py-2.5 px-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                          {teamData?.logo ? (
                                            <Image src={teamData.logo} alt={teamName} width={20} height={20} className="object-contain" unoptimized />
                                          ) : (
                                            <Shield size={12} className="text-orbital-text-dim/60" />
                                          )}
                                        </div>
                                        <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text truncate">
                                          {teamName}
                                        </span>
                                        {champ && <Trophy size={12} className="text-amber-500 shrink-0" />}
                                      </div>
                                    </td>
                                    <td className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim py-2.5 px-2 text-center">
                                      {s.wins + s.losses}
                                    </td>
                                    <td className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-emerald-400 py-2.5 px-2 text-center">
                                      {s.wins}
                                    </td>
                                    <td className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-red-400 py-2.5 px-2 text-center">
                                      {s.losses}
                                    </td>
                                    <td className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim py-2.5 px-2 text-center">
                                      {s.mapWins}
                                    </td>
                                    <td className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim py-2.5 px-2 text-center">
                                      {s.mapLosses}
                                    </td>
                                    <td className={`font-[family-name:var(--font-jetbrains)] text-[0.65rem] font-bold py-2.5 px-2 text-center ${
                                      mapDiff > 0 ? "text-emerald-400" : mapDiff < 0 ? "text-red-400" : "text-orbital-text-dim"
                                    }`}>
                                      {mapDiff > 0 ? `+${mapDiff}` : mapDiff}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </HudCard>
                    );
                  })()}

                  {/* Bracket or Swiss Standings */}
                  {tournament.format === "swiss" ? (
                    <SwissStandingsView tournament={tournament} teamsMap={teamsMap} mapScoresMap={mapScoresMap} />
                  ) : tournament.matches.length === 0 ? (
                    <HudCard className="p-5" label="LOBBY DO CAMPEONATO">
                      <div className="text-center py-6">
                        <div className="font-[family-name:var(--font-russo)] text-2xl tracking-wider text-orbital-text">INSCRIÇÕES ABERTAS</div>
                        <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-2">O bracket é montado quando o lobby fechar (8 times).</p>
                        <div className="max-w-sm mx-auto mt-5">
                          <div className="flex justify-between font-[family-name:var(--font-jetbrains)] text-[0.6rem] tracking-wider uppercase text-orbital-text-dim mb-2">
                            <span>Vagas preenchidas</span><span>{inscritos.length} / 8</span>
                          </div>
                          <div className="flex gap-[3px] h-2">
                            {Array.from({ length: 8 }).map((_, i) => (
                              <span key={i} className={`flex-1 ${i < inscritos.length ? "bg-gradient-to-r from-orbital-purple to-orbital-purple-bright" : "bg-white/[0.06]"}`} />
                            ))}
                          </div>
                        </div>
                        <Link href="/inscricao" className="inline-block mt-6 px-6 py-2.5 bg-orbital-purple text-orbital-bg hover:bg-orbital-purple-bright transition-all font-[family-name:var(--font-russo)] text-[0.6rem] tracking-wider">
                          INSCREVER TIME →
                        </Link>
                      </div>
                    </HudCard>
                  ) : (
                    <HudCard className="p-5 overflow-hidden" label="BRACKET">
                      <p className="lg:hidden font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim mb-2">← Arraste pra navegar →</p>
                      <div ref={bracketRef} className="overflow-x-auto">
                        <FullBracket
                          tournament={tournament}
                          teamsMap={teamsMap}
                          mapScoresMap={mapScoresMap}
                          admin={adminActions}
                        />
                      </div>
                      <div className="text-center mt-4">
                        <BracketExportButton bracketRef={bracketRef} tournamentName={tournament.name} />
                      </div>
                    </HudCard>
                  )}

                  {/* Awards */}
                  {awards.length > 0 && (
                    <HudCard className="p-5" label="AWARDS">
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                        {awards.map((award) => (
                          <Link
                            key={award.id}
                            href={`/perfil/${award.steamId}`}
                            className="bg-orbital-bg border border-orbital-border hover:border-orbital-purple/40 p-3 text-center transition-colors group"
                          >
                            <div className="text-2xl mb-1">{award.emoji}</div>
                            <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.15em] text-orbital-purple mb-1">
                              {award.title}
                            </div>
                            <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text group-hover:text-orbital-purple transition-colors truncate">
                              {award.playerName}
                            </div>
                            <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim mt-0.5">
                              {award.value}
                            </div>
                          </Link>
                        ))}
                      </div>
                    </HudCard>
                  )}

                  {/* Teams Grid */}
                  <HudCard className="p-5" label="TIMES PARTICIPANTES">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-2">
                      {tournament.teams.map((team, i) => {
                        const teamData = teamsMap[team.id];
                        return (
                          <Link key={team.id} href={`/times/${team.id}`}>
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="flex items-center gap-3 p-3 bg-white/[0.02] border border-orbital-border hover:border-orbital-purple/30 transition-colors group cursor-pointer"
                          >
                            <div className="w-8 h-8 flex items-center justify-center shrink-0">
                              {teamData?.logo ? (
                                <Image src={teamData.logo} alt={team.name} width={28} height={28} className="object-contain" unoptimized />
                              ) : (
                                <Shield size={18} className="text-orbital-text-dim/60" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text truncate group-hover:text-orbital-purple transition-colors">
                                {team.name}
                              </div>
                              {grandFinal?.winner_id === team.id && (
                                <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider text-amber-500">CAMPEÃO</div>
                              )}
                            </div>
                          </motion.div>
                          </Link>
                        );
                      })}
                    </div>
                  </HudCard>
                  </>
                  )}
                </motion.div>
              )}

              {/* ═══ PARTIDAS TAB ═══ */}
              {activeTab === "partidas" && (
                <motion.div
                  key="partidas"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {!tournament.season_id ? (
                    <HudCard className="text-center py-12">
                      <Swords size={24} className="text-orbital-border mx-auto mb-3" />
                      <p className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text-dim">
                        Nenhuma season vinculada a este campeonato
                      </p>
                    </HudCard>
                  ) : matchesLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 size={24} className="text-orbital-purple animate-spin" />
                    </div>
                  ) : seasonMatches.length === 0 ? (
                    <HudCard className="text-center py-12">
                      <Swords size={24} className="text-orbital-border mx-auto mb-3" />
                      <p className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text-dim">
                        Nenhuma partida registrada
                      </p>
                    </HudCard>
                  ) : (
                    <div className="space-y-4">
                      {(() => {
                        const bracketInfo: Record<number, BracketMatch> = {};
                        tournament.matches.forEach(bm => { if (bm.match_id) bracketInfo[bm.match_id] = bm; });

                        // Flat list with phase labels
                        const allItems: { match: Match; bm?: BracketMatch; phase: string }[] = [];
                        const seenPhases = new Set<string>();
                        seasonMatches.forEach(m => {
                          const bm = bracketInfo[m.id];
                          allItems.push({ match: m, bm, phase: bm?.label || "Outras" });
                        });

                        const paged = allItems.slice((matchPage - 1) * MATCHES_PER_PAGE, matchPage * MATCHES_PER_PAGE);
                        let lastPhase = "";

                        return (
                          <>
                            {paged.map(({ match, bm, phase }) => {
                              const isLive = !match.end_time && !!match.start_time && !match.cancelled;
                              const isFinished = !!match.end_time && !match.cancelled;
                              const t1Logo = match.team1_id ? teamsMap[match.team1_id]?.logo : null;
                              const t2Logo = match.team2_id ? teamsMap[match.team2_id]?.logo : null;
                              const showPhase = phase !== lastPhase;
                              if (showPhase) { lastPhase = phase; seenPhases.add(phase); }

                              return (
                                <div key={match.id}>
                                  {showPhase && (
                                    <div className="flex items-center gap-2 mb-3 mt-2">
                                      <div className="h-[1px] w-4 bg-orbital-purple/40" />
                                      <span className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.2em] text-orbital-purple">{phase}</span>
                                      <div className="h-[1px] flex-1 bg-orbital-purple/15" />
                                    </div>
                                  )}
                                  <Link href={`/partidas/${match.id}`} className="block group">
                                    <div className={`relative overflow-hidden border transition-all p-4 ${
                                      isLive ? "bg-red-500/5 border-red-500/30 hover:border-red-500/50" :
                                      isFinished ? "bg-white/[0.02] border-orbital-border hover:border-orbital-purple/30" :
                                      "bg-white/[0.01] border-orbital-border/50 hover:border-orbital-border"
                                    }`}>
                                      {/* Corner accents */}
                                      <div className={`absolute top-0 left-0 w-3 h-3 border-t border-l ${isLive ? "border-red-500/50" : "border-orbital-purple/20"}`} />
                                      <div className={`absolute top-0 right-0 w-3 h-3 border-t border-r ${isLive ? "border-red-500/50" : "border-orbital-purple/20"}`} />
                                      <div className={`absolute bottom-0 left-0 w-3 h-3 border-b border-l ${isLive ? "border-red-500/50" : "border-orbital-purple/20"}`} />
                                      <div className={`absolute bottom-0 right-0 w-3 h-3 border-b border-r ${isLive ? "border-red-500/50" : "border-orbital-purple/20"}`} />

                                      <div className="flex items-center gap-4">
                                        {/* Status */}
                                        <div className="shrink-0 w-12 text-center">
                                          {isLive ? (
                                            <span className="inline-flex items-center gap-1 font-[family-name:var(--font-russo)] text-[0.65rem] text-red-500">
                                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
                                              LIVE
                                            </span>
                                          ) : isFinished ? (
                                            <span className="font-[family-name:var(--font-russo)] text-[0.65rem] text-emerald-500/70">FIM</span>
                                          ) : (
                                            <span className="font-[family-name:var(--font-russo)] text-[0.65rem] text-yellow-500/70">TBD</span>
                                          )}
                                          {bm && (
                                            <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider text-orbital-purple/60 mt-0.5">
                                              {bm.num_maps === 1 ? "BO1" : "BO3"}
                                            </div>
                                          )}
                                        </div>

                                        {/* Team 1 */}
                                        <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                                          <span className={`font-[family-name:var(--font-jetbrains)] text-sm truncate ${
                                            isFinished && match.winner === match.team1_id ? "text-orbital-text font-bold" : "text-orbital-text-dim"
                                          }`}>
                                            {match.team1_string || "TBD"}
                                          </span>
                                          <div className="w-7 h-7 flex items-center justify-center shrink-0">
                                            {t1Logo ? <Image src={t1Logo} alt="" width={24} height={24} className="object-contain" unoptimized /> : <Shield size={14} className="text-orbital-text-dim/50" />}
                                          </div>
                                        </div>

                                        {/* Score */}
                                        <div className="flex flex-col items-center shrink-0 px-3">
                                          {isFinished && mapScoresMap[match.id]?.length > 0 ? (
                                            <div className="flex items-center gap-0">
                                              {mapScoresMap[match.id].map((ms, mi) => (
                                                <div key={mi} className="flex items-center">
                                                  {mi > 0 && <div className="w-[1px] h-6 bg-orbital-border/40 mx-2" />}
                                                  <div className="text-center px-1.5">
                                                    <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.15em] text-orbital-purple/50 uppercase mb-0.5">
                                                      {ms.map_name?.replace("de_", "") || `M${mi + 1}`}
                                                    </div>
                                                    <div className="flex items-center justify-center gap-1">
                                                      <span className={`font-[family-name:var(--font-jetbrains)] text-base font-bold tabular-nums ${
                                                        ms.team1_score > ms.team2_score ? "text-emerald-400" : "text-orbital-text-dim/60"
                                                      }`}>{ms.team1_score}</span>
                                                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim/50">:</span>
                                                      <span className={`font-[family-name:var(--font-jetbrains)] text-base font-bold tabular-nums ${
                                                        ms.team2_score > ms.team1_score ? "text-emerald-400" : "text-orbital-text-dim/60"
                                                      }`}>{ms.team2_score}</span>
                                                    </div>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-1.5">
                                              <span className={`font-[family-name:var(--font-jetbrains)] text-xl font-bold ${
                                                isFinished && match.team1_score > match.team2_score ? "text-emerald-400" : "text-orbital-text-dim"
                                              }`}>{isFinished || isLive ? match.team1_score : "-"}</span>
                                              <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim/50">:</span>
                                              <span className={`font-[family-name:var(--font-jetbrains)] text-xl font-bold ${
                                                isFinished && match.team2_score > match.team1_score ? "text-emerald-400" : "text-orbital-text-dim"
                                              }`}>{isFinished || isLive ? match.team2_score : "-"}</span>
                                            </div>
                                          )}
                                        </div>

                                        {/* Team 2 */}
                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                          <div className="w-7 h-7 flex items-center justify-center shrink-0">
                                            {t2Logo ? <Image src={t2Logo} alt="" width={24} height={24} className="object-contain" unoptimized /> : <Shield size={14} className="text-orbital-text-dim/50" />}
                                          </div>
                                          <span className={`font-[family-name:var(--font-jetbrains)] text-sm truncate ${
                                            isFinished && match.winner === match.team2_id ? "text-orbital-text font-bold" : "text-orbital-text-dim"
                                          }`}>
                                            {match.team2_string || "TBD"}
                                          </span>
                                        </div>

                                        {/* Date + arrow */}
                                        <div className="shrink-0 text-right hidden sm:flex items-center gap-2">
                                          {match.start_time && (
                                            <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim/60">
                                              {new Date(match.start_time).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" })}
                                            </span>
                                          )}
                                          <ChevronRight size={14} className="text-orbital-text-dim/50 group-hover:text-orbital-purple transition-colors" />
                                        </div>
                                      </div>
                                    </div>
                                  </Link>
                                </div>
                              );
                            })}

                            {/* Pagination */}
                            {allItems.length > MATCHES_PER_PAGE && (
                              <div className="flex items-center justify-center gap-2 pt-2">
                                {Array.from({ length: Math.ceil(allItems.length / MATCHES_PER_PAGE) }, (_, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setMatchPage(i + 1)}
                                    className={`w-8 h-8 font-[family-name:var(--font-jetbrains)] text-xs border transition-all ${
                                      matchPage === i + 1
                                        ? "bg-orbital-purple/20 border-orbital-purple text-orbital-purple"
                                        : "border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30 hover:text-orbital-text"
                                    }`}
                                  >
                                    {i + 1}
                                  </button>
                                ))}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══ RANKING TAB ═══ */}
              {activeTab === "ranking" && (
                <motion.div
                  key="ranking"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {!tournament.season_id ? (
                    <HudCard className="text-center py-12">
                      <Trophy size={24} className="text-orbital-border mx-auto mb-3" />
                      <p className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text-dim">
                        Nenhuma season vinculada a este campeonato
                      </p>
                    </HudCard>
                  ) : rankingLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 size={24} className="text-orbital-purple animate-spin" />
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <HudCard className="text-center py-12">
                      <Trophy size={24} className="text-orbital-border mx-auto mb-3" />
                      <p className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text-dim">
                        Nenhum dado de ranking disponivel
                      </p>
                    </HudCard>
                  ) : (
                    <div className="space-y-6">
                      {/* Top 3 Podium */}
                      {leaderboard.length >= 3 && (
                        <div className="grid grid-cols-3 gap-4">
                          {[1, 0, 2].map((idx, pos) => {
                            const sorted = [...leaderboard].sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
                            const p = sorted[idx];
                            if (!p) return null;
                            const rank = idx + 1;
                            const isFirst = rank === 1;
                            return (
                              <HudCard key={p.steamId} glow={isFirst} delay={pos * 0.1} className={`text-center ${isFirst ? "sm:-mt-4" : "sm:mt-4"}`}>
                                <div className="py-2">
                                  <Medal size={isFirst ? 28 : 22} className={`mx-auto mb-2 ${rank === 1 ? "text-yellow-400" : rank === 2 ? "text-gray-300" : "text-amber-600"}`} />
                                  <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.2em] text-orbital-purple mb-1">#{rank}</div>
                                  <Link href={`/perfil/${p.steamId}`} className="font-[family-name:var(--font-russo)] text-xs font-bold tracking-wider text-orbital-text hover:text-orbital-purple transition-colors">
                                    {p.name}
                                  </Link>
                                  <div className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold text-orbital-purple mt-1">{(p.average_rating || 0).toFixed(2)}</div>
                                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mt-1">{p.kills}K / {p.deaths}D</div>
                                </div>
                              </HudCard>
                            );
                          })}
                        </div>
                      )}

                      {/* Full Table */}
                      <div className="bg-orbital-card border border-orbital-border overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Jogador</th>
                                <th><Target size={10} className="inline" /> K</th>
                                <th><Skull size={10} className="inline" /> D</th>
                                <th>K/D</th>
                                <th><Crosshair size={10} className="inline" /> HS%</th>
                                <th>Wins</th>
                                <th>Rounds</th>
                                <th>Rating</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const sorted = [...leaderboard].sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
                                const paged = sorted.slice((rankPage - 1) * RANK_PER_PAGE, rankPage * RANK_PER_PAGE);
                                return paged.map((player, pi) => {
                                  const i = (rankPage - 1) * RANK_PER_PAGE + pi;
                                  const kd = (player.deaths || 0) > 0 ? ((player.kills || 0) / player.deaths).toFixed(2) : (player.kills || 0).toFixed(2);
                                  const rating = player.average_rating || 0;
                                  return (
                                    <tr key={player.steamId}>
                                      <td>
                                        <span className={`font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-amber-600" : "text-orbital-text-dim"}`}>
                                          {i + 1}
                                        </span>
                                      </td>
                                      <td className="font-semibold">
                                        <Link href={`/perfil/${player.steamId}`} className="hover:text-orbital-purple transition-colors">{player.name}</Link>
                                      </td>
                                      <td className="text-orbital-success">{player.kills}</td>
                                      <td className="text-orbital-danger">{player.deaths}</td>
                                      <td>{kd}</td>
                                      <td>{Math.round(player.hsp || 0)}%</td>
                                      <td>{player.wins}</td>
                                      <td>{player.trp}</td>
                                      <td>
                                        <span className={`font-bold ${rating >= 1.2 ? "text-orbital-success" : rating >= 0.8 ? "text-orbital-text" : "text-orbital-danger"}`}>
                                          {rating.toFixed(2)}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                });
                              })()}
                            </tbody>
                          </table>
                        </div>
                        {/* Pagination */}
                        {leaderboard.length > RANK_PER_PAGE && (
                          <div className="flex items-center justify-center gap-2 p-3 border-t border-orbital-border">
                            {Array.from({ length: Math.ceil(leaderboard.length / RANK_PER_PAGE) }, (_, i) => (
                              <button
                                key={i}
                                onClick={() => setRankPage(i + 1)}
                                className={`w-8 h-8 font-[family-name:var(--font-jetbrains)] text-xs border transition-all ${
                                  rankPage === i + 1
                                    ? "bg-orbital-purple/20 border-orbital-purple text-orbital-purple"
                                    : "border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30 hover:text-orbital-text"
                                }`}
                              >
                                {i + 1}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══ HIGHLIGHTS TAB ═══ */}
              {activeTab === "highlights" && (
                <motion.div
                  key="highlights"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {highlightsLoading ? (
                    <div className="flex items-center justify-center py-20">
                      <Loader2 size={24} className="text-orbital-purple animate-spin" />
                    </div>
                  ) : highlights.length === 0 ? (
                    <HudCard className="text-center py-12">
                      <Sparkles size={24} className="text-orbital-border mx-auto mb-3" />
                      <p className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text-dim">
                        Nenhum highlight disponivel para este campeonato
                      </p>
                    </HudCard>
                  ) : (
                    <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {highlights.slice((hlPage - 1) * HL_PER_PAGE, hlPage * HL_PER_PAGE).map((clip, i) => (
                        <motion.div
                          key={clip.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.05, 0.5) }}
                          className="bg-orbital-card border border-orbital-border overflow-hidden group hover:border-orbital-purple/30 transition-colors"
                        >
                          <VideoPlayer
                            src={`/api/highlights-proxy/${clip.video_file}`}
                            clipId={clip.id}
                          />
                          <div className="p-2.5">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className="font-[family-name:var(--font-russo)] text-[0.65rem] text-orbital-purple shrink-0">#{clip.rank}</span>
                              {clip.steam_id ? (
                                <Link href={`/perfil/${clip.steam_id}`} className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text hover:text-orbital-purple transition-colors truncate">
                                  {clip.player_name || "Player"}
                                </Link>
                              ) : (
                                <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text truncate">{clip.player_name || "Player"}</span>
                              )}
                              {clip.kills_count >= 2 && (
                                <span className="font-[family-name:var(--font-russo)] text-[0.65rem] text-orbital-purple bg-orbital-purple/10 px-1.5 py-0.5 shrink-0">
                                  {clip.kills_count >= 5 ? "ACE" : `${clip.kills_count}K`}
                                </span>
                              )}
                              {clip.round_number && (
                                <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim shrink-0 ml-auto">R{clip.round_number}</span>
                              )}
                            </div>
                            <Link href={`/partidas/${clip.match_id}`} className="flex items-center gap-1.5 group/match">
                              <Swords size={9} className="text-orbital-text-dim group-hover/match:text-orbital-purple transition-colors shrink-0" />
                              <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim group-hover/match:text-orbital-purple transition-colors truncate">
                                {clip.team1_string || "Time 1"} vs {clip.team2_string || "Time 2"}
                              </span>
                            </Link>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    {/* Pagination */}
                    {highlights.length > HL_PER_PAGE && (
                      <div className="flex items-center justify-center gap-2 pt-2">
                        {Array.from({ length: Math.ceil(highlights.length / HL_PER_PAGE) }, (_, i) => (
                          <button
                            key={i}
                            onClick={() => setHlPage(i + 1)}
                            className={`w-8 h-8 font-[family-name:var(--font-jetbrains)] text-xs border transition-all ${
                              hlPage === i + 1
                                ? "bg-orbital-purple/20 border-orbital-purple text-orbital-purple"
                                : "border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30 hover:text-orbital-text"
                            }`}
                          >
                            {i + 1}
                          </button>
                        ))}
                      </div>
                    )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ─── Sidebar (Right) — escondida no lobby (pendente full-width) ─── */}
          <div className={`w-full lg:w-72 xl:w-80 shrink-0 space-y-4 ${tournament.matches.length === 0 ? "hidden" : ""}`}>
            {/* Event Info */}
            <HudCard className="p-4" label="EVENTO">
              <div className="space-y-3 mt-1">
                {tournament.start_date && (
                  <div className="flex items-start gap-3">
                    <Calendar size={14} className="text-orbital-purple mt-0.5 shrink-0" />
                    <div>
                      <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.15em] text-orbital-text-dim mb-0.5">DATAS</div>
                      <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                        {new Date(tournament.start_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                        {tournament.end_date && (
                          <span className="text-orbital-text-dim">
                            {" "}— {new Date(tournament.end_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {tournament.prize_pool && (
                  <div className="flex items-start gap-3">
                    <DollarSign size={14} className="text-orbital-purple mt-0.5 shrink-0" />
                    <div>
                      <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.15em] text-orbital-text-dim mb-0.5">PREMIACAO</div>
                      <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">{tournament.prize_pool}</div>
                    </div>
                  </div>
                )}
                {tournament.location && (
                  <div className="flex items-start gap-3">
                    <MapPin size={14} className="text-orbital-purple mt-0.5 shrink-0" />
                    <div>
                      <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.15em] text-orbital-text-dim mb-0.5">LOCAL</div>
                      <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">{tournament.location}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <Layers size={14} className="text-orbital-purple mt-0.5 shrink-0" />
                  <div>
                    <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.15em] text-orbital-text-dim mb-0.5">FORMATO</div>
                    <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                      {tournament.format === "double_elimination" ? "Eliminacao Dupla" : tournament.format || "Eliminacao Dupla"}
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Swords size={14} className="text-orbital-purple mt-0.5 shrink-0" />
                  <div>
                    <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.15em] text-orbital-text-dim mb-0.5">PROGRESSO</div>
                    <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                      {finishedCount}/{tournament.matches.length} partidas
                    </div>
                    {/* Progress bar */}
                    <div className="w-full h-1 bg-orbital-border mt-2 overflow-hidden">
                      <div
                        className="h-full bg-orbital-purple transition-all duration-500"
                        style={{ width: `${tournament.matches.length > 0 ? (finishedCount / tournament.matches.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </HudCard>

            {/* Map Pool */}
            <HudCard className="p-4" label="MAP POOL">
              <div className="grid grid-cols-1 gap-2 mt-1">
                {tournament.map_pool.map(map => (
                  <div
                    key={map}
                    className="relative overflow-hidden border border-orbital-border group hover:border-orbital-purple/30 transition-colors"
                  >
                    {MAP_IMAGES[map] && (
                      <div className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity">
                        <Image
                          src={MAP_IMAGES[map]}
                          alt={map}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    )}
                    <div className="relative flex items-center gap-2 px-3 py-2">
                      <Map size={12} className="text-orbital-purple shrink-0" />
                      <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text uppercase">
                        {map.replace("de_", "")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </HudCard>

            {/* Teams Summary */}
            <HudCard className="p-4" label="TIMES">
              <div className="space-y-2 mt-1">
                {tournament.teams.map(team => {
                  const teamData = teamsMap[team.id];
                  return (
                    <div key={team.id} className="flex items-center gap-2 py-1">
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        {teamData?.logo ? (
                          <Image src={teamData.logo} alt={team.name} width={18} height={18} className="object-contain" unoptimized />
                        ) : (
                          <Shield size={12} className="text-orbital-text-dim/60" />
                        )}
                      </div>
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text truncate">{team.name}</span>
                    </div>
                  );
                })}
              </div>
            </HudCard>
          </div>
        </div>
      </div>

      {/* ════════════════ VETO MODAL ════════════════ */}
      <AnimatePresence>
        {vetoMatch && (
          <VetoModal
            match={vetoMatch}
            tournament={tournament}
            servers={servers}
            selectedServer={selectedServer}
            onSelectServer={setSelectedServer}
            onBan={handleVetoBan}
            onStartMatch={handleStartMatch}
            onClose={() => { setVetoMatch(null); setMatchError(null); }}
            onResetVeto={handleResetVeto}
            actionLoading={actionLoading}
            matchError={matchError}
            vetoFirstTeam={vetoFirstTeam}
            onSelectVetoFirst={setVetoFirstTeam}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Veto Modal
function VetoModal({
  match,
  tournament,
  servers,
  selectedServer,
  onSelectServer,
  onBan,
  onStartMatch,
  onClose,
  onResetVeto,
  actionLoading,
  matchError,
  vetoFirstTeam,
  onSelectVetoFirst,
}: {
  match: BracketMatch;
  tournament: Tournament;
  servers: Server[];
  selectedServer: string;
  onSelectServer: (id: string) => void;
  onBan: (map: string) => void;
  onStartMatch: () => void;
  onClose: () => void;
  onResetVeto: () => void;
  actionLoading: boolean;
  matchError: string | null;
  vetoFirstTeam: "team1" | "team2" | null;
  onSelectVetoFirst: (team: "team1" | "team2") => void;
}) {
  const sequence = getVetoSequence(match.num_maps);
  const teamOrder = getVetoTeamOrder(match.num_maps, vetoFirstTeam === "team1");
  const currentStep = match.veto_actions.length;
  const isComplete = match.status === "ready";

  const usedMaps = match.veto_actions.map(a => a.map);
  const availableMaps = tournament.map_pool.filter(m => !usedMaps.includes(m));

  const currentAction = currentStep < sequence.length ? sequence[currentStep] : null;
  const currentTeamIdx = currentStep < teamOrder.length ? teamOrder[currentStep] : 0;
  const currentTeamId = currentTeamIdx === 0 ? match.team1_id : match.team2_id;
  const currentTeamName = getTeamName(tournament, currentTeamId);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        role="dialog"
        aria-modal="true"
        aria-label="Veto de mapas"
        className="bg-orbital-bg border border-orbital-purple/30 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-orbital-border">
          <div>
            <div className="font-[family-name:var(--font-russo)] text-xs tracking-wider text-orbital-purple">
              {match.label} — VETO
            </div>
            <div className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text mt-1">
              {getTeamName(tournament, match.team1_id)} <span className="text-orbital-text-dim">vs</span> {getTeamName(tournament, match.team2_id)}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-orbital-text-dim hover:text-orbital-text" aria-label="Fechar veto">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Team Selection - Who vetoes first */}
          {!vetoFirstTeam && (
            <div className="space-y-3">
              <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.2em] text-orbital-purple text-center">
                QUEM COMECA O VETO?
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onSelectVetoFirst("team1")}
                  className="p-4 border border-orbital-border hover:border-orbital-purple/50 hover:bg-orbital-purple/10 transition-all group"
                >
                  <div className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text group-hover:text-orbital-purple transition-colors">
                    {getTeamName(tournament, match.team1_id)}
                  </div>
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim mt-1">TIME 1</div>
                </button>
                <button
                  onClick={() => onSelectVetoFirst("team2")}
                  className="p-4 border border-orbital-border hover:border-orbital-purple/50 hover:bg-orbital-purple/10 transition-all group"
                >
                  <div className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text group-hover:text-orbital-purple transition-colors">
                    {getTeamName(tournament, match.team2_id)}
                  </div>
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim mt-1">TIME 2</div>
                </button>
              </div>
            </div>
          )}

          {/* Veto History */}
          {vetoFirstTeam && match.veto_actions.length > 0 && (
            <div className="space-y-1">
              {match.veto_actions.map((action, i) => (
                <div key={i} className={`flex items-center gap-2 px-3 py-2 border ${
                  action.action === "ban"
                    ? "bg-orbital-danger/5 border-orbital-danger/20"
                    : "bg-orbital-success/5 border-orbital-success/20"
                }`}>
                  <span className={`font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider ${
                    action.action === "ban" ? "text-orbital-danger" : "text-orbital-success"
                  }`}>
                    {action.action === "ban" ? "BAN" : "PICK"}
                  </span>
                  <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                    {action.team_name}
                  </span>
                  <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim ml-auto">
                    {action.map.replace("de_", "").toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Current Action */}
          {vetoFirstTeam && !isComplete && currentAction && (
            <div className="border border-orbital-purple/30 p-4">
              <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-[0.2em] text-orbital-purple mb-1">
                {currentAction === "ban" ? "BANIR MAPA" : "ESCOLHER MAPA"}
              </div>
              <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text mb-3">
                <span className="text-orbital-purple">{currentTeamName}</span> {currentAction === "ban" ? "remove" : "escolhe"} um mapa
              </div>
              <div className="grid grid-cols-3 gap-2">
                {availableMaps.map(map => (
                  <button
                    key={map}
                    onClick={() => onBan(map)}
                    className={`px-3 py-2.5 border font-[family-name:var(--font-jetbrains)] text-xs transition-all ${
                      currentAction === "ban"
                        ? "bg-orbital-bg border-orbital-border hover:border-orbital-danger/50 hover:bg-orbital-danger/10 hover:text-orbital-danger text-orbital-text"
                        : "bg-orbital-bg border-orbital-border hover:border-orbital-success/50 hover:bg-orbital-success/10 hover:text-orbital-success text-orbital-text"
                    }`}
                  >
                    {map.replace("de_", "").toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Veto Complete */}
          {isComplete && (
            <div className="space-y-4">
              <div className="bg-orbital-success/10 border border-orbital-success/30 p-4 text-center">
                <Check size={20} className="text-orbital-success mx-auto mb-2" />
                <div className="font-[family-name:var(--font-russo)] text-xs tracking-wider text-orbital-success mb-1">
                  VETO CONCLUIDO
                </div>
                <div className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text">
                  {match.num_maps === 1
                    ? `Mapa: ${match.map?.replace("de_", "").toUpperCase()}`
                    : `Mapas: ${match.maps?.map(m => m.replace("de_", "").toUpperCase()).join(" / ")}`
                  }
                </div>
              </div>

              {/* Config Info */}
              <div className="flex gap-4 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                <span>Knife Round</span>
                <span>5v5</span>
              </div>

              {/* Server Selection */}
              <div>
                <label className="block font-[family-name:var(--font-russo)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">
                  SERVIDOR
                </label>
                <select
                  value={selectedServer}
                  onChange={e => onSelectServer(e.target.value)}
                  className="w-full bg-orbital-bg border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none"
                >
                  <option value="">Selecionar servidor...</option>
                  {servers.map(s => (
                    <option key={s.id} value={s.id}>{s.display_name} ({s.ip_string}:{s.port})</option>
                  ))}
                </select>
              </div>

              {/* Error message with retry */}
              {matchError && (
                <div className="bg-orbital-danger/10 border border-orbital-danger/30 p-3">
                  <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-danger mb-2">
                    {matchError}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={onStartMatch}
                      disabled={!selectedServer || actionLoading}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orbital-purple/20 border border-orbital-purple/50 hover:bg-orbital-purple/30 transition-all font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider text-orbital-purple disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                      TENTAR NOVAMENTE
                    </button>
                    <button
                      onClick={onResetVeto}
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-orbital-border hover:border-orbital-danger/50 transition-all font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider text-orbital-text-dim hover:text-orbital-danger"
                    >
                      <X size={14} />
                      RESETAR VETO
                    </button>
                  </div>
                </div>
              )}

              {!matchError && (
                <button
                  onClick={onStartMatch}
                  disabled={!selectedServer || actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orbital-purple/20 border border-orbital-purple/50 hover:bg-orbital-purple/30 transition-all font-[family-name:var(--font-russo)] text-xs tracking-wider text-orbital-purple disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  {actionLoading ? "CRIANDO..." : "CRIAR PARTIDA E INICIAR"}
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══ SWISS STANDINGS VIEW ═══
function SwissStandingsView({
  tournament,
  teamsMap,
  mapScoresMap: _mapScoresMap,
}: {
  tournament: Tournament;
  teamsMap: TeamsMap;
  mapScoresMap: MapScoresMap;
}) {
  const standings = getSwissStandings(tournament);
  const currentRound = tournament.swiss_round || 1;
  const totalRounds = Math.max(currentRound, ...tournament.matches.map((m) => m.round));

  return (
    <div className="space-y-5">
      {/* Standings Table */}
      <HudCard className="p-5" label="CLASSIFICAÇÃO SWISS">
        <div className="overflow-x-auto mt-2">
          <table className="w-full font-[family-name:var(--font-jetbrains)] text-xs">
            <thead>
              <tr className="text-orbital-text-dim/50 border-b border-orbital-border text-[0.65rem]">
                <th className="text-left py-2 px-2">#</th>
                <th className="text-left py-2 px-2">Time</th>
                <th className="text-center py-2 px-2">Record</th>
                <th className="text-center py-2 px-2">Buchholz</th>
                <th className="text-center py-2 px-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => {
                const logo = teamsMap[s.team_id]?.logo;
                return (
                  <tr
                    key={s.team_id}
                    className={`border-b border-orbital-border/30 transition-colors ${
                      s.status === "advanced"
                        ? "bg-green-500/5"
                        : s.status === "eliminated"
                        ? "bg-red-500/5 opacity-40"
                        : "hover:bg-white/[0.02]"
                    }`}
                  >
                    <td className="py-2.5 px-2 text-orbital-text-dim">{i + 1}</td>
                    <td className="py-2.5 px-2">
                      <Link href={`/times/${s.team_id}`} className="flex items-center gap-2 hover:text-orbital-purple transition-colors">
                        {logo ? (
                          <Image src={logo} alt={s.name} width={20} height={20} className="object-contain" unoptimized />
                        ) : (
                          <Shield size={14} className="text-orbital-text-dim/50" />
                        )}
                        <span className="text-orbital-text">{s.name}</span>
                        {s.tag && <span className="text-orbital-text-dim/60">[{s.tag}]</span>}
                      </Link>
                    </td>
                    <td className="text-center py-2.5 px-2">
                      <span className="font-[family-name:var(--font-russo)] text-xs">
                        <span className="text-green-400">{s.wins}</span>
                        <span className="text-orbital-text-dim/50">-</span>
                        <span className="text-red-400/70">{s.losses}</span>
                      </span>
                    </td>
                    <td className="text-center py-2.5 px-2 text-orbital-text-dim">{s.buchholz}</td>
                    <td className="text-center py-2.5 px-2">
                      <span
                        className={`font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider px-2 py-0.5 border ${
                          s.status === "advanced"
                            ? "text-green-400 border-green-400/30 bg-green-400/5"
                            : s.status === "eliminated"
                            ? "text-red-400/60 border-red-400/20"
                            : "text-orbital-text-dim border-orbital-border"
                        }`}
                      >
                        {s.status === "advanced"
                          ? "AVANÇOU"
                          : s.status === "eliminated"
                          ? "ELIMINADO"
                          : "ATIVO"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </HudCard>

      {/* Matches by Round */}
      {Array.from({ length: totalRounds }, (_, i) => i + 1).map((round) => {
        const roundMatches = tournament.matches.filter(
          (m) => m.bracket === "swiss" && m.round === round
        );
        if (roundMatches.length === 0) return null;

        const allDone = roundMatches.every((m) => m.status === "finished");
        const hasLive = roundMatches.some((m) => m.status === "live");

        return (
          <HudCard key={round} className="p-4" label={`ROUND ${round}`}>
            <div className="flex items-center gap-2 mb-3">
              {hasLive && (
                <span className="flex items-center gap-1 font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider text-red-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  AO VIVO
                </span>
              )}
              {allDone && (
                <span className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider text-green-400/50">
                  CONCLUÍDO
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {roundMatches.map((m) => {
                const t1 = getTeamName(tournament, m.team1_id);
                const t2 = getTeamName(tournament, m.team2_id);
                const t1Logo = m.team1_id ? teamsMap[m.team1_id]?.logo : null;
                const t2Logo = m.team2_id ? teamsMap[m.team2_id]?.logo : null;
                const isLive = m.status === "live";
                const isDone = m.status === "finished";

                return (
                  <div
                    key={m.id}
                    className={`flex items-center gap-3 px-3 py-2.5 border ${
                      isLive
                        ? "border-red-500/30 bg-red-500/5"
                        : isDone
                        ? "border-orbital-border/30 bg-orbital-card"
                        : "border-orbital-border bg-orbital-card"
                    }`}
                  >
                    {/* Team 1 */}
                    <div className="flex-1 flex items-center gap-2 min-w-0 justify-end">
                      <span
                        className={`font-[family-name:var(--font-jetbrains)] text-xs truncate ${
                          isDone && m.winner_id === m.team1_id ? "text-green-400" : "text-orbital-text"
                        }`}
                      >
                        {t1}
                      </span>
                      {t1Logo ? (
                        <Image src={t1Logo} alt="" width={18} height={18} className="object-contain shrink-0" unoptimized />
                      ) : (
                        <Shield size={12} className="text-orbital-text-dim/50 shrink-0" />
                      )}
                    </div>

                    {/* Score / VS */}
                    <div className="font-[family-name:var(--font-russo)] text-xs text-orbital-text-dim shrink-0 w-12 text-center">
                      {isDone ? (
                        <span>
                          <span className={m.winner_id === m.team1_id ? "text-green-400" : ""}>{/* map score if available */}</span>
                          <span className="text-orbital-text-dim/60">VS</span>
                        </span>
                      ) : isLive ? (
                        <span className="text-red-400 text-[0.65rem]">LIVE</span>
                      ) : (
                        <span className="text-orbital-text-dim/50 text-[0.65rem]">VS</span>
                      )}
                    </div>

                    {/* Team 2 */}
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      {t2Logo ? (
                        <Image src={t2Logo} alt="" width={18} height={18} className="object-contain shrink-0" unoptimized />
                      ) : (
                        <Shield size={12} className="text-orbital-text-dim/50 shrink-0" />
                      )}
                      <span
                        className={`font-[family-name:var(--font-jetbrains)] text-xs truncate ${
                          isDone && m.winner_id === m.team2_id ? "text-green-400" : "text-orbital-text"
                        }`}
                      >
                        {t2}
                      </span>
                    </div>

                    {/* BO indicator */}
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim/50 shrink-0">
                      {m.num_maps > 1 ? "BO3" : "BO1"}
                    </span>
                  </div>
                );
              })}
            </div>
          </HudCard>
        );
      })}
    </div>
  );
}
