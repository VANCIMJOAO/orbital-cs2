"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Match, PlayerStats, MapStats, KillEvent, BombEvent, getMatch, getPlayerStats, getMapStats, getKillEvents, getBombEvents, getTeam, Team, getStatusType } from "@/lib/api";

// === TYPES ===

interface LiveData {
  match: Match;
  playerStats: PlayerStats[];
  mapStats: MapStats[];
  team1: Team | null;
  team2: Team | null;
  killEvents: KillEvent[];
  bombEvents: BombEvent[];
}

interface RecentKill {
  id: string;
  attacker: string;
  attackerSide: string;
  victim: string;
  victimSide: string;
  weapon: string;
  headshot: boolean;
  timestamp: number;
}

// === WEAPON ICONS ===
const WEAPON_SHORT: Record<string, string> = {
  ak47: "AK-47", m4a1: "M4A4", m4a1_silencer: "M4A1-S", awp: "AWP",
  deagle: "Deagle", usp_silencer: "USP-S", glock: "Glock", p250: "P250",
  famas: "FAMAS", galil: "Galil", mp9: "MP9", mac10: "MAC-10",
  ump45: "UMP", p90: "P90", sg553: "SG553", aug: "AUG",
  ssg08: "Scout", g3sg1: "G3SG1", scar20: "SCAR", nova: "Nova",
  xm1014: "XM1014", mag7: "MAG-7", m249: "M249", negev: "Negev",
  hkp2000: "P2000", elite: "Dualies", tec9: "Tec-9", cz75_auto: "CZ75",
  fiveseven: "Five-Seven", mp7: "MP7", mp5sd: "MP5",
  hegrenade: "HE", molotov: "Molotov", incgrenade: "Incendiary",
  flashbang: "Flash", smokegrenade: "Smoke", knife: "Knife",
  knife_t: "Knife", bayonet: "Knife", inferno: "Fire",
};

// === CORNER BRACKET COMPONENT ===
function HudCorners({ size = 10, color = "#A855F7", opacity = 0.7 }: { size?: number; color?: string; opacity?: number }) {
  const style = { borderColor: color, opacity };
  return (
    <>
      <div className="absolute top-0 left-0 border-t-2 border-l-2" style={{ ...style, width: size, height: size }} />
      <div className="absolute top-0 right-0 border-t-2 border-r-2" style={{ ...style, width: size, height: size }} />
      <div className="absolute bottom-0 left-0 border-b-2 border-l-2" style={{ ...style, width: size, height: size }} />
      <div className="absolute bottom-0 right-0 border-b-2 border-r-2" style={{ ...style, width: size, height: size }} />
    </>
  );
}

// === ACCENT LINE COMPONENT ===
function AccentLine({ position = "top" }: { position?: "top" | "bottom" }) {
  return (
    <div
      className={`absolute ${position === "top" ? "top-0" : "bottom-0"} left-[10%] right-[10%] h-[1px]`}
      style={{ background: "linear-gradient(90deg, transparent, #A855F7, transparent)" }}
    />
  );
}

export default function LiveOverlay({ matchId }: { matchId: number }) {
  const [data, setData] = useState<LiveData | null>(null);
  const [recentKills, setRecentKills] = useState<RecentKill[]>([]);
  const [bombState, setBombState] = useState<"none" | "planted" | "defusing" | "exploded" | "defused">("none");
  const [bombTimer, setBombTimer] = useState(0);
  const [connected, setConnected] = useState(false);
  const lastKillIdRef = useRef(0);
  const bombIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const { match } = await getMatch(matchId);
      if (!match) return;
      const [ps, ms, t1, t2, ke, be] = await Promise.all([
        getPlayerStats(matchId),
        getMapStats(matchId),
        match.team1_id ? getTeam(match.team1_id).catch(() => null) : null,
        match.team2_id ? getTeam(match.team2_id).catch(() => null) : null,
        getKillEvents(matchId),
        getBombEvents(matchId),
      ]);
      setData({
        match,
        playerStats: Array.isArray(ps) ? ps : (ps as { playerstats?: PlayerStats[] })?.playerstats || [],
        mapStats: Array.isArray(ms) ? ms : (ms as { mapstats?: MapStats[] })?.mapstats || [],
        team1: t1 as Team | null,
        team2: t2 as Team | null,
        killEvents: ke,
        bombEvents: be,
      });
      setConnected(true);

      if (ke.length > 0) {
        const newKills = ke.filter(k => k.id > lastKillIdRef.current);
        if (newKills.length > 0) {
          lastKillIdRef.current = Math.max(...ke.map(k => k.id));
          const mapped: RecentKill[] = newKills.slice(-5).map(k => ({
            id: `${k.id}`,
            attacker: k.attacker_name || "???",
            attackerSide: k.attacker_side || "CT",
            victim: k.player_name || "???",
            victimSide: k.player_side || "T",
            weapon: k.weapon || "knife",
            headshot: !!k.headshot,
            timestamp: Date.now(),
          }));
          setRecentKills(prev => [...prev, ...mapped].slice(-6));
        }
      }

      if (be.length > 0) {
        const lastBomb = be[be.length - 1];
        if (lastBomb.defused) {
          setBombState("defused");
        } else if (lastBomb.bomb_time_remaining && lastBomb.bomb_time_remaining > 0) {
          setBombState("planted");
        }
      }
    } catch {
      setConnected(false);
    }
  }, [matchId]);

  useEffect(() => {
    fetchAll();
    const eventSource = new EventSource(`/api/matches/${matchId}/stream`);
    eventSource.onmessage = () => { fetchAll(); };
    eventSource.onerror = () => setConnected(false);
    const interval = setInterval(fetchAll, 3000);
    return () => { eventSource.close(); clearInterval(interval); };
  }, [matchId, fetchAll]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRecentKills(prev => prev.filter(k => Date.now() - k.timestamp < 5000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (bombState === "planted") {
      setBombTimer(40);
      bombIntervalRef.current = setInterval(() => {
        setBombTimer(prev => {
          if (prev <= 0) {
            setBombState("exploded");
            if (bombIntervalRef.current) clearInterval(bombIntervalRef.current);
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
    } else {
      if (bombIntervalRef.current) clearInterval(bombIntervalRef.current);
    }
    return () => { if (bombIntervalRef.current) clearInterval(bombIntervalRef.current); };
  }, [bombState]);

  if (!data) {
    return (
      <div className="w-screen h-screen bg-transparent flex items-center justify-center">
        <div className="relative px-8 py-4 bg-[#111111] border border-[#1A1A1A]">
          <HudCorners size={12} />
          <AccentLine />
          <span className="font-[family-name:var(--font-orbitron)] text-[0.7rem] tracking-[0.4em] text-[#A855F7] animate-pulse">
            CONECTANDO...
          </span>
        </div>
      </div>
    );
  }

  const { match, playerStats, mapStats, team1, team2 } = data;
  const isLive = getStatusType(match) === "live";
  const activeMap = mapStats.length > 0 ? mapStats[mapStats.length - 1] : null;
  const mapName = activeMap?.map_name?.replace("de_", "").toUpperCase() || "---";

  function aggregateByPlayer(stats: PlayerStats[]): PlayerStats[] {
    const map = new Map<string, PlayerStats>();
    for (const s of stats) {
      const key = s.steam_id ? `${s.steam_id}_${s.team_id}` : `${s.name}_${s.team_id}`;
      const existing = map.get(key);
      if (existing) {
        existing.kills = (existing.kills || 0) + (s.kills || 0);
        existing.deaths = (existing.deaths || 0) + (s.deaths || 0);
        existing.assists = (existing.assists || 0) + (s.assists || 0);
        existing.headshot_kills = (existing.headshot_kills || 0) + (s.headshot_kills || 0);
      } else {
        map.set(key, { ...s });
      }
    }
    return Array.from(map.values());
  }

  const team1Stats = aggregateByPlayer(playerStats.filter(s => s.team_id === match.team1_id));
  const team2Stats = aggregateByPlayer(playerStats.filter(s => s.team_id === match.team2_id));

  const t1Score = activeMap?.team1_score ?? match.team1_score ?? 0;
  const t2Score = activeMap?.team2_score ?? match.team2_score ?? 0;

  const t1Name = team1?.name || match.team1_string || "TIME 1";
  const t2Name = team2?.name || match.team2_string || "TIME 2";
  const t1Logo = team1?.logo;
  const t2Logo = team2?.logo;

  return (
    <div className="w-screen h-screen bg-transparent relative overflow-hidden">

      {/* ========== TOP SCOREBOARD ========== */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-stretch">

        {/* Team 1 panel */}
        <div className="relative flex items-center gap-3 bg-[#111111] border border-[#1A1A1A] border-r-0 px-5 py-2.5 min-w-[260px] justify-end"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 16px 100%, 0 calc(100% - 16px))" }}>
          {/* Top accent */}
          <div className="absolute top-0 left-[20%] right-0 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, #A855F7)" }} />
          {/* Corner bracket top-right */}
          <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#A855F7]/70" />
          {/* Corner bracket bottom-left (chamfered) */}
          <div className="absolute bottom-[16px] left-0 w-3 h-3 border-l-2 border-[#A855F7]/70" style={{ height: 10 }} />

          <span className="font-[family-name:var(--font-orbitron)] text-white text-sm font-bold tracking-wider uppercase">
            {t1Name}
          </span>
          {t1Logo ? (
            <img src={t1Logo} alt="" className="w-9 h-9 rounded-sm border border-[#1A1A1A]" />
          ) : (
            <div className="w-9 h-9 bg-[#A855F7]/20 border border-[#A855F7]/30 flex items-center justify-center">
              <span className="font-[family-name:var(--font-orbitron)] text-[#A855F7] text-[0.5rem] font-bold">
                {t1Name.slice(0, 2)}
              </span>
            </div>
          )}
        </div>

        {/* Score center */}
        <div className="relative flex items-center bg-[#111111] border-y border-[#1A1A1A]"
          style={{ boxShadow: "0 0 20px rgba(168,85,247,0.15)" }}>
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: "linear-gradient(90deg, #A855F7, #C084FC, #A855F7)" }} />
          {/* Bottom accent */}
          <div className="absolute bottom-0 left-[15%] right-[15%] h-[1px]" style={{ background: "linear-gradient(90deg, transparent, #A855F7/60, transparent)" }} />

          {/* T1 score */}
          <div className="px-5 py-2 text-center min-w-[56px]">
            <span className="font-[family-name:var(--font-jetbrains)] text-white text-3xl font-black">{t1Score}</span>
          </div>

          {/* Map + status */}
          <div className="flex flex-col items-center px-4 py-1.5 border-x border-[#1A1A1A]">
            <span className="font-[family-name:var(--font-orbitron)] text-[#A855F7] text-[0.6rem] tracking-[0.25em] uppercase">{mapName}</span>
            {isLive && (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" style={{ boxShadow: "0 0 8px rgba(239,68,68,0.6)" }} />
                <span className="font-[family-name:var(--font-orbitron)] text-[#EF4444] text-[0.5rem] tracking-[0.3em]">LIVE</span>
              </div>
            )}
            {mapStats.length > 1 && (
              <div className="flex items-center gap-2 mt-0.5">
                {mapStats.map((ms, i) => (
                  <span key={i} className="font-[family-name:var(--font-jetbrains)] text-[#94A3B8] text-[0.5rem]">
                    {ms.team1_score}:{ms.team2_score}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* T2 score */}
          <div className="px-5 py-2 text-center min-w-[56px]">
            <span className="font-[family-name:var(--font-jetbrains)] text-white text-3xl font-black">{t2Score}</span>
          </div>
        </div>

        {/* Team 2 panel */}
        <div className="relative flex items-center gap-3 bg-[#111111] border border-[#1A1A1A] border-l-0 px-5 py-2.5 min-w-[260px]"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%)" }}>
          {/* Top accent */}
          <div className="absolute top-0 left-0 right-[20%] h-[1px]" style={{ background: "linear-gradient(90deg, #A855F7, transparent)" }} />
          {/* Corner bracket top-left */}
          <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#A855F7]/70" />

          {t2Logo ? (
            <img src={t2Logo} alt="" className="w-9 h-9 rounded-sm border border-[#1A1A1A]" />
          ) : (
            <div className="w-9 h-9 bg-[#A855F7]/20 border border-[#A855F7]/30 flex items-center justify-center">
              <span className="font-[family-name:var(--font-orbitron)] text-[#A855F7] text-[0.5rem] font-bold">
                {t2Name.slice(0, 2)}
              </span>
            </div>
          )}
          <span className="font-[family-name:var(--font-orbitron)] text-white text-sm font-bold tracking-wider uppercase">
            {t2Name}
          </span>
        </div>
      </div>

      {/* ========== PLAYER STATS — LEFT (Team 1) ========== */}
      <div className="absolute left-0 top-[72px] flex flex-col gap-[2px]">
        {team1Stats.sort((a, b) => (b.kills || 0) - (a.kills || 0)).slice(0, 5).map((p, i) => {
          const isTop = i === 0;
          return (
            <div key={`t1-${i}`}
              className={`relative flex items-center py-1.5 pl-2.5 pr-3 w-[250px] bg-[#111111] border border-[#1A1A1A] border-l-2 ${isTop ? "border-l-[#A855F7]" : "border-l-[#A855F7]/40"}`}>
              {/* Accent line on top player */}
              {isTop && <div className="absolute top-0 left-[10%] right-[10%] h-[1px]" style={{ background: "linear-gradient(90deg, transparent, #A855F7/60, transparent)" }} />}

              <span className={`font-[family-name:var(--font-orbitron)] text-[0.6rem] font-medium truncate w-[95px] ${isTop ? "text-[#A855F7]" : "text-[#E2E8F0]"}`}>
                {p.name}
              </span>
              <div className="flex items-center gap-2.5 ml-auto font-[family-name:var(--font-jetbrains)] text-[0.6rem]">
                <span className="text-[#22C55E]">{p.kills || 0}</span>
                <span className="text-[#1A1A1A]">/</span>
                <span className="text-[#EF4444]">{p.deaths || 0}</span>
                <span className="text-[#1A1A1A]">/</span>
                <span className="text-[#F59E0B]">{p.assists || 0}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========== PLAYER STATS — RIGHT (Team 2) ========== */}
      <div className="absolute right-0 top-[72px] flex flex-col gap-[2px]">
        {team2Stats.sort((a, b) => (b.kills || 0) - (a.kills || 0)).slice(0, 5).map((p, i) => {
          const isTop = i === 0;
          return (
            <div key={`t2-${i}`}
              className={`relative flex items-center py-1.5 pr-2.5 pl-3 w-[250px] bg-[#111111] border border-[#1A1A1A] border-r-2 ${isTop ? "border-r-[#A855F7]" : "border-r-[#A855F7]/40"}`}>
              {isTop && <div className="absolute top-0 left-[10%] right-[10%] h-[1px]" style={{ background: "linear-gradient(90deg, transparent, #A855F7/60, transparent)" }} />}

              <div className="flex items-center gap-2.5 mr-auto font-[family-name:var(--font-jetbrains)] text-[0.6rem]">
                <span className="text-[#22C55E]">{p.kills || 0}</span>
                <span className="text-[#1A1A1A]">/</span>
                <span className="text-[#EF4444]">{p.deaths || 0}</span>
                <span className="text-[#1A1A1A]">/</span>
                <span className="text-[#F59E0B]">{p.assists || 0}</span>
              </div>
              <span className={`font-[family-name:var(--font-orbitron)] text-[0.6rem] font-medium truncate w-[95px] text-right ${isTop ? "text-[#A855F7]" : "text-[#E2E8F0]"}`}>
                {p.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* ========== KILL FEED — TOP RIGHT ========== */}
      <div className="absolute top-[72px] right-[270px] flex flex-col gap-[2px] items-end">
        {recentKills.map((kill) => {
          const fadeAge = (Date.now() - kill.timestamp) / 5000;
          const opacity = Math.max(0, 1 - fadeAge);
          return (
            <div key={kill.id}
              className="relative flex items-center gap-2 bg-[#111111] border border-[#1A1A1A] px-3 py-1 transition-opacity duration-300"
              style={{ opacity }}>
              {/* Mini corner brackets */}
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#A855F7]/50" />
              <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#A855F7]/50" />

              <span className={`font-[family-name:var(--font-orbitron)] text-[0.6rem] font-semibold ${kill.attackerSide === "CT" ? "text-[#38BDF8]" : "text-[#FBBF24]"}`}>
                {kill.attacker}
              </span>
              <div className="flex items-center gap-1">
                {kill.headshot && <span className="text-[#EF4444] text-[0.5rem] font-bold">HS</span>}
                <span className="font-[family-name:var(--font-jetbrains)] text-[#94A3B8] text-[0.5rem]">
                  {WEAPON_SHORT[kill.weapon] || kill.weapon}
                </span>
              </div>
              <span className="text-[#A855F7] text-[0.55rem]">&raquo;</span>
              <span className={`font-[family-name:var(--font-orbitron)] text-[0.6rem] ${kill.victimSide === "CT" ? "text-[#38BDF8]/50" : "text-[#FBBF24]/50"}`}>
                {kill.victim}
              </span>
            </div>
          );
        })}
      </div>

      {/* ========== BOMB INDICATOR ========== */}
      {bombState === "planted" && (
        <div className="absolute bottom-[80px] left-1/2 -translate-x-1/2">
          <div className="relative bg-[#111111] border border-[#EF4444]/40 px-6 py-2.5 flex items-center gap-3"
            style={{ boxShadow: "0 0 20px rgba(239,68,68,0.2)" }}>
            <HudCorners size={8} color="#EF4444" opacity={0.6} />
            <div className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
            <span className="font-[family-name:var(--font-orbitron)] text-[#EF4444] text-sm font-bold tracking-wider">BOMB PLANTED</span>
            <div className="w-[150px] h-1.5 bg-[#1A1A1A] overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#EF4444] to-[#F59E0B] transition-all duration-100"
                style={{ width: `${(bombTimer / 40) * 100}%` }} />
            </div>
            <span className="font-[family-name:var(--font-jetbrains)] text-[#EF4444] text-xs">{bombTimer.toFixed(1)}s</span>
          </div>
        </div>
      )}

      {bombState === "defused" && (
        <div className="absolute bottom-[80px] left-1/2 -translate-x-1/2">
          <div className="relative bg-[#111111] border border-[#38BDF8]/40 px-6 py-2.5"
            style={{ boxShadow: "0 0 20px rgba(56,189,248,0.15)" }}>
            <HudCorners size={8} color="#38BDF8" opacity={0.6} />
            <span className="font-[family-name:var(--font-orbitron)] text-[#38BDF8] text-sm font-bold tracking-wider">BOMB DEFUSED</span>
          </div>
        </div>
      )}

      {/* ========== BOTTOM BRANDING ========== */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-3">
        <div className="w-8 h-[1px]" style={{ background: "linear-gradient(90deg, transparent, #A855F7)" }} />
        <div className="relative px-3 py-1 border border-[#1A1A1A]/60">
          <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#A855F7]/40" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#A855F7]/40" />
          <span className="font-[family-name:var(--font-orbitron)] text-[#A855F7]/50 text-[0.45rem] tracking-[0.5em]">ORBITAL ROXA</span>
        </div>
        <div className="w-8 h-[1px]" style={{ background: "linear-gradient(270deg, transparent, #A855F7)" }} />
      </div>

      {/* ========== CONNECTION LOST ========== */}
      {!connected && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative bg-[#111111] border border-[#EF4444]/50 px-8 py-4"
            style={{ boxShadow: "0 0 30px rgba(239,68,68,0.2)" }}>
            <HudCorners size={12} color="#EF4444" />
            <AccentLine />
            <span className="font-[family-name:var(--font-orbitron)] text-[#EF4444] font-bold text-sm tracking-[0.3em] animate-pulse">
              SEM CONEXAO
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
