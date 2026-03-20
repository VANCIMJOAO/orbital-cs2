// Calcula awards automáticos baseado nos player stats do campeonato
import type { PlayerStats } from "./api";

// Calcula rating HLTV 1.0 simplificado quando o campo rating não vem da API
function calcRating(s: { kills: number; deaths: number; assists: number; roundsplayed: number; damage: number; k3: number; k4: number; k5: number; firstkill_t: number; firstkill_ct: number }): number {
  const r = s.roundsplayed || 1;
  const killRating = s.kills / r / 0.679;
  const survivalRating = (r - s.deaths) / r / 0.317;
  const multiKillBonus = (s.k3 * 0.5 + s.k4 * 1 + s.k5 * 2) / r;
  const impactRating = ((s.firstkill_t + s.firstkill_ct) * 0.15 + s.damage / r * 0.003 + multiKillBonus) * 1.2;
  return (killRating + 0.7 * survivalRating + impactRating) / 2.7;
}

export interface Award {
  id: string;
  title: string;
  emoji: string;
  playerName: string;
  steamId: string;
  value: string;
  description: string;
}

export function calculateAwards(allStats: PlayerStats[]): Award[] {
  if (allStats.length === 0) return [];

  // Agregar stats por jogador (steam_id)
  const playerMap = new Map<string, {
    name: string;
    steamId: string;
    kills: number;
    deaths: number;
    assists: number;
    headshot_kills: number;
    damage: number;
    roundsplayed: number;
    firstkill_t: number;
    firstkill_ct: number;
    k3: number;
    k4: number;
    k5: number;
    mvp: number;
    flash_assists: number;
    maps: number;
    ratingSum: number;
    kast: number;
  }>();

  for (const s of allStats) {
    const existing = playerMap.get(s.steam_id);
    if (!existing) {
      playerMap.set(s.steam_id, {
        name: s.name,
        steamId: s.steam_id,
        kills: s.kills,
        deaths: s.deaths,
        assists: s.assists,
        headshot_kills: s.headshot_kills,
        damage: s.damage,
        roundsplayed: s.roundsplayed,
        firstkill_t: s.firstkill_t,
        firstkill_ct: s.firstkill_ct,
        k3: s.k3,
        k4: s.k4,
        k5: s.k5,
        mvp: s.mvp,
        flash_assists: s.flash_assists || 0,
        maps: 1,
        ratingSum: s.rating || calcRating(s),
        kast: s.kast || 0,
      });
    } else {
      existing.kills += s.kills;
      existing.deaths += s.deaths;
      existing.assists += s.assists;
      existing.headshot_kills += s.headshot_kills;
      existing.damage += s.damage;
      existing.roundsplayed += s.roundsplayed;
      existing.firstkill_t += s.firstkill_t;
      existing.firstkill_ct += s.firstkill_ct;
      existing.k3 += s.k3;
      existing.k4 += s.k4;
      existing.k5 += s.k5;
      existing.mvp += s.mvp;
      existing.flash_assists += (s.flash_assists || 0);
      existing.maps += 1;
      existing.ratingSum += (s.rating || calcRating(s));
      existing.kast += (s.kast || 0);
      // Keep latest name
      if (s.name) existing.name = s.name;
    }
  }

  const players = Array.from(playerMap.values());
  if (players.length === 0) return [];

  const awards: Award[] = [];

  // MVP — Melhor rating médio
  const byRating = [...players].sort((a, b) => (b.ratingSum / b.maps) - (a.ratingSum / a.maps));
  if (byRating[0]) {
    const p = byRating[0];
    const avgRating = (p.ratingSum / p.maps).toFixed(2);
    awards.push({
      id: "mvp",
      title: "MVP",
      emoji: "🏆",
      playerName: p.name,
      steamId: p.steamId,
      value: `${avgRating} rating`,
      description: "Melhor rating médio do campeonato",
    });
  }

  // Entry King — Mais first kills
  const byEntry = [...players].sort((a, b) => (b.firstkill_t + b.firstkill_ct) - (a.firstkill_t + a.firstkill_ct));
  if (byEntry[0] && (byEntry[0].firstkill_t + byEntry[0].firstkill_ct) > 0) {
    const p = byEntry[0];
    awards.push({
      id: "entry_king",
      title: "ENTRY KING",
      emoji: "⚡",
      playerName: p.name,
      steamId: p.steamId,
      value: `${p.firstkill_t + p.firstkill_ct} entries`,
      description: "Mais first kills do campeonato",
    });
  }

  // Headshot Machine — Maior HS%
  const byHS = [...players].filter(p => p.kills >= 20).sort((a, b) => (b.headshot_kills / b.kills) - (a.headshot_kills / a.kills));
  if (byHS[0]) {
    const p = byHS[0];
    const hsp = Math.round((p.headshot_kills / p.kills) * 100);
    awards.push({
      id: "hs_machine",
      title: "HEADSHOT MACHINE",
      emoji: "🎯",
      playerName: p.name,
      steamId: p.steamId,
      value: `${hsp}% HS`,
      description: "Maior percentual de headshots",
    });
  }

  // Kill Machine — Mais kills totais
  const byKills = [...players].sort((a, b) => b.kills - a.kills);
  if (byKills[0]) {
    const p = byKills[0];
    awards.push({
      id: "kill_machine",
      title: "KILL MACHINE",
      emoji: "💀",
      playerName: p.name,
      steamId: p.steamId,
      value: `${p.kills} kills`,
      description: "Mais kills totais do campeonato",
    });
  }

  // Multi-Kill King — Mais 3k/4k/5k
  const byMulti = [...players].sort((a, b) => (b.k3 + b.k4 * 2 + b.k5 * 3) - (a.k3 + a.k4 * 2 + a.k5 * 3));
  if (byMulti[0] && (byMulti[0].k3 + byMulti[0].k4 + byMulti[0].k5) > 0) {
    const p = byMulti[0];
    const parts = [];
    if (p.k5 > 0) parts.push(`${p.k5} ACE`);
    if (p.k4 > 0) parts.push(`${p.k4} 4K`);
    if (p.k3 > 0) parts.push(`${p.k3} 3K`);
    awards.push({
      id: "multi_king",
      title: "MULTI-KILL KING",
      emoji: "🔥",
      playerName: p.name,
      steamId: p.steamId,
      value: parts.join(", "),
      description: "Mais multi-kills (3K/4K/ACE)",
    });
  }

  // Utility Master — Mais flash assists + util damage
  const byUtil = [...players].sort((a, b) => b.flash_assists - a.flash_assists);
  if (byUtil[0] && byUtil[0].flash_assists > 0) {
    const p = byUtil[0];
    awards.push({
      id: "utility_master",
      title: "UTILITY MASTER",
      emoji: "💡",
      playerName: p.name,
      steamId: p.steamId,
      value: `${p.flash_assists} flash assists`,
      description: "Mais flash assists do campeonato",
    });
  }

  return awards;
}
