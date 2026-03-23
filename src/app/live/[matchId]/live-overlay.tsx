"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Match, PlayerStats, MapStats, KillEvent, BombEvent, getMatch, getPlayerStats, getMapStats, getKillEvents, getBombEvents, getTeam, Team, getStatusType } from "@/lib/api";

// ═══ TYPES ═══

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

// ═══ WEAPON ICONS (simplified names) ═══
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

export default function LiveOverlay({ matchId }: { matchId: number }) {
  const [data, setData] = useState<LiveData | null>(null);
  const [recentKills, setRecentKills] = useState<RecentKill[]>([]);
  const [bombState, setBombState] = useState<"none" | "planted" | "defusing" | "exploded" | "defused">("none");
  const [bombTimer, setBombTimer] = useState(0);
  const [connected, setConnected] = useState(false);
  const lastKillIdRef = useRef(0);
  const bombIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ═══ FETCH DATA ═══
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

      // Process new kills for feed
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

      // Process bomb
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

  // SSE connection
  useEffect(() => {
    fetchAll();
    const eventSource = new EventSource(`/api/matches/${matchId}/stream`);
    eventSource.onmessage = () => {
      fetchAll();
    };
    eventSource.onerror = () => setConnected(false);
    const interval = setInterval(fetchAll, 3000);
    return () => {
      eventSource.close();
      clearInterval(interval);
    };
  }, [matchId, fetchAll]);

  // Clean old kills from feed (remove after 5s)
  useEffect(() => {
    const interval = setInterval(() => {
      setRecentKills(prev => prev.filter(k => Date.now() - k.timestamp < 5000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Bomb timer
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
      <div className="w-[1920px] h-[1080px] bg-transparent flex items-center justify-center">
        <div className="text-white/30 font-[family-name:var(--font-orbitron)] text-sm tracking-widest animate-pulse">
          AGUARDANDO CONEXÃO...
        </div>
      </div>
    );
  }

  const { match, playerStats, mapStats, team1, team2 } = data;
  const isLive = getStatusType(match) === "live";
  const activeMap = mapStats.length > 0 ? mapStats[mapStats.length - 1] : null;
  const mapName = activeMap?.map_name?.replace("de_", "").toUpperCase() || "---";

  // Aggregate stats per player (BO3 has multiple entries per player)
  function aggregateByPlayer(stats: PlayerStats[]): PlayerStats[] {
    const map = new Map<string, PlayerStats>();
    for (const s of stats) {
      const key = s.steam_id || s.name;
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

  // Current scores
  const t1Score = activeMap?.team1_score ?? match.team1_score ?? 0;
  const t2Score = activeMap?.team2_score ?? match.team2_score ?? 0;

  const t1Name = team1?.name || match.team1_string || "TIME 1";
  const t2Name = team2?.name || match.team2_string || "TIME 2";
  const t1Logo = team1?.logo;
  const t2Logo = team2?.logo;

  return (
    <div className="w-[1920px] h-[1080px] bg-transparent relative overflow-hidden" style={{ fontFamily: "'Orbitron', 'JetBrains Mono', monospace" }}>

      {/* ═══ TOP BAR — SCOREBOARD ═══ */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 flex items-center">
        {/* Team 1 */}
        <div className="flex items-center gap-3 bg-gradient-to-l from-[#0A0A0A]/95 to-transparent px-6 py-3 min-w-[300px] justify-end">
          <span className="text-white font-bold text-lg tracking-wider">{t1Name}</span>
          {t1Logo && <img src={t1Logo} alt="" className="w-10 h-10 rounded" />}
        </div>

        {/* Score */}
        <div className="flex items-center bg-[#0A0A0A]/95 border-x-2 border-[#A855F7]/60">
          <div className="px-5 py-2 text-center min-w-[60px]">
            <span className="text-white font-black text-4xl">{t1Score}</span>
          </div>
          <div className="flex flex-col items-center px-3 py-1">
            <span className="text-[#A855F7] text-[0.65rem] tracking-[0.3em]">{mapName}</span>
            {isLive && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 text-[0.6rem] tracking-wider">AO VIVO</span>
              </div>
            )}
          </div>
          <div className="px-5 py-2 text-center min-w-[60px]">
            <span className="text-white font-black text-4xl">{t2Score}</span>
          </div>
        </div>

        {/* Team 2 */}
        <div className="flex items-center gap-3 bg-gradient-to-r from-[#0A0A0A]/95 to-transparent px-6 py-3 min-w-[300px]">
          {t2Logo && <img src={t2Logo} alt="" className="w-10 h-10 rounded" />}
          <span className="text-white font-bold text-lg tracking-wider">{t2Name}</span>
        </div>
      </div>

      {/* ═══ PLAYER BARS — LEFT (Team 1) ═══ */}
      <div className="absolute left-0 top-[100px] flex flex-col gap-1">
        {team1Stats.sort((a, b) => (b.kills || 0) - (a.kills || 0)).slice(0, 5).map((p, i) => (
          <div key={`t1-${i}`} className="flex items-center bg-[#0A0A0A]/80 border-l-2 border-[#A855F7]/40 pl-2 pr-4 py-1.5 min-w-[280px]"
            style={{ animationDelay: `${i * 50}ms` }}>
            <div className="w-[120px] truncate">
              <span className="text-white text-[0.7rem] font-medium">{p.name}</span>
            </div>
            <div className="flex items-center gap-3 ml-auto text-[0.65rem]">
              <span className="text-green-400 font-mono">{p.kills || 0}</span>
              <span className="text-gray-500">/</span>
              <span className="text-red-400 font-mono">{p.deaths || 0}</span>
              <span className="text-gray-500">/</span>
              <span className="text-yellow-400 font-mono">{p.assists || 0}</span>
              {p.headshot_kills > 0 && (
                <span className="text-[#A855F7] text-[0.6rem]">🎯{p.headshot_kills}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ═══ PLAYER BARS — RIGHT (Team 2) ═══ */}
      <div className="absolute right-0 top-[100px] flex flex-col gap-1 items-end">
        {team2Stats.sort((a, b) => (b.kills || 0) - (a.kills || 0)).slice(0, 5).map((p, i) => (
          <div key={`t2-${i}`} className="flex items-center bg-[#0A0A0A]/80 border-r-2 border-[#A855F7]/40 pr-2 pl-4 py-1.5 w-[280px]"
            style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-center gap-3 text-[0.65rem]">
              <span className="text-green-400 font-mono">{p.kills || 0}</span>
              <span className="text-gray-500">/</span>
              <span className="text-red-400 font-mono">{p.deaths || 0}</span>
              <span className="text-gray-500">/</span>
              <span className="text-yellow-400 font-mono">{p.assists || 0}</span>
              {p.headshot_kills > 0 && (
                <span className="text-[#A855F7] text-[0.6rem]">🎯{p.headshot_kills}</span>
              )}
            </div>
            <div className="w-[120px] truncate text-right ml-auto">
              <span className="text-white text-[0.7rem] font-medium">{p.name}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ KILL FEED — TOP RIGHT ═══ */}
      <div className="absolute top-[100px] right-[320px] flex flex-col gap-1 items-end">
        {recentKills.map((kill) => {
          const fadeAge = (Date.now() - kill.timestamp) / 5000;
          const opacity = Math.max(0, 1 - fadeAge);
          return (
            <div key={kill.id} className="flex items-center gap-2 bg-[#0A0A0A]/90 px-3 py-1.5 border border-white/10 transition-opacity"
              style={{ opacity }}>
              <span className={`text-[0.7rem] font-medium ${kill.attackerSide === "CT" ? "text-blue-400" : "text-yellow-400"}`}>
                {kill.attacker}
              </span>
              <span className="text-gray-400 text-[0.6rem]">
                {kill.headshot && "HS "}
                [{WEAPON_SHORT[kill.weapon] || kill.weapon}]
              </span>
              <span className="text-red-400 text-[0.65rem]">✕</span>
              <span className={`text-[0.7rem] font-medium ${kill.victimSide === "CT" ? "text-blue-400" : "text-yellow-400"}`}>
                {kill.victim}
              </span>
            </div>
          );
        })}
      </div>

      {/* ═══ BOMB INDICATOR ═══ */}
      {bombState === "planted" && (
        <div className="absolute bottom-[100px] left-1/2 -translate-x-1/2 flex items-center gap-3 bg-red-900/80 border border-red-500/60 px-6 py-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span className="text-red-400 text-lg font-bold tracking-wider">BOMB PLANTED</span>
          <div className="w-[200px] h-2 bg-red-900/50 rounded-full overflow-hidden ml-2">
            <div className="h-full bg-red-500 rounded-full transition-all duration-100"
              style={{ width: `${(bombTimer / 40) * 100}%` }} />
          </div>
          <span className="text-red-300 font-mono text-sm">{bombTimer.toFixed(1)}s</span>
        </div>
      )}

      {bombState === "defused" && (
        <div className="absolute bottom-[100px] left-1/2 -translate-x-1/2 bg-blue-900/80 border border-blue-500/60 px-6 py-3">
          <span className="text-blue-400 text-lg font-bold tracking-wider">BOMB DEFUSED</span>
        </div>
      )}

      {/* ═══ ROUND HISTORY — BOTTOM CENTER ═══ */}
      {mapStats.length > 0 && (
        <div className="absolute bottom-[40px] left-1/2 -translate-x-1/2 flex items-center gap-4 bg-[#0A0A0A]/80 px-4 py-2">
          {mapStats.map((ms, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-white/60 text-[0.6rem]">{ms.map_name?.replace("de_", "")}</span>
              <span className="text-white font-mono text-sm">{ms.team1_score}:{ms.team2_score}</span>
            </div>
          ))}
        </div>
      )}

      {/* ═══ SPONSOR BAR — BOTTOM ═══ */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <span className="text-[#A855F7]/60 text-[0.6rem] tracking-[0.4em]">ORBITAL ROXA</span>
        <span className="text-white/20 text-[0.5rem]">•</span>
        <span className="text-white/30 text-[0.55rem]">orbitalroxa.com.br</span>
      </div>

      {/* ═══ CONNECTION STATUS ═══ */}
      {!connected && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-900/90 border border-red-500 px-8 py-4">
          <span className="text-red-400 font-bold tracking-wider animate-pulse">SEM CONEXÃO</span>
        </div>
      )}
    </div>
  );
}
