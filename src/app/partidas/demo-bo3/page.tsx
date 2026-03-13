"use client";

import { MatchDetailContent } from "../[id]/match-detail-content";
import { Match, PlayerStats, MapStats, Team } from "@/lib/api";

// ══════════════════════════════════════════
// FAKE DATA — BO3 Demo Page
// DARK KNIGHTS 2 x 1 PHANTOM SQUAD
// Map 1: Inferno 13-10 (DK win)
// Map 2: Mirage 8-13 (PS win)
// Map 3: Nuke 13-7 (DK win)
// ══════════════════════════════════════════

const TEAM1_ID = 101;
const TEAM2_ID = 102;

const fakeMatch: Match = {
  id: 999,
  user_id: 1,
  server_id: 1,
  team1_id: TEAM1_ID,
  team2_id: TEAM2_ID,
  winner: TEAM1_ID,
  team1_score: 2,
  team2_score: 1,
  team1_string: "DARK KNIGHTS",
  team2_string: "PHANTOM SQUAD",
  num_maps: 3,
  max_maps: 3,
  skip_veto: false,
  veto_first: "team1",
  side_type: "standard",
  players_per_team: 5,
  min_player_ready: 5,
  season_id: null,
  is_pug: false,
  start_time: "2026-03-12T20:00:00Z",
  end_time: "2026-03-12T23:45:00Z",
  max_rounds: 24,
  title: "ORBITAL CUP #1 — Grand Final",
  cancelled: false,
  forfeit: false,
  status: 2,
};

const fakeTeam1: Team = {
  id: TEAM1_ID,
  user_id: 1,
  name: "DARK KNIGHTS",
  tag: "DK",
  flag: "BR",
  logo: null,
  public_team: true,
  auth_name: {},
};

const fakeTeam2: Team = {
  id: TEAM2_ID,
  user_id: 1,
  name: "PHANTOM SQUAD",
  tag: "PS",
  flag: "BR",
  logo: null,
  public_team: true,
  auth_name: {},
};

// Map Stats IDs (used for tab filtering)
const MAP1_ID = 501;
const MAP2_ID = 502;
const MAP3_ID = 503;

const fakeMapStats: MapStats[] = [
  {
    id: MAP1_ID,
    match_id: 999,
    winner: TEAM1_ID,
    map_number: 0,
    map_name: "de_inferno",
    team1_score: 13,
    team2_score: 10,
    start_time: "2026-03-12T20:05:00Z",
    end_time: "2026-03-12T21:10:00Z",
    demoFile: "demo_fake.dem.zip",
  },
  {
    id: MAP2_ID,
    match_id: 999,
    winner: TEAM2_ID,
    map_number: 1,
    map_name: "de_mirage",
    team1_score: 8,
    team2_score: 13,
    start_time: "2026-03-12T21:20:00Z",
    end_time: "2026-03-12T22:15:00Z",
    demoFile: "demo_fake.dem.zip",
  },
  {
    id: MAP3_ID,
    match_id: 999,
    winner: TEAM1_ID,
    map_number: 2,
    map_name: "de_nuke",
    team1_score: 13,
    team2_score: 7,
    start_time: "2026-03-12T22:25:00Z",
    end_time: "2026-03-12T23:45:00Z",
    demoFile: "demo_fake.dem.zip",
  },
];

// ── Player Stats (per map) ──
function makeStats(
  mapId: number,
  teamId: number,
  steamId: string,
  name: string,
  kills: number,
  deaths: number,
  assists: number,
  hs: number,
  damage: number,
  rating: number,
  roundsplayed: number,
): PlayerStats {
  return {
    id: Math.random() * 10000 | 0,
    match_id: 999,
    map_id: mapId,
    team_id: teamId,
    steam_id: steamId,
    name,
    kills,
    deaths,
    assists,
    flash_assists: Math.floor(Math.random() * 5),
    headshot_kills: hs,
    roundsplayed,
    damage: damage * roundsplayed,
    rating,
    kdr: parseFloat((kills / Math.max(deaths, 1)).toFixed(2)),
    fba: Math.floor(Math.random() * 4),
    firstkill_t: Math.floor(Math.random() * 5),
    firstkill_ct: Math.floor(Math.random() * 5),
    firstdeath_t: Math.floor(Math.random() * 3),
    firstdeath_ct: Math.floor(Math.random() * 3),
    kast: 65 + Math.floor(Math.random() * 25),
    contribution_score: kills * 2 + assists,
    mvp: Math.floor(Math.random() * 6),
    k1: Math.floor(Math.random() * 8),
    k2: Math.floor(Math.random() * 5),
    k3: Math.floor(Math.random() * 3),
    k4: Math.floor(Math.random() * 2),
    k5: Math.random() > 0.85 ? 1 : 0,
  };
}

// DK Players: vcm, renzo, n4styy, kabal, frost
// PS Players: zk, mruica, snappy, drex, volt

const fakePlayerStats: PlayerStats[] = [
  // ── MAP 1: INFERNO (DK 13-10) ──
  makeStats(MAP1_ID, TEAM1_ID, "76561198001", "vcm", 25, 14, 6, 15, 92, 1.35, 23),
  makeStats(MAP1_ID, TEAM1_ID, "76561198002", "renzo", 22, 16, 4, 13, 85, 1.18, 23),
  makeStats(MAP1_ID, TEAM1_ID, "76561198003", "n4styy", 18, 15, 7, 10, 78, 1.05, 23),
  makeStats(MAP1_ID, TEAM1_ID, "76561198004", "kabal", 16, 17, 5, 8, 72, 0.92, 23),
  makeStats(MAP1_ID, TEAM1_ID, "76561198005", "frost", 14, 18, 3, 7, 65, 0.78, 23),

  makeStats(MAP1_ID, TEAM2_ID, "76561199001", "zk", 20, 18, 5, 12, 88, 1.08, 23),
  makeStats(MAP1_ID, TEAM2_ID, "76561199002", "mruica", 19, 19, 6, 11, 80, 0.98, 23),
  makeStats(MAP1_ID, TEAM2_ID, "76561199003", "snappy", 17, 20, 4, 10, 75, 0.85, 23),
  makeStats(MAP1_ID, TEAM2_ID, "76561199004", "drex", 14, 19, 3, 6, 68, 0.72, 23),
  makeStats(MAP1_ID, TEAM2_ID, "76561199005", "volt", 12, 19, 2, 5, 58, 0.65, 23),

  // ── MAP 2: MIRAGE (PS 13-8) ──
  makeStats(MAP2_ID, TEAM1_ID, "76561198001", "vcm", 13, 18, 4, 7, 71, 0.72, 21),
  makeStats(MAP2_ID, TEAM1_ID, "76561198002", "renzo", 15, 16, 3, 9, 78, 0.88, 21),
  makeStats(MAP2_ID, TEAM1_ID, "76561198003", "n4styy", 10, 17, 5, 5, 62, 0.62, 21),
  makeStats(MAP2_ID, TEAM1_ID, "76561198004", "kabal", 12, 18, 2, 6, 65, 0.68, 21),
  makeStats(MAP2_ID, TEAM1_ID, "76561198005", "frost", 8, 19, 4, 3, 55, 0.48, 21),

  makeStats(MAP2_ID, TEAM2_ID, "76561199001", "zk", 24, 12, 5, 16, 102, 1.45, 21),
  makeStats(MAP2_ID, TEAM2_ID, "76561199002", "mruica", 20, 11, 7, 12, 90, 1.28, 21),
  makeStats(MAP2_ID, TEAM2_ID, "76561199003", "snappy", 18, 13, 4, 10, 82, 1.12, 21),
  makeStats(MAP2_ID, TEAM2_ID, "76561199004", "drex", 16, 14, 3, 8, 75, 0.95, 21),
  makeStats(MAP2_ID, TEAM2_ID, "76561199005", "volt", 10, 8, 6, 4, 60, 0.82, 21),

  // ── MAP 3: NUKE (DK 13-7) ──
  makeStats(MAP3_ID, TEAM1_ID, "76561198001", "vcm", 28, 10, 5, 18, 105, 1.52, 20),
  makeStats(MAP3_ID, TEAM1_ID, "76561198002", "renzo", 20, 12, 6, 12, 88, 1.22, 20),
  makeStats(MAP3_ID, TEAM1_ID, "76561198003", "n4styy", 17, 14, 4, 9, 80, 1.02, 20),
  makeStats(MAP3_ID, TEAM1_ID, "76561198004", "kabal", 15, 13, 3, 7, 72, 0.95, 20),
  makeStats(MAP3_ID, TEAM1_ID, "76561198005", "frost", 12, 15, 7, 5, 65, 0.78, 20),

  makeStats(MAP3_ID, TEAM2_ID, "76561199001", "zk", 15, 18, 3, 8, 75, 0.82, 20),
  makeStats(MAP3_ID, TEAM2_ID, "76561199002", "mruica", 13, 19, 4, 7, 68, 0.70, 20),
  makeStats(MAP3_ID, TEAM2_ID, "76561199003", "snappy", 12, 20, 2, 6, 62, 0.58, 20),
  makeStats(MAP3_ID, TEAM2_ID, "76561199004", "drex", 11, 18, 5, 4, 58, 0.55, 20),
  makeStats(MAP3_ID, TEAM2_ID, "76561199005", "volt", 9, 17, 3, 3, 50, 0.48, 20),
];

const fakeVetoes = [
  { id: 1, match_id: 999, team_name: "DARK KNIGHTS", map: "de_dust2", pick_or_ban: "ban" },
  { id: 2, match_id: 999, team_name: "PHANTOM SQUAD", map: "de_ancient", pick_or_ban: "ban" },
  { id: 3, match_id: 999, team_name: "DARK KNIGHTS", map: "de_inferno", pick_or_ban: "pick" },
  { id: 4, match_id: 999, team_name: "PHANTOM SQUAD", map: "de_mirage", pick_or_ban: "pick" },
  { id: 5, match_id: 999, team_name: "DARK KNIGHTS", map: "de_overpass", pick_or_ban: "ban" },
  { id: 6, match_id: 999, team_name: "PHANTOM SQUAD", map: "de_vertigo", pick_or_ban: "ban" },
];

export default function DemoBO3Page() {
  return (
    <MatchDetailContent
      match={fakeMatch}
      playerStats={fakePlayerStats}
      mapStats={fakeMapStats}
      team1={fakeTeam1}
      team2={fakeTeam2}
      server={null}
      bracketMatch={{
        id: "gf",
        round: 3,
        position: 0,
        label: "Grand Final",
        team1_id: TEAM1_ID,
        team2_id: TEAM2_ID,
        winner_id: TEAM1_ID,
        status: "finished",
        match_id: 999,
        veto_actions: fakeVetoes.map(v => ({
          team_name: v.team_name,
          action: v.pick_or_ban as "ban" | "pick",
          map: v.map,
        })),
      }}
      tournamentName="ORBITAL CUP #1"
    />
  );
}
