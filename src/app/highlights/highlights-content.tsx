"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { VideoPlayer } from "@/components/video-player";
import type { HighlightClip } from "@/lib/api";
import { OWP_CSS } from "@/lib/owp-styles";

const HL_CSS = `
.owp .hlfilters{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-bottom:26px}
.owp .srch{display:flex;align-items:center;gap:8px;background:var(--bg2);border:1px solid var(--line);padding:9px 13px;min-width:220px}
.owp .srch input{background:transparent;border:0;outline:none;color:var(--tx);font-family:var(--mono);font-size:12px;width:100%}
.owp .srch input::placeholder{color:var(--faint)}
.owp .hlgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.owp .hl{position:relative;background:var(--panel);border:1px solid var(--line-or);overflow:hidden;clip-path:polygon(0 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%);transition:.15s}
.owp .hl:hover{border-color:var(--or)}
.owp .hl .vtag{position:absolute;top:10px;left:10px;z-index:6;pointer-events:none;font-family:var(--cond);font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#1a0d06;background:var(--or);padding:3px 9px;clip-path:polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)}
.owp .hl .vrank{position:absolute;top:11px;right:11px;z-index:6;pointer-events:none;font-family:var(--mono);font-size:10px;color:var(--tx);text-shadow:0 1px 4px rgba(0,0,0,.85)}
.owp .hl .vinfo{padding:11px 13px;border-top:1px solid var(--line)}
.owp .hl .vpl{display:flex;align-items:center;gap:9px;min-width:0}
.owp .hl .vpl a{font-family:var(--cond);font-size:15px;text-transform:uppercase;letter-spacing:.02em;color:#fff;transition:.15s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.owp .hl .vpl a:hover{color:var(--or2)}
.owp .hl .vpl .kt{margin-left:auto;flex:0 0 auto;font-family:var(--mono);font-size:9px;font-weight:700;color:var(--or2);background:rgba(255,90,31,.14);border:1px solid var(--line-or);padding:2px 7px}
.owp .hl .vmt{display:flex;align-items:center;gap:6px;margin-top:7px;font-family:var(--mono);font-size:10px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em;transition:.15s}
.owp .hl .vmt:hover{color:var(--or2)}
.owp .center{text-align:center;margin-top:30px}
.owp .countline{text-align:center;margin-top:14px;font-family:var(--mono);font-size:10px;color:var(--faint);letter-spacing:.06em;text-transform:uppercase}
@media(max-width:1000px){.owp .hlgrid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.owp .hlgrid{grid-template-columns:1fr}}
`;

export function HighlightsContent() {
  const [clips, setClips] = useState<HighlightClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [filterKills, setFilterKills] = useState<"all" | "3k" | "4k" | "ace">("all");
  const PAGE_SIZE = 30;

  const fetchClips = useCallback(async (offset = 0, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const res = await fetch(`/api/highlights/all?limit=${PAGE_SIZE}&offset=${offset}`);
      const data = await res.json();
      const newClips = data.clips || [];
      if (append) setClips(prev => [...prev, ...newClips]); else setClips(newClips);
      setHasMore(newClips.length >= PAGE_SIZE);
    } catch {
      if (!append) setClips([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { (async () => { await fetchClips(); })(); }, [fetchClips]);

  const loadMore = () => { if (!loadingMore && hasMore) fetchClips(clips.length, true); };

  const chips: { v: typeof filterKills; label: string }[] = [
    { v: "all", label: "Todos" }, { v: "3k", label: "3K" }, { v: "4k", label: "4K" }, { v: "ace", label: "Ace (5K)" },
  ];

  const filtered = clips.filter(clip => {
    if (search && !clip.player_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterKills === "3k" && (clip.kills_count || 0) < 3) return false;
    if (filterKills === "4k" && (clip.kills_count || 0) < 4) return false;
    if (filterKills === "ace" && (clip.kills_count || 0) < 5) return false;
    return true;
  });

  return (
    <div className="owp">
      <style>{OWP_CSS + HL_CSS}</style>

      <header className="pagehead">
        <h1>Os Melhores Highlights</h1>
        <p>CLUTCHS, ACES E RETAKES DE TODAS AS PARTIDAS, RECORTADOS AUTOMATICAMENTE · EM VÍDEO</p>
      </header>

      <div className="wrap">
        <section className="sec" style={{ paddingTop: 24 }}>
          {!loading && clips.length > 0 && (
            <div className="hlfilters">
              <span className="srch">
                <span style={{ color: "var(--faint)" }}>⌕</span>
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar jogador..." />
              </span>
              <div className="chips">
                {chips.map(c => (
                  <span key={c.v} className={`chip ${filterKills === c.v ? "on" : ""}`} onClick={() => setFilterKills(c.v)}>{c.label}</span>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="loading"><div className="spin" />Carregando highlights…</div>
          ) : clips.length === 0 ? (
            <div className="empty">Nenhum highlight disponível ainda.</div>
          ) : filtered.length === 0 ? (
            <div className="empty">Nenhum highlight encontrado com esses filtros.</div>
          ) : (
            <>
              <div className="hlgrid">
                {filtered.map(clip => {
                  const tag = clip.kills_count >= 5 ? "ACE" : clip.kills_count >= 2 ? `${clip.kills_count}K` : null;
                  return (
                    <div className="hl" key={clip.id}>
                      {tag && <span className="vtag">{tag}</span>}
                      <span className="vrank">#{clip.rank}</span>
                      <VideoPlayer src={`/api/highlights-proxy/${clip.video_file}`} clipId={clip.id} />
                      <div className="vinfo">
                        <div className="vpl">
                          {clip.steam_id
                            ? <Link href={`/perfil/${clip.steam_id}`}>{clip.player_name || "Player"}</Link>
                            : <span style={{ fontFamily: "var(--font-anton)", fontSize: 15, textTransform: "uppercase", color: "#fff" }}>{clip.player_name || "Player"}</span>}
                          {clip.round_number ? <span className="kt">R{clip.round_number}</span> : null}
                        </div>
                        <Link href={`/partidas/${clip.match_id}`} className="vmt">⚔ {clip.team1_string || "Time 1"} vs {clip.team2_string || "Time 2"}</Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasMore && (
                <div className="center">
                  <button className="btn" onClick={loadMore} disabled={loadingMore}>{loadingMore ? "Carregando…" : "Carregar mais ↓"}</button>
                </div>
              )}
              <div className="countline">{clips.length} highlight{clips.length !== 1 ? "s" : ""} carregado{clips.length !== 1 ? "s" : ""}</div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
