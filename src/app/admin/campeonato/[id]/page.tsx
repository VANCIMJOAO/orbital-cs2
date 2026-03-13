import { getTournamentsFromDB } from "@/lib/tournaments-db";
import { MissionControlContent } from "./mission-control-content";

export const revalidate = 5;

export default async function MissionControlPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const tournaments = await getTournamentsFromDB().catch(() => []);
  const tournament = tournaments.find(t => t.id === id) || null;

  if (!tournament) {
    return (
      <div className="py-20 text-center">
        <p className="font-[family-name:var(--font-orbitron)] text-orbital-text-dim">
          Campeonato não encontrado
        </p>
      </div>
    );
  }

  return <MissionControlContent initialTournament={tournament} />;
}
