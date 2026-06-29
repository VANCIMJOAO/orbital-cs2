// ===================================================================
// ORBITAL ROXA — Overworld Design System (escopado em .owp)
// Use em páginas client: <div className="owp"><style>{OWP_CSS}</style> ...
// Fontes via vars globais do layout: --font-russo, --font-anton,
// --font-chakra, --font-jetbrains.
// ===================================================================
export const OWP_CSS = `
.owp{--bg:#1B0F23;--bg2:#150A1D;--panel:#22132E;--panel2:#2A1838;
  --line:rgba(255,255,255,.09);--line-or:rgba(255,90,31,.32);
  --tx:#F3ECF7;--dim:#9C8AAE;--faint:#6B5A7C;
  --or:#FF5A1F;--or2:#FF8A3D;--vio:#7C5CFF;--vio2:#A892FF;
  --gold:#FFC24B;--ok:#54E08A;--live:#FF3B57;--stroke:#241038;
  --disp:var(--font-russo),sans-serif;--cond:var(--font-anton),sans-serif;
  --body:var(--font-chakra),sans-serif;--mono:var(--font-jetbrains),monospace;
  background:var(--bg);color:var(--tx);font-family:var(--body);min-height:100vh;
  background-image:radial-gradient(120% 70% at 85% -4%,rgba(255,90,31,.16),transparent 55%),
    radial-gradient(90% 60% at 0% 0%,rgba(124,92,255,.14),transparent 55%);
  padding-bottom:80px;margin-top:-5rem;padding-top:5rem}
.owp *{box-sizing:border-box}
.owp .wrap{padding:0 clamp(20px,3.2vw,72px)}
.owp a{color:inherit;text-decoration:none}
.owp img{display:block}
.owp .muted{color:var(--dim)}.owp .faint{color:var(--faint)}
.owp .ok{color:var(--ok)}.owp .lo{color:#FF7A8C}.owp .orange{color:var(--or)}.owp .gold{color:var(--gold)}

.owp .blade{font-family:var(--disp);color:#fff;-webkit-text-stroke:4px var(--stroke);paint-order:stroke fill;text-transform:uppercase;line-height:.84;letter-spacing:.005em}
.owp .lbl{display:flex;align-items:center;gap:13px;margin-bottom:20px}
.owp .lbl b{font-family:var(--disp);font-size:15px;letter-spacing:.04em;text-transform:uppercase;color:#fff;-webkit-text-stroke:2px var(--stroke);paint-order:stroke fill;font-weight:400}
.owp .lbl::before{content:'';width:0;height:0;border-style:solid;border-width:7px 0 7px 11px;border-color:transparent transparent transparent var(--or)}
.owp .lbl::after{content:'';flex:1;height:2px;background:linear-gradient(90deg,var(--line-or),transparent)}
.owp .lbl.hasmore::after{display:none}
.owp .lbl .more{margin-left:auto;font-family:var(--cond);font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--or2);cursor:pointer;transition:.15s}
.owp .lbl .more:hover{color:#fff}
.owp .sec{padding:34px 0}

.owp .hh{cursor:help;border-bottom:1px dotted var(--faint)}
.owp .info{display:inline-flex;align-items:center;justify-content:center;width:13px;height:13px;margin-left:5px;border:1px solid var(--faint);border-radius:50%;font-family:var(--mono);font-size:8px;font-weight:700;color:var(--dim);vertical-align:middle;cursor:help;line-height:1}
.owp .info:hover{border-color:var(--or);color:var(--or)}
.owp-tip{position:fixed;z-index:9999;max-width:240px;background:var(--panel2);border:1px solid var(--or);color:var(--tx);font-family:var(--font-chakra),sans-serif;font-weight:500;font-size:11.5px;line-height:1.42;text-align:left;padding:11px 13px;clip-path:polygon(0 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%);box-shadow:0 14px 38px -10px rgba(0,0,0,.8);pointer-events:none}
.owp-tip-arrow{position:absolute;left:50%;top:100%;transform:translateX(-50%);border:6px solid transparent;border-top-color:var(--or)}

.owp .tag{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#fff;background:rgba(124,92,255,.16);border:1px solid var(--vio);padding:5px 11px;clip-path:polygon(8px 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%,0 8px)}
.owp .tag.soft{background:rgba(255,255,255,.04);border-color:var(--line);color:var(--dim)}
.owp .tag.or{background:rgba(255,90,31,.14);border-color:var(--or);color:var(--or2)}
.owp .tag.gold{background:rgba(255,194,75,.14);border-color:var(--gold);color:var(--gold)}
.owp .tag.ok{background:rgba(84,224,138,.12);border-color:var(--ok);color:var(--ok)}
.owp .tag.lo{background:rgba(255,59,87,.12);border-color:var(--live);color:#FF8A9C}
.owp .tag.live{background:rgba(255,59,87,.16);border-color:var(--live);color:#FF8A9C}
.owp .tag.live::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--live);box-shadow:0 0 8px var(--live);animation:owpblink 1.2s infinite}
@keyframes owpblink{50%{opacity:.3}}
.owp .btn{font-family:var(--cond);font-size:14px;letter-spacing:.06em;text-transform:uppercase;padding:11px 20px;border:1px solid var(--line-or);color:var(--or2);transition:.15s;white-space:nowrap;clip-path:polygon(9px 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%,0 9px);background:rgba(255,90,31,.05);cursor:pointer;display:inline-block}
.owp .btn:hover{background:rgba(255,90,31,.16);border-color:var(--or);color:#fff}
.owp .btn.prim{background:var(--or);color:#1a0d06;border-color:var(--or)}
.owp .btn.prim:hover{background:var(--or2)}
.owp .btn.sm{font-size:12px;padding:8px 14px}
.owp .btn.ghost{background:transparent;border-color:var(--line);color:var(--dim)}
.owp .btn.ghost:hover{border-color:var(--vio);color:#fff}
.owp .chips{display:flex;flex-wrap:wrap;gap:9px}
.owp .chip{font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--dim);background:var(--panel);border:1px solid var(--line);padding:8px 14px;cursor:pointer;transition:.15s;clip-path:polygon(7px 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%,0 7px)}
.owp .chip:hover{color:var(--tx);border-color:var(--line-or)}
.owp .chip.on{background:var(--or);color:#1a0d06;border-color:var(--or)}

.owp .banner{position:relative;overflow:hidden;border-bottom:2px solid var(--or)}
.owp .banner::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,var(--bg) 32%,rgba(27,15,35,.55) 72%,rgba(27,15,35,.85));z-index:0}
.owp .banner .wrap{position:relative;z-index:2;display:flex;align-items:flex-end;gap:30px;padding:40px clamp(20px,3.2vw,72px) 30px;flex-wrap:wrap}
.owp .banner .ghost{position:absolute;right:2vw;bottom:-2.4vw;z-index:1;font-family:var(--disp);font-size:clamp(6rem,15vw,15rem);line-height:.7;color:transparent;-webkit-text-stroke:2px rgba(255,90,31,.15);text-transform:uppercase;pointer-events:none;letter-spacing:-.02em;user-select:none;white-space:nowrap;max-width:62vw;overflow:hidden}
.owp .banner h1{font-family:var(--disp);font-size:clamp(2.4rem,5.4vw,5rem);line-height:.82;text-transform:uppercase;color:#fff;-webkit-text-stroke:3px var(--stroke);paint-order:stroke fill;letter-spacing:-.005em;word-break:break-word;font-weight:400}
.owp .banner .row1{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap}
.owp .banner .meta{display:flex;gap:22px;margin-top:15px;font-family:var(--mono);font-size:11.5px;color:var(--dim);flex-wrap:wrap}
.owp .banner .meta b{color:var(--tx)}
.owp .bnr-rt{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:14px}
.owp .pagehead{padding:40px clamp(20px,3.2vw,72px) 8px}
.owp .pagehead h1{font-family:var(--disp);font-size:clamp(2.4rem,5vw,4.4rem);line-height:.86;text-transform:uppercase;color:#fff;-webkit-text-stroke:3px var(--stroke);paint-order:stroke fill;font-weight:400}
.owp .pagehead p{font-family:var(--mono);font-size:12px;color:var(--dim);margin-top:14px;letter-spacing:.04em}

.owp .frame{position:relative;clip-path:polygon(0 0,100% 0,100% 86%,86% 100%,0 100%);background:linear-gradient(160deg,var(--or),var(--vio));padding:3px}
.owp .frame .ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#0d0712;clip-path:polygon(0 0,100% 0,100% 85%,85% 100%,0 100%)}
.owp .frame .ph img{width:100%;height:100%;object-fit:cover}
.owp .frame.contain .ph img{width:74%;height:74%;object-fit:contain}

.owp .tabs{border-bottom:1px solid var(--line);background:var(--bg2)}
.owp .tabs .wrap{display:flex;gap:30px}
.owp .tabs a{padding:16px 2px;font-family:var(--cond);font-size:15px;letter-spacing:.08em;text-transform:uppercase;color:var(--dim);position:relative;transition:.15s;cursor:pointer}
.owp .tabs a:hover{color:var(--tx)}.owp .tabs a.on{color:#fff}
.owp .tabs a.on::after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:3px;background:var(--or)}
.owp .panel{display:none}.owp .panel.on{display:block}

.owp .strip{display:grid;gap:10px;padding:24px clamp(20px,3.2vw,72px);background:var(--bg2);border-bottom:1px solid var(--line)}
.owp .scell{position:relative;background:var(--panel);padding:18px 20px;border-left:3px solid var(--or);clip-path:polygon(0 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%)}
.owp .scell .k{font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--dim)}
.owp .scell .v{font-family:var(--cond);font-size:clamp(26px,2.4vw,38px);margin-top:6px;line-height:1;color:var(--tx)}
.owp .scell .v small{font-family:var(--mono);font-size:13px;color:var(--dim)}
.owp .scell.ok{border-left-color:var(--ok)}.owp .scell.ok .v{color:var(--ok)}
.owp .scell.danger{border-left-color:var(--live)}.owp .scell.danger .v{color:#FF7A8C}
.owp .scell.acc{border-left-color:var(--gold)}.owp .scell.acc .v{color:var(--gold)}

.owp .card{position:relative;background:var(--panel);border:1px solid var(--line);clip-path:polygon(0 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%);transition:.15s}
.owp .card:hover{border-color:var(--line-or)}
.owp .card.pad{padding:20px}
.owp .card.tab{border-top:2px solid var(--line-or)}
.owp .grid{display:grid;gap:16px}
.owp .g2{grid-template-columns:repeat(2,1fr)}.owp .g3{grid-template-columns:repeat(3,1fr)}.owp .g4{grid-template-columns:repeat(4,1fr)}
.owp .cols{display:grid;gap:22px}.owp .cols.s1{grid-template-columns:1.5fr 1fr}

.owp .tblwrap{background:var(--panel);border:1px solid var(--line);overflow-x:auto}
.owp .tbl{width:100%;border-collapse:collapse;font-family:var(--mono);font-size:12.5px}
.owp .tbl th{font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);font-weight:400;text-align:center;padding:14px 12px;background:var(--bg2);border-bottom:1px solid var(--line);white-space:nowrap}
.owp .tbl th.l,.owp .tbl td.l{text-align:left}
.owp .tbl td{text-align:center;padding:13px 12px;color:var(--tx);white-space:nowrap}
.owp .tbl tr+tr td{border-top:1px solid var(--line)}
.owp .tbl tbody tr:hover td{background:var(--panel2)}
.owp .tbl td.dim{color:var(--dim)}
.owp .tbl td.b{font-family:var(--cond);font-size:16px}
.owp .tbl td.b.hi{color:var(--ok)}.owp .tbl td.b.lo{color:#FF7A8C}
.owp .tbl .pl{display:flex;align-items:center;gap:10px}
.owp .tbl .pl .av{flex:0 0 auto;width:30px;height:30px;overflow:hidden;background:#0d0712;border:1px solid var(--line-or);clip-path:polygon(0 0,100% 0,100% 78%,78% 100%,0 100%)}
.owp .tbl .pl .av img{width:100%;height:100%;object-fit:cover}
.owp .tbl .pl a:not(.av){font-family:var(--cond);font-size:15px;text-transform:uppercase;letter-spacing:.02em;transition:.15s}
.owp .tbl .pl a:not(.av):hover{color:var(--or2)}
.owp .tbl .rank{font-family:var(--disp);font-size:15px;color:var(--faint)}
.owp .tbl .rank.top{color:var(--gold)}
.owp .tbl .badge{font-family:var(--mono);font-size:9px;font-weight:700;letter-spacing:.06em;padding:2px 7px;text-transform:uppercase}
.owp .tbl .badge.cap{background:rgba(255,90,31,.16);border:1px solid var(--or);color:var(--or2)}

.owp .mtbl{background:var(--panel);border:1px solid var(--line)}
.owp .mrow{display:flex;align-items:center;gap:13px;padding:14px 18px;transition:.15s;cursor:pointer}
.owp .mrow:hover{background:var(--panel2)}.owp .mrow+.mrow{border-top:1px solid var(--line)}
.owp .mrow .w{width:4px;height:34px;flex:0 0 auto;transform:skewX(-12deg);background:var(--faint)}
.owp .mrow .w.v{background:var(--ok)}.owp .mrow .w.d{background:var(--live)}.owp .mrow .w.live{background:var(--live)}
.owp .mrow .side{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.owp .mrow .side.r{justify-content:flex-end;text-align:right}
.owp .mrow .tlogo{width:30px;height:30px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;background:var(--bg2);border:1px solid var(--line);font-family:var(--cond);font-size:14px;color:var(--dim)}
.owp .mrow .tlogo img{width:70%;height:70%;object-fit:contain}
.owp .mrow .tn{font-family:var(--cond);font-size:16px;text-transform:uppercase;letter-spacing:.02em;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.owp .mrow .sc{font-family:var(--cond);font-size:20px;color:var(--tx);min-width:84px;text-align:center}
.owp .mrow .sc .x{color:var(--faint);margin:0 6px}
.owp .mrow .meta{font-family:var(--mono);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}

.owp .empty,.owp .none-box{font-family:var(--mono);font-size:12.5px;color:var(--dim);background:var(--panel);border:1px solid var(--line);padding:22px;line-height:1.5}
.owp .none{font-family:var(--mono);font-size:11px;color:var(--faint);text-transform:uppercase;letter-spacing:.06em;padding:18px}

.owp .ecard{position:relative;overflow:hidden;background:var(--panel);border:1px solid var(--line);clip-path:polygon(0 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%);transition:.15s;display:block}
.owp .ecard:hover{border-color:var(--line-or);transform:translateY(-2px)}
.owp .ecard .top{position:relative;height:128px;background-size:cover;background-position:center}
.owp .ecard .top::after{content:'';position:absolute;inset:0;background:linear-gradient(0deg,var(--panel),rgba(27,15,35,.15) 55%,rgba(27,15,35,.5))}
.owp .ecard .top .nm{position:absolute;left:16px;bottom:12px;z-index:2;font-family:var(--disp);font-size:22px;text-transform:uppercase;color:#fff;-webkit-text-stroke:2px var(--stroke);paint-order:stroke fill}
.owp .ecard .top .pill{position:absolute;right:12px;top:12px;z-index:2}
.owp .ecard .body{padding:16px 18px}
.owp .ecard .stats{display:flex;gap:18px;font-family:var(--mono);font-size:11px;color:var(--dim);flex-wrap:wrap}
.owp .ecard .stats b{color:var(--tx)}
.owp .ecard.dim{opacity:.5}
.owp .ecard .champrow{display:flex;align-items:center;gap:8px;font-family:var(--mono);font-size:11px;color:var(--gold);margin-bottom:13px}
.owp .ecard .champrow b{font-family:var(--cond);font-size:16px;letter-spacing:.02em}
.owp .ecard .actrow{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px}

.owp .vgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.owp .vcard{position:relative;aspect-ratio:16/9;overflow:hidden;border:1px solid var(--line-or);clip-path:polygon(0 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%)}
.owp .vcard img{width:100%;height:100%;object-fit:cover;opacity:.78;transition:.2s}
.owp .vcard:hover img{opacity:1;transform:scale(1.04)}
.owp .vcard::after{content:'▶';position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#fff;font-size:26px;background:rgba(27,15,35,.25);text-shadow:0 0 16px var(--or)}
.owp .vcard .tag2{position:absolute;top:10px;left:10px;z-index:3;font-family:var(--cond);font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#1a0d06;background:var(--or);padding:3px 9px;clip-path:polygon(6px 0,100% 0,100% calc(100% - 6px),calc(100% - 6px) 100%,0 100%,0 6px)}
.owp .vcard .views{position:absolute;top:11px;right:11px;z-index:3;font-family:var(--mono);font-size:10px;color:var(--tx);text-shadow:0 1px 4px rgba(0,0,0,.8)}
.owp .vcard .cap{position:absolute;left:0;right:0;bottom:0;padding:10px 12px 16px;background:linear-gradient(0deg,rgba(27,15,35,.96),transparent);font-family:var(--mono);font-size:10px;letter-spacing:.04em;text-transform:uppercase;color:var(--tx);z-index:3}

.owp .pbar{position:relative;height:22px;background:#160c1f;overflow:hidden;transform:skewX(-16deg)}
.owp .pbar i{display:block;height:100%;background:linear-gradient(90deg,var(--or),var(--or2))}
.owp .pbar i.good{background:linear-gradient(90deg,rgba(84,224,138,.45),rgba(84,224,138,.7))}
.owp .pbar i.bad{background:linear-gradient(90deg,rgba(255,59,87,.4),rgba(255,59,87,.65))}
.owp .pbar .pct{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transform:skewX(16deg);font-family:var(--mono);font-size:11px;font-weight:700;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.6)}

.owp .award{position:relative;background:var(--panel);border:1px solid var(--line);border-top:2px solid var(--gold);padding:22px;clip-path:polygon(0 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%)}
.owp .award .ttl{font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
.owp .award .who{display:flex;align-items:center;gap:12px;margin-top:14px}
.owp .award .who .av{width:46px;height:46px;overflow:hidden;border:1px solid var(--line-or);clip-path:polygon(0 0,100% 0,100% 80%,80% 100%,0 100%)}
.owp .award .who .av img{width:100%;height:100%;object-fit:cover}
.owp .award .who .nm{font-family:var(--cond);font-size:22px;text-transform:uppercase;color:#fff}
.owp .award .who .val{margin-left:auto;font-family:var(--cond);font-size:24px;color:var(--gold)}

.owp .bracket{display:flex;gap:34px;overflow-x:auto;padding:8px 2px 18px}
.owp .bcol{display:flex;flex-direction:column;justify-content:space-around;gap:18px;min-width:210px}
.owp .bcol .rnd{font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint);margin-bottom:4px}
.owp .bmatch{background:var(--panel);border:1px solid var(--line);clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)}
.owp .bteam{display:flex;align-items:center;gap:9px;padding:9px 12px;font-family:var(--cond);font-size:14px;text-transform:uppercase;color:var(--dim)}
.owp .bteam+.bteam{border-top:1px solid var(--line)}
.owp .bteam.win{color:#fff}.owp .bteam.win .bsc{color:var(--ok)}
.owp .bteam .blogo{width:20px;height:20px;flex:0 0 auto;background:var(--bg2);border:1px solid var(--line)}
.owp .bteam .bsc{margin-left:auto;font-family:var(--cond);font-size:15px}

.owp .steps{display:flex;gap:0;margin-bottom:30px}
.owp .step{flex:1;text-align:center;padding:14px 8px;font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);border-bottom:2px solid var(--line);position:relative}
.owp .step.on{color:#fff;border-bottom-color:var(--or)}
.owp .step.done{color:var(--ok);border-bottom-color:var(--ok)}
.owp .step .n{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;margin-right:7px;font-family:var(--cond);font-size:13px;background:var(--panel);border:1px solid var(--line)}
.owp .step.on .n{background:var(--or);color:#1a0d06;border-color:var(--or)}
.owp .field{margin-bottom:18px}
.owp .field label{display:block;font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--dim);margin-bottom:8px}
.owp .field input,.owp .field select{width:100%;background:var(--bg2);border:1px solid var(--line);color:var(--tx);font-family:var(--body);font-size:14px;padding:12px 14px;outline:none;transition:.15s}
.owp .field input:focus,.owp .field select:focus{border-color:var(--or)}

.owp .cmp{display:grid;grid-template-columns:1fr 60px 1fr;align-items:center}
.owp .cmp .ck{grid-column:2;text-align:center;font-family:var(--mono);font-size:9.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);padding:12px 4px}
.owp .cmp .cv{font-family:var(--cond);font-size:22px;padding:10px 16px}
.owp .cmp .cv.l{text-align:right}.owp .cmp .cv.r{text-align:left}
.owp .cmp .cv.win{color:var(--or)}

.owp .loading{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:120px 20px;font-family:var(--mono);font-size:12px;color:var(--dim);letter-spacing:.08em;text-transform:uppercase}
.owp .spin{width:42px;height:42px;border:3px solid var(--panel2);border-top-color:var(--or);border-radius:50%;animation:owpspin .8s linear infinite}
@keyframes owpspin{to{transform:rotate(360deg)}}

@media(max-width:1000px){
  .owp .g4{grid-template-columns:repeat(2,1fr)}.owp .g3{grid-template-columns:repeat(2,1fr)}
  .owp .vgrid{grid-template-columns:repeat(2,1fr)}.owp .cols.s1{grid-template-columns:1fr}
}
@media(max-width:560px){
  .owp .g4,.owp .g3,.owp .g2,.owp .vgrid{grid-template-columns:1fr}
  .owp .bnr-rt{margin-left:0;align-items:flex-start;width:100%}
}
`;
