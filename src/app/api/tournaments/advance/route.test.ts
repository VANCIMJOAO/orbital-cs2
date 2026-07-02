import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { generateDoubleEliminationBracket, type Tournament, type TournamentTeam } from "@/lib/tournament";

const { getTournamentsFromDB, saveTournamentToDB, getMatch } = vi.hoisted(() => ({
  getTournamentsFromDB: vi.fn(),
  saveTournamentToDB: vi.fn(),
  getMatch: vi.fn(),
}));
vi.mock("@/lib/tournaments-db", () => ({ getTournamentsFromDB, saveTournamentToDB, dbPool: { query: vi.fn() } }));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, getMatch };
});

import { POST, GET } from "./route";

const teams: TournamentTeam[] = Array.from({ length: 8 }, (_, i) => ({ id: i + 1, name: `Team ${i + 1}`, tag: `T${i + 1}`, seed: i + 1 }));

function liveTournament(id = "t-live", matchId = 500): Tournament {
  const matches = generateDoubleEliminationBracket(teams);
  const wqf1 = matches.find(m => m.bracket === "winner" && m.round === 1)!;
  wqf1.status = "live";
  wqf1.match_id = matchId;
  return { id, name: "Live Cup", format: "double_elimination", teams, matches, status: "active" } as Tournament;
}

function mkPost(body?: unknown): NextRequest {
  return { json: async () => body ?? {}, nextUrl: new URL("http://localhost/api/tournaments/advance") } as unknown as NextRequest;
}
function mkGet(url = "http://localhost/api/tournaments/advance"): NextRequest {
  return { nextUrl: new URL(url) } as unknown as NextRequest;
}

const finishedG5 = (t: Tournament) => {
  const wqf1 = t.matches.find(m => m.status === "live")!;
  return {
    match: {
      id: wqf1.match_id, end_time: "2026-07-12T20:00:00Z", winner: wqf1.team1_id,
      team1_id: wqf1.team1_id, team2_id: wqf1.team2_id, team1_score: 13, team2_score: 7,
    },
  };
};

beforeEach(() => {
  getTournamentsFromDB.mockReset();
  saveTournamentToDB.mockReset();
  getMatch.mockReset();
  saveTournamentToDB.mockResolvedValue(true);
});

describe("POST /api/tournaments/advance", () => {
  it("sem torneios com partida live → não faz nada", async () => {
    const t = liveTournament();
    t.matches.forEach(m => { m.status = "pending"; m.match_id = null; });
    getTournamentsFromDB.mockResolvedValue([t]);
    const body = await (await POST(mkPost())).json();
    expect(body).toEqual({ checked: 0, advanced: [] });
    expect(getMatch).not.toHaveBeenCalled();
    expect(saveTournamentToDB).not.toHaveBeenCalled();
  });

  it("torneio finished é ignorado mesmo com match live", async () => {
    const t = liveTournament();
    t.status = "finished";
    getTournamentsFromDB.mockResolvedValue([t]);
    const body = await (await POST(mkPost())).json();
    expect(body.checked).toBe(0);
  });

  it("partida terminada no G5API → avança o bracket e salva (o servidor decide o vencedor)", async () => {
    const t = liveTournament();
    const expectedWinner = t.matches.find(m => m.status === "live")!.team1_id; // bracket é sorteado
    getTournamentsFromDB.mockResolvedValue([t]);
    getMatch.mockResolvedValue(finishedG5(t));
    const body = await (await POST(mkPost())).json();
    expect(body.advanced).toEqual(["t-live"]);
    expect(saveTournamentToDB).toHaveBeenCalledTimes(1);
    const saved = saveTournamentToDB.mock.calls[0][0] as Tournament;
    const wqf1 = saved.matches.find(m => m.match_id === 500)!;
    expect(wqf1.status).toBe("finished");
    expect(wqf1.winner_id).toBe(expectedWinner); // vencedor veio do G5API, não do cliente
  });

  it("partida ainda rolando (sem end_time) → checa mas não salva", async () => {
    const t = liveTournament();
    getTournamentsFromDB.mockResolvedValue([t]);
    getMatch.mockResolvedValue({ match: { end_time: null, winner: null, team1_id: 1, team2_id: 2, team1_score: 5, team2_score: 3 } });
    const body = await (await POST(mkPost())).json();
    expect(body).toEqual({ checked: 1, advanced: [] });
    expect(saveTournamentToDB).not.toHaveBeenCalled();
  });

  it("tournamentId filtra o alvo (não mexe nos outros)", async () => {
    const a = liveTournament("t-a", 500);
    const b = liveTournament("t-b", 600);
    getTournamentsFromDB.mockResolvedValue([a, b]);
    getMatch.mockResolvedValue(finishedG5(a));
    const body = await (await POST(mkPost({ tournamentId: "t-a" }))).json();
    expect(body.checked).toBe(1);
    expect(body.advanced).toEqual(["t-a"]);
  });

  it("G5API fora do ar → responde sem crash e sem salvar", async () => {
    const t = liveTournament();
    getTournamentsFromDB.mockResolvedValue([t]);
    getMatch.mockRejectedValue(new Error("ECONNREFUSED"));
    const res = await POST(mkPost());
    expect(res.status).toBe(200);
    expect((await res.json()).advanced).toEqual([]);
    expect(saveTournamentToDB).not.toHaveBeenCalled();
  });

  it("SEGURANÇA: body malicioso não injeta nada — só o id é lido", async () => {
    const t = liveTournament();
    const expectedWinner = t.matches.find(m => m.status === "live")!.team1_id;
    getTournamentsFromDB.mockResolvedValue([t]);
    getMatch.mockResolvedValue(finishedG5(t));
    // tenta injetar um "torneio" e um "vencedor" — devem ser ignorados
    const body = await (await POST(mkPost({
      tournamentId: "t-live",
      tournament: { id: "t-live", status: "finished", matches: [] },
      winnerId: 999,
    }))).json();
    const saved = saveTournamentToDB.mock.calls[0][0] as Tournament;
    expect(saved.matches.find(m => m.match_id === 500)!.winner_id).toBe(expectedWinner); // do G5API, não 999
    expect(body.advanced).toEqual(["t-live"]);
  });
});

describe("GET /api/tournaments/advance (cron/health)", () => {
  it("funciona igual ao POST, com filtro por query", async () => {
    const t = liveTournament("t-cron", 700);
    getTournamentsFromDB.mockResolvedValue([t]);
    getMatch.mockResolvedValue(finishedG5(t));
    const body = await (await GET(mkGet("http://localhost/api/tournaments/advance?tournament_id=t-cron"))).json();
    expect(body.advanced).toEqual(["t-cron"]);
  });
});
