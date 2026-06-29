"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Tournament } from "@/lib/tournament";
import { getTeams } from "@/lib/api";
import { MAP_IMAGES } from "@/lib/maps";
import { OWP_CSS } from "@/lib/owp-styles";

type TeamsMap = Record<number, { name: string; logo: string | null }>;
type Filter = "all" | "active" | "pending" | "finished";

const MAP_BG = [MAP_IMAGES.de_mirage, MAP_IMAGES.de_inferno, MAP_IMAGES.de_nuke, MAP_IMAGES.de_ancient, MAP_IMAGES.de_anubis, MAP_IMAGES.de_dust2];

export default function CampeonatosPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [, setTeamsMap] = useState<TeamsMap>({});
  const [inscritosCount, setInscritosCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [tourRes, teamsRes, countsRes] = await Promise.all([
          fetch("/api/tournaments").then(r => r.json()),
          getTeams(),
          fetch("/api/inscricao?counts=1").then(r => r.json()).catch(() => ({ counts: {} })),
        ]);
        if (!active) return;
        setTournaments(tourRes.tournaments || []);
        const map: TeamsMap = {};
        (teamsRes.teams || []).forEach((t: { id: number; name: string; logo: string | null }) => { map[t.id] = { name: t.name, logo: t.logo }; });
        setTeamsMap(map);
        setInscritosCount(countsRes.counts || {});
      } catch { /* */ }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="owp">
        <style>{OWP_CSS}</style>
        <div className="loading"><div className="spin" />Carregando campeonatos…</div>
      </div>
    );
  }

  const filtered = tournaments.filter(t => filter === "all" || t.status === filter);
  const chips: { v: Filter; label: string }[] = [
    { v: "all", label: "Todos" },
    { v: "active", label: "Ao Vivo" },
    { v: "pending", label: "Inscrições" },
    { v: "finished", label: "Finalizados" },
  ];

  return (
    <div className="owp">
      <style>{OWP_CSS}</style>

      <header className="pagehead">
        <h1>Campeonatos</h1>
        <p>TODA A HISTÓRIA COMPETITIVA DA ORBITAL ROXA · ELIMINAÇÃO DUPLA · PRESENCIAL</p>
      </header>

      <div className="wrap">
        <section className="sec" style={{ paddingTop: 24 }}>
          <div className="chips" style={{ marginBottom: 30 }}>
            {chips.map(c => (
              <span key={c.v} className={`chip ${filter === c.v ? "on" : ""}`} onClick={() => setFilter(c.v)}>{c.label}</span>
            ))}
          </div>

          {filtered.length > 0 ? (
            <div className="grid g3">
              {filtered.map((t, i) => (
                <TournamentCard key={t.id} t={t} inscritos={inscritosCount[t.id] ?? 0} bg={MAP_BG[i % MAP_BG.length]} />
              ))}
            </div>
          ) : (
            <div className="empty">
              {tournaments.length === 0 ? "Nenhum campeonato registrado ainda." : "Nenhum campeonato corresponde ao filtro."}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function TournamentCard({ t, inscritos, bg }: { t: Tournament; inscritos: number; bg: string }) {
  const teamsCount = t.teams.length || inscritos;
  const gf = t.matches.find(m => m.bracket === "grand_final" || m.id === "GF");
  const winnerId = gf?.winner_id;
  const winner = winnerId ? t.teams.find(tm => tm.id === winnerId) : null;

  const dateLabel = t.start_date
    ? new Date(t.start_date + "T00:00:00").toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).toUpperCase().replace(".", "")
    : "A DEFINIR";

  const pill = t.status === "finished"
    ? <span className="tag gold">FINALIZADO</span>
    : t.status === "active"
      ? <span className="tag live">AO VIVO</span>
      : <span className="tag or">INSCRIÇÕES</span>;

  const champrow = t.status === "finished" && winner
    ? <div className="champrow">🏆 CAMPEÃO <b>{winner.name}</b></div>
    : t.status === "active"
      ? <div className="champrow" style={{ color: "var(--or2)" }}>⚡ EM ANDAMENTO</div>
      : <div className="champrow" style={{ color: "var(--or2)" }}>⚡ INSCRIÇÕES ABERTAS</div>;

  const btn = t.status === "finished"
    ? <span className="btn sm">Ver detalhes →</span>
    : t.status === "active"
      ? <span className="btn sm prim">Acompanhar →</span>
      : <span className="btn sm prim">Ver campeonato →</span>;

  return (
    <Link href={`/campeonato/${t.id}`} className="ecard">
      <div className="top" style={{ backgroundImage: `url('${bg}')` }}>
        <span className="pill">{pill}</span>
        <span className="nm">{t.name}</span>
      </div>
      <div className="body">
        {champrow}
        <div className="stats">
          {t.status === "pending"
            ? <><span><b>8</b> VAGAS</span><span><b className="orange">{inscritos}</b> INSCRITOS</span></>
            : <span><b>{teamsCount}</b> TIMES</span>}
          <span>DUPLA</span>
          <span>{t.location ? t.location.toUpperCase() : "PRESENCIAL"}</span>
        </div>
        <div className="actrow">
          <span className="muted" style={{ fontFamily: "var(--font-jetbrains)", fontSize: 10, letterSpacing: ".06em" }}>{dateLabel}</span>
          {btn}
        </div>
      </div>
    </Link>
  );
}
