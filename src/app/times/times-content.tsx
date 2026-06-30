"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Team } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { OWP_CSS } from "@/lib/owp-styles";

const initial = (s?: string | null) => (s || "?").trim().charAt(0).toUpperCase() || "?";

const TIMES_CSS = `
.owp .fbar{display:flex;align-items:center;gap:10px;margin-bottom:30px}
.owp .fbar .fi{font-family:var(--mono);font-size:13px;color:var(--faint);margin-right:2px}
.owp .fchip{display:inline-flex;align-items:center;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--dim);background:var(--panel);border:1px solid var(--line);padding:8px 14px;cursor:pointer;transition:.15s;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px)}
.owp .fchip:hover{color:var(--tx);border-color:var(--line-or)}
.owp .fchip.on{background:var(--or);color:#1a0d06;border-color:var(--or)}

.owp .tcard{position:relative;display:flex;flex-direction:column;background:var(--panel);border:1px solid var(--line);border-top:2px solid var(--line-or);clip-path:polygon(0 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%);transition:.16s}
.owp .tcard:hover{border-color:var(--line-or);border-top-color:var(--or);transform:translateY(-3px)}
.owp .thead{display:flex;align-items:center;gap:14px;padding:18px 18px 0}
.owp .tlogo{width:50px;height:50px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:#0d0712;border:1px solid var(--or);clip-path:polygon(0 0,100% 0,100% 80%,80% 100%,0 100%);overflow:hidden;position:relative}
.owp .tlogo span{font-family:var(--cond);font-size:27px;color:var(--or2);line-height:1}
.owp .tlogo img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:8px}
.owp .tname{min-width:0}
.owp .tname h3{font-family:var(--cond);font-size:21px;line-height:.95;letter-spacing:.02em;text-transform:uppercase;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:.15s}
.owp .tcard:hover .tname h3{color:var(--or2)}
.owp .tname .tg{display:flex;align-items:center;gap:8px;font-family:var(--mono);font-size:10px;letter-spacing:.1em;color:var(--dim);margin-top:5px}
.owp .tname .tg b{color:var(--or2)}
.owp .rlbl{display:flex;align-items:center;gap:10px;padding:18px 18px 11px;font-family:var(--mono);font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--or2)}
.owp .rlbl::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,var(--line-or),transparent)}
.owp .roster{display:flex;flex-direction:column;gap:5px;padding:0 18px 20px}
.owp .prow{display:flex;align-items:center;gap:11px;background:var(--bg2);border-left:2px solid var(--line-or);padding:9px 13px;font-family:var(--mono);font-size:12.5px;color:var(--tx);transition:.13s;clip-path:polygon(0 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%)}
.owp .prow .pic{width:22px;height:22px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:#0d0712;border:1px solid var(--line);font-family:var(--cond);font-size:12px;color:var(--faint);clip-path:polygon(0 0,100% 0,100% 76%,76% 100%,0 100%)}
.owp .prow .nk{flex:1;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
`;

export function TimesContent({ teams }: { teams: Team[] }) {
  const [showMine, setShowMine] = useState(false);
  const { user } = useAuth();

  const filtered = showMine && user ? teams.filter(t => t.user_id === user.id) : teams;

  return (
    <div className="owp">
      <style>{OWP_CSS + TIMES_CSS}</style>

      <header className="pagehead">
        <div className="lbl"><b>Comunidade</b></div>
        <h1>Todos os <span style={{ color: "var(--or)" }}>Times</span></h1>
        <p>{teams.length} {teams.length === 1 ? "TIME REGISTRADO" : "TIMES REGISTRADOS"} NA PLATAFORMA</p>
      </header>

      <div className="wrap">
        <section className="sec" style={{ paddingTop: 18 }}>
          {user && (
            <div className="fbar">
              <span className="fi">⛃</span>
              <span className={`fchip ${!showMine ? "on" : ""}`} onClick={() => setShowMine(false)}>Todos</span>
              <span className={`fchip ${showMine ? "on" : ""}`} onClick={() => setShowMine(true)}>Meus Times</span>
            </div>
          )}

          {filtered.length > 0 ? (
            <div className="grid g3">
              {filtered.map(team => <TeamCard key={team.id} team={team} />)}
            </div>
          ) : (
            <div className="empty">{showMine ? "Você não possui times." : "Nenhum time registrado ainda."}</div>
          )}
        </section>
      </div>
    </div>
  );
}

function TeamCard({ team }: { team: Team }) {
  const players = team.auth_name
    ? Object.entries(team.auth_name).map(([steamId, val]) => [steamId, typeof val === "string" ? val : val.name] as [string, string])
    : [];

  return (
    <Link href={`/times/${team.id}`} className="tcard">
      <div className="thead">
        <span className="tlogo">
          {team.logo
            ? <Image src={team.logo} alt={team.name} width={50} height={50} className="object-contain" unoptimized />
            : <span>{initial(team.tag || team.name)}</span>}
        </span>
        <div className="tname">
          <h3>{team.name}</h3>
          <div className="tg">{team.tag && <b>[{team.tag}]</b>}{team.flag && <span>{team.flag}</span>}</div>
        </div>
      </div>
      {players.length > 0 && (
        <>
          <div className="rlbl">Roster ({players.length})</div>
          <div className="roster">
            {players.map(([steamId, name]) => (
              <div key={steamId} className="prow"><span className="pic">{initial(name)}</span><span className="nk">{name}</span></div>
            ))}
          </div>
        </>
      )}
    </Link>
  );
}
