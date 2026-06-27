import { NextRequest, NextResponse } from "next/server";
import { dbPool, getTournamentsFromDB } from "@/lib/tournaments-db";
import { checkAdmin } from "@/lib/check-admin";

let tableReady = false;

// Steam64 ID validation (17 digits starting with 765611)
function isValidSteamId(steamId: string): boolean {
  return /^765611\d{11}$/.test(steamId);
}

// Check for duplicate Steam IDs in roster
function findDuplicateSteamIds(players: { steam_id: string }[], captainSteamId: string): string[] {
  const allIds = [captainSteamId, ...players.map(p => p.steam_id)];
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const id of allIds) {
    if (seen.has(id)) duplicates.push(id);
    seen.add(id);
  }
  return duplicates;
}

async function ensureTable() {
  if (tableReady) return;
  const pool = dbPool;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS inscricoes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tournament_id VARCHAR(36),
      team_name VARCHAR(255) NOT NULL,
      team_tag VARCHAR(20) NOT NULL,
      captain_name VARCHAR(100) NOT NULL,
      captain_steam_id VARCHAR(20) NOT NULL,
      captain_whatsapp VARCHAR(20) NOT NULL,
      players JSON NOT NULL,
      logo_url VARCHAR(512),
      pix_comprovante_url VARCHAR(512),
      team_id INT NULL,
      status ENUM('pendente','aprovado','rejeitado','pago') DEFAULT 'pendente',
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  // Migração: garante team_id em tabelas já existentes (liga inscrição ao time do G5API)
  try {
    await pool.query("ALTER TABLE inscricoes ADD COLUMN team_id INT NULL");
  } catch { /* coluna já existe */ }
  tableReady = true;
}

// GET — listar inscrições (admin) ou verificar vaga
export async function GET(req: NextRequest) {
  await ensureTable();
  const pool = dbPool;

  const tournamentId = req.nextUrl.searchParams.get("tournament_id");
  const checkSlots = req.nextUrl.searchParams.get("check_slots");
  const counts = req.nextUrl.searchParams.get("counts");

  // Público: contagem de inscritos (não-rejeitados) por campeonato — só números
  if (counts) {
    const [rows] = await pool.query(
      "SELECT tournament_id, COUNT(*) AS c FROM inscricoes WHERE status IN ('pendente','aprovado','pago') AND tournament_id IS NOT NULL GROUP BY tournament_id"
    ) as [{ tournament_id: string; c: number }[], unknown];
    const out: Record<string, number> = {};
    for (const r of rows) out[r.tournament_id] = Number(r.c);
    return NextResponse.json({ counts: out });
  }

  // Público: verificar vagas
  if (checkSlots && tournamentId) {
    let maxSlots = 8;
    try {
      const tournaments = await getTournamentsFromDB();
      const tournament = tournaments.find(t => t.id === tournamentId);
      if (tournament?.teams) {
        maxSlots = tournament.teams.length || 8;
      }
    } catch {
      // Fallback to default
    }

    const [rows] = await pool.query(
      "SELECT COUNT(*) as c FROM inscricoes WHERE tournament_id = ? AND status IN ('pendente','aprovado','pago')",
      [tournamentId]
    ) as [{ c: number }[], unknown];
    return NextResponse.json({ count: rows[0].c, maxSlots });
  }

  // Admin: listar todas
  const authError = await checkAdmin(req);
  if (authError) return authError;

  let query = "SELECT * FROM inscricoes ORDER BY created_at DESC";
  const params: string[] = [];
  if (tournamentId) {
    query = "SELECT * FROM inscricoes WHERE tournament_id = ? ORDER BY created_at DESC";
    params.push(tournamentId);
  }

  const [rows] = await pool.query(query, params);
  return NextResponse.json({ inscricoes: rows });
}

// POST — nova inscrição (público)
export async function POST(req: NextRequest) {
  await ensureTable();
  const pool = dbPool;

  try {
    const body = await req.json();
    const { tournament_id, team_name, team_tag, captain_name, captain_steam_id, captain_whatsapp, players, logo_url, pix_comprovante_url } = body;

    if (!team_name || !team_tag || !captain_name || !captain_steam_id || !captain_whatsapp || !players) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    if (!Array.isArray(players) || players.length < 4 || players.length > 6) {
      return NextResponse.json({ error: "Mínimo 4, máximo 6 jogadores" }, { status: 400 });
    }

    // Verificar vagas no servidor (busca limite do torneio ou default 8)
    if (tournament_id) {
      let maxSlots = 8;
      try {
        const tournaments = await getTournamentsFromDB();
        const tournament = tournaments.find(t => t.id === tournament_id);
        if (tournament?.teams) {
          maxSlots = tournament.teams.length || 8;
        }
      } catch {
        // Fallback to default
      }

      const [slotRows] = await pool.query(
        "SELECT COUNT(*) as c FROM inscricoes WHERE tournament_id = ? AND status IN ('pendente','aprovado','pago')",
        [tournament_id]
      ) as [{ c: number }[], unknown];
      if (slotRows[0].c >= maxSlots) {
        return NextResponse.json({ error: `Vagas esgotadas (${maxSlots}/${maxSlots})` }, { status: 409 });
      }
    }

    // Validar Steam IDs - formato e preenchimento
    for (const p of players) {
      if (!p.steam_id || !p.name) {
        return NextResponse.json({ error: "Cada jogador precisa de steam_id e name" }, { status: 400 });
      }
      if (!isValidSteamId(p.steam_id)) {
        return NextResponse.json({ error: `Steam ID inválido: ${p.steam_id} (deve ter 17 dígitos e começar com 765611)` }, { status: 400 });
      }
    }

    // Validar Steam ID do capitão
    if (!isValidSteamId(captain_steam_id)) {
      return NextResponse.json({ error: `Steam ID do capitão inválido: ${captain_steam_id}` }, { status: 400 });
    }

    // Verificar duplicatas no mesmo roster
    const duplicates = findDuplicateSteamIds(players, captain_steam_id);
    if (duplicates.length > 0) {
      return NextResponse.json({ error: `Steam ID duplicado no roster: ${duplicates[0]}` }, { status: 400 });
    }

    // Verificar duplicata (mesmo capitão ou mesmo nome de time)
    const [existing] = await pool.query(
      "SELECT id FROM inscricoes WHERE (captain_steam_id = ? OR team_name = ?) AND tournament_id = ? AND status != 'rejeitado'",
      [captain_steam_id, team_name, tournament_id || null]
    ) as [{ id: number }[], unknown];

    if (existing.length > 0) {
      return NextResponse.json({ error: "Time ou capitão já inscrito neste campeonato" }, { status: 409 });
    }

    // Verificar se jogadores já estão em outros times (mesmo torneio)
    if (tournament_id) {
      const allSteamIds = [captain_steam_id, ...players.map(p => p.steam_id)];
      const [conflictRows] = await pool.query(
        `SELECT team_name, players FROM inscricoes
         WHERE tournament_id = ? AND status != 'rejeitado'`,
        [tournament_id]
      ) as [{ team_name: string; players: string }[], unknown];

      for (const row of conflictRows) {
        const existingPlayers = typeof row.players === "string" ? JSON.parse(row.players) : row.players;
        const existingIds = existingPlayers.map((p: { steam_id: string }) => p.steam_id);
        for (const id of allSteamIds) {
          if (existingIds.includes(id)) {
            return NextResponse.json({
              error: `Jogador ${id} já está inscrito no time "${row.team_name}"`
            }, { status: 409 });
          }
        }
      }
    }

    const [result] = await pool.query(
      `INSERT INTO inscricoes (tournament_id, team_name, team_tag, captain_name, captain_steam_id, captain_whatsapp, players, logo_url, pix_comprovante_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [tournament_id || null, team_name, team_tag, captain_name, captain_steam_id, captain_whatsapp, JSON.stringify(players), logo_url || null, pix_comprovante_url || null]
    ) as [{ insertId: number }, unknown];

    return NextResponse.json({ id: result.insertId, status: "pendente" }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao inscrever";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT — atualizar status (admin)
export async function PUT(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  await ensureTable();
  const pool = dbPool;

  try {
    const { id, status, notes, pix_comprovante_url, team_id, tournament_id } = await req.json();
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

    const updates: string[] = [];
    const params: (string | number | null)[] = [];

    if (status) { updates.push("status = ?"); params.push(status); }
    if (notes !== undefined) { updates.push("notes = ?"); params.push(notes); }
    if (pix_comprovante_url !== undefined) { updates.push("pix_comprovante_url = ?"); params.push(pix_comprovante_url); }
    if (team_id !== undefined) { updates.push("team_id = ?"); params.push(team_id); }
    if (tournament_id !== undefined) { updates.push("tournament_id = ?"); params.push(tournament_id || null); }

    if (updates.length === 0) return NextResponse.json({ error: "Nada pra atualizar" }, { status: 400 });

    params.push(id);
    await pool.query(`UPDATE inscricoes SET ${updates.join(", ")} WHERE id = ?`, params);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE — remover inscrição (admin)
export async function DELETE(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  await ensureTable();
  const pool = dbPool;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  await pool.query("DELETE FROM inscricoes WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}
