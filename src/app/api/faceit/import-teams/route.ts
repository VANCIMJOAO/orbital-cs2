import { NextRequest, NextResponse } from "next/server";
import { checkAdmin } from "../../brand/auth";

const G5API_URL =
  process.env.NEXT_PUBLIC_G5API_URL ||
  "https://g5api-production-998f.up.railway.app";

interface ImportTeamRequest {
  name: string;
  tag: string;
  members: {
    steam_id: string;
    nickname: string;
  }[];
}

// POST — cadastrar times da Faceit no G5API automaticamente
export async function POST(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;
  const cookie = req.cookies.get("G5API")?.value;

  try {
    const { teams } = (await req.json()) as { teams: ImportTeamRequest[] };

    if (!Array.isArray(teams) || teams.length === 0) {
      return NextResponse.json({ error: "Nenhum time pra importar" }, { status: 400 });
    }

    // Buscar times existentes pra evitar duplicatas
    const existingRes = await fetch(`${G5API_URL}/teams`, {
      headers: { "Content-Type": "application/json" },
    });
    const existingData = await existingRes.json();
    const existingTeams = existingData.teams || [];

    // Map de steam_ids existentes por time
    const existingSteamMap = new Map<string, number>();
    for (const t of existingTeams) {
      if (t.auth_name && typeof t.auth_name === "object") {
        for (const steamId of Object.keys(t.auth_name)) {
          existingSteamMap.set(steamId, t.id);
        }
      }
    }

    const results: { name: string; team_id: number | null; status: "created" | "exists" | "error"; error?: string }[] = [];

    for (const team of teams) {
      // Checar se time já existe (pela maioria dos steam IDs)
      const steamIds = team.members.filter(m => m.steam_id).map(m => m.steam_id);
      const matchCounts = new Map<number, number>();
      for (const sid of steamIds) {
        const tid = existingSteamMap.get(sid);
        if (tid) matchCounts.set(tid, (matchCounts.get(tid) || 0) + 1);
      }

      // Se 3+ jogadores já estão num time existente, pula
      let existingTeamId: number | null = null;
      for (const [tid, count] of matchCounts) {
        if (count >= 3) {
          existingTeamId = tid;
          break;
        }
      }

      if (existingTeamId) {
        results.push({ name: team.name, team_id: existingTeamId, status: "exists" });
        continue;
      }

      // Criar time no G5API
      try {
        const authName: Record<string, { name: string; captain: number; coach: number }> = {};
        for (const m of team.members) {
          if (m.steam_id) {
            authName[m.steam_id] = { name: m.nickname, captain: 0, coach: 0 };
          }
        }

        const res = await fetch(`${G5API_URL}/teams`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: `G5API=${cookie}`,
          },
          body: JSON.stringify([{
            name: team.name,
            tag: team.tag,
            flag: "BR",
            public_team: true,
            auth_name: authName,
          }]),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          results.push({ name: team.name, team_id: null, status: "error", error: `${res.status}: ${errText}` });
          continue;
        }

        const data = await res.json();
        const teamId = data.id || data.team?.id;
        results.push({ name: team.name, team_id: teamId, status: "created" });

        // Atualizar mapa pra evitar duplicata nos próximos
        for (const sid of steamIds) {
          if (teamId) existingSteamMap.set(sid, teamId);
        }
      } catch (err) {
        results.push({ name: team.name, team_id: null, status: "error", error: err instanceof Error ? err.message : "Erro" });
      }
    }

    const created = results.filter(r => r.status === "created").length;
    const existing = results.filter(r => r.status === "exists").length;
    const errors = results.filter(r => r.status === "error").length;

    return NextResponse.json({
      results,
      summary: { created, existing, errors, total: teams.length },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao importar times";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
