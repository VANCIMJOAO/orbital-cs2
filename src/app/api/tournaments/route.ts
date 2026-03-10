import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { Tournament } from "@/lib/tournament";

const DATA_DIR = join(process.cwd(), "data");
const TOURNAMENTS_FILE = join(DATA_DIR, "tournaments.json");

async function ensureDataDir() {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch { /* exists */ }
}

async function loadTournaments(): Promise<Tournament[]> {
  await ensureDataDir();
  try {
    const data = await readFile(TOURNAMENTS_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function saveTournaments(tournaments: Tournament[]) {
  await ensureDataDir();
  await writeFile(TOURNAMENTS_FILE, JSON.stringify(tournaments, null, 2));
}

export async function GET() {
  const tournaments = await loadTournaments();
  return NextResponse.json({ tournaments });
}

export async function POST(req: NextRequest) {
  const tournament: Tournament = await req.json();
  const tournaments = await loadTournaments();
  tournaments.push(tournament);
  await saveTournaments(tournaments);
  return NextResponse.json({ tournament }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const updated: Tournament = await req.json();
  const tournaments = await loadTournaments();
  const idx = tournaments.findIndex(t => t.id === updated.id);
  if (idx === -1) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  tournaments[idx] = updated;
  await saveTournaments(tournaments);
  return NextResponse.json({ tournament: updated });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const tournaments = await loadTournaments();
  const filtered = tournaments.filter(t => t.id !== id);
  await saveTournaments(filtered);
  return NextResponse.json({ ok: true });
}
