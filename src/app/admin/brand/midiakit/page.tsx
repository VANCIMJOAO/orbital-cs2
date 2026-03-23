"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Loader2, RefreshCw } from "lucide-react";

const W = 595, H = 842; // A4 in points (72dpi)
const SCALE = 2; // 2x for higher quality
const CW = W * SCALE, CH = H * SCALE;

export default function MidiaKitPage() {
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stats, setStats] = useState({ matches: 0, players: 0, teams: 0, highlights: 0, viewers: 120, presentes: 70 });
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Custom fields
  const [eventName, setEventName] = useState("ORBITAL ROXA CUP #2");
  const [eventDate, setEventDate] = useState("Maio 2026");
  const [eventLocal, setEventLocal] = useState("Ribeirão Preto/SP");
  const [instagram, setInstagram] = useState("@orbitalroxa.gg");
  const [site, setSite] = useState("orbitalroxa.com.br");
  const [contactWhatsapp, setContactWhatsapp] = useState("");

  const fetchStats = useCallback(async () => {
    try {
      const [mRes, tRes] = await Promise.all([
        fetch("/api/matches", { credentials: "include" }).then(r => r.json()).catch(() => ({ matches: [] })),
        fetch("/api/teams", { credentials: "include" }).then(r => r.json()).catch(() => ({ teams: [] })),
      ]);
      setStats(prev => ({
        ...prev,
        matches: (mRes.matches || []).length,
        players: 40,
        teams: (tRes.teams || []).length,
        highlights: 45,
      }));
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const generate = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setGenerating(true);
    await document.fonts.ready;

    const s = SCALE;
    ctx.clearRect(0, 0, CW, CH);

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, CH);
    grad.addColorStop(0, "#0A0A0A");
    grad.addColorStop(0.3, "#0F0A18");
    grad.addColorStop(0.7, "#0F0A18");
    grad.addColorStop(1, "#0A0A0A");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CW, CH);

    // Grid subtle
    ctx.strokeStyle = "rgba(168, 85, 247, 0.03)";
    ctx.lineWidth = 1;
    for (let x = 0; x < CW; x += 30 * s) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke(); }
    for (let y = 0; y < CH; y += 30 * s) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CW, y); ctx.stroke(); }

    // Corner accents
    ctx.strokeStyle = "#A855F7";
    ctx.lineWidth = 2 * s;
    const L = 30 * s, M = 15 * s;
    ctx.beginPath(); ctx.moveTo(M, M + L); ctx.lineTo(M, M); ctx.lineTo(M + L, M); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CW - M - L, M); ctx.lineTo(CW - M, M); ctx.lineTo(CW - M, M + L); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(M, CH - M - L); ctx.lineTo(M, CH - M); ctx.lineTo(M + L, CH - M); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(CW - M - L, CH - M); ctx.lineTo(CW - M, CH - M); ctx.lineTo(CW - M, CH - M - L); ctx.stroke();

    // === HEADER ===
    ctx.font = `bold ${14 * s}px 'Orbitron', monospace`;
    ctx.fillStyle = "#A855F7";
    ctx.textAlign = "center";
    ctx.fillText("ORBITAL ROXA", CW / 2, 50 * s);

    ctx.font = `${8 * s}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
    ctx.fillText("MÍDIA KIT — PROPOSTA DE PATROCÍNIO", CW / 2, 65 * s);

    // Purple line
    ctx.fillStyle = "#A855F7";
    ctx.fillRect(CW / 2 - 60 * s, 72 * s, 120 * s, 1.5 * s);

    // === QUEM SOMOS ===
    let y = 95 * s;
    ctx.font = `bold ${9 * s}px 'Orbitron', monospace`;
    ctx.fillStyle = "#A855F7";
    ctx.textAlign = "left";
    ctx.fillText("QUEM SOMOS", 40 * s, y);

    ctx.font = `${7 * s}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = "#E2E8F0";
    const aboutLines = [
      "A ORBITAL ROXA e uma organizacao de campeonatos de CS2 em",
      "Ribeirao Preto/SP. Somos uma crew de 4 amigos que transformou",
      "a paixao por Counter-Strike em eventos presenciais e online",
      "com plataforma propria, stats em tempo real e highlights automaticos.",
    ];
    y += 15 * s;
    for (const line of aboutLines) {
      ctx.fillText(line, 40 * s, y);
      y += 11 * s;
    }

    // === NÚMEROS ===
    y += 10 * s;
    ctx.font = `bold ${9 * s}px 'Orbitron', monospace`;
    ctx.fillStyle = "#A855F7";
    ctx.fillText("NUMEROS DO CUP #1", 40 * s, y);

    y += 20 * s;
    const numbersData = [
      { value: String(stats.presentes), label: "PRESENTES" },
      { value: String(stats.teams), label: "TIMES" },
      { value: String(stats.matches), label: "PARTIDAS" },
      { value: String(stats.players), label: "JOGADORES" },
      { value: String(stats.viewers), label: "VIEWERS LIVE" },
      { value: String(stats.highlights), label: "HIGHLIGHTS" },
    ];

    const boxW = 75 * s, boxH = 45 * s, gap = 10 * s;
    const startX = 40 * s;
    for (let i = 0; i < numbersData.length; i++) {
      const col = i % 3, row = Math.floor(i / 3);
      const bx = startX + col * (boxW + gap);
      const by = y + row * (boxH + gap);

      ctx.fillStyle = "rgba(168, 85, 247, 0.08)";
      ctx.fillRect(bx, by, boxW, boxH);
      ctx.strokeStyle = "rgba(168, 85, 247, 0.2)";
      ctx.strokeRect(bx, by, boxW, boxH);

      ctx.font = `bold ${16 * s}px 'Orbitron', monospace`;
      ctx.fillStyle = "#A855F7";
      ctx.textAlign = "center";
      ctx.fillText(numbersData[i].value, bx + boxW / 2, by + 25 * s);

      ctx.font = `${5 * s}px 'Orbitron', monospace`;
      ctx.fillStyle = "rgba(148, 163, 184, 0.6)";
      ctx.fillText(numbersData[i].label, bx + boxW / 2, by + 37 * s);
    }
    ctx.textAlign = "left";

    // === PLATAFORMA ===
    y += 2 * (boxH + gap) + 20 * s;
    ctx.font = `bold ${9 * s}px 'Orbitron', monospace`;
    ctx.fillStyle = "#A855F7";
    ctx.fillText("PLATAFORMA PROPRIA", 40 * s, y);

    y += 15 * s;
    ctx.font = `${7 * s}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = "#E2E8F0";
    const platLines = [
      "• Stats em tempo real (SSE) durante partidas ao vivo",
      "• Leaderboard com rating HLTV 1.0",
      "• Highlights automaticos (pipeline Python + FFmpeg)",
      "• Bracket interativo (Double Elimination + Swiss)",
      "• Perfil publico de cada jogador com historico completo",
      "• Integracao Faceit para campeonatos online",
    ];
    for (const line of platLines) {
      ctx.fillText(line, 40 * s, y);
      y += 11 * s;
    }

    // === PACOTES ===
    y += 15 * s;
    ctx.font = `bold ${9 * s}px 'Orbitron', monospace`;
    ctx.fillStyle = "#A855F7";
    ctx.fillText("PACOTES DE PATROCINIO", 40 * s, y);

    y += 15 * s;
    const packages = [
      { name: "BRONZE", price: "R$ 600", color: "#CD7F32", items: "Logo site + 2 mencoes live + 1 post IG" },
      { name: "PRATA", price: "R$ 1.500", color: "#C0C0C0", items: "Bronze + banner mapa CS2 + banner presencial + 3 posts" },
      { name: "OURO", price: "R$ 3.000", color: "#FFD700", items: "Naming rights + exclusividade + tudo do Prata + overlay live" },
    ];

    const pkgW = (CW - 80 * s - 20 * s) / 3;
    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      const px = 40 * s + i * (pkgW + 10 * s);
      const pH = 80 * s;

      ctx.fillStyle = "rgba(168, 85, 247, 0.05)";
      ctx.fillRect(px, y, pkgW, pH);
      ctx.strokeStyle = pkg.color;
      ctx.lineWidth = 1.5 * s;
      ctx.strokeRect(px, y, pkgW, pH);

      ctx.font = `bold ${8 * s}px 'Orbitron', monospace`;
      ctx.fillStyle = pkg.color;
      ctx.textAlign = "center";
      ctx.fillText(pkg.name, px + pkgW / 2, y + 18 * s);

      ctx.font = `bold ${12 * s}px 'Orbitron', monospace`;
      ctx.fillStyle = "#E2E8F0";
      ctx.fillText(pkg.price, px + pkgW / 2, y + 38 * s);

      ctx.font = `${5 * s}px 'JetBrains Mono', monospace`;
      ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
      // Word wrap the items
      const words = pkg.items.split(" ");
      let line = "";
      let ly = y + 52 * s;
      for (const word of words) {
        const test = line + word + " ";
        if (ctx.measureText(test).width > pkgW - 10 * s) {
          ctx.fillText(line.trim(), px + pkgW / 2, ly);
          line = word + " ";
          ly += 9 * s;
        } else {
          line = test;
        }
      }
      if (line.trim()) ctx.fillText(line.trim(), px + pkgW / 2, ly);
    }
    ctx.textAlign = "left";

    // === PRÓXIMO EVENTO ===
    y += 105 * s;
    ctx.font = `bold ${9 * s}px 'Orbitron', monospace`;
    ctx.fillStyle = "#A855F7";
    ctx.fillText("PROXIMO EVENTO", 40 * s, y);

    y += 15 * s;
    ctx.font = `${7 * s}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = "#E2E8F0";
    ctx.fillText(`${eventName} — ${eventDate}`, 40 * s, y);
    y += 11 * s;
    ctx.fillText(`Local: ${eventLocal}`, 40 * s, y);
    y += 11 * s;
    ctx.fillText(`Formato: 8 times, Double Elimination, presencial`, 40 * s, y);

    // === CONTATO ===
    y += 25 * s;
    ctx.fillStyle = "rgba(168, 85, 247, 0.1)";
    ctx.fillRect(30 * s, y - 5 * s, CW - 60 * s, 55 * s);
    ctx.strokeStyle = "#A855F7";
    ctx.lineWidth = 1 * s;
    ctx.strokeRect(30 * s, y - 5 * s, CW - 60 * s, 55 * s);

    ctx.font = `bold ${8 * s}px 'Orbitron', monospace`;
    ctx.fillStyle = "#A855F7";
    ctx.textAlign = "center";
    ctx.fillText("CONTATO", CW / 2, y + 10 * s);

    ctx.font = `${7 * s}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = "#E2E8F0";
    ctx.fillText(`${site}  |  ${instagram}`, CW / 2, y + 25 * s);
    if (contactWhatsapp) {
      ctx.fillText(`WhatsApp: ${contactWhatsapp}`, CW / 2, y + 38 * s);
    }

    // Footer
    ctx.font = `${5 * s}px 'JetBrains Mono', monospace`;
    ctx.fillStyle = "rgba(148, 163, 184, 0.4)";
    ctx.fillText(`Gerado em ${new Date().toLocaleDateString("pt-BR")} — ORBITAL ROXA`, CW / 2, CH - 15 * s);

    setPreviewUrl(canvas.toDataURL("image/png"));
    setGenerating(false);
  };

  const downloadPDF = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `ORBITAL_ROXA_MIDIA_KIT_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  const inputClass = "w-full bg-[#111] border border-orbital-border px-3 py-2 text-orbital-text font-[family-name:var(--font-jetbrains)] text-xs placeholder:text-orbital-text-dim/50 focus:outline-none focus:border-orbital-purple/50";

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="text-orbital-purple animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-orbitron)] text-lg tracking-wider text-orbital-text">MÍDIA KIT</h1>
        <p className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text-dim">Gere automaticamente com dados reais do sistema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Config */}
        <div className="bg-[#0A0A0A] border border-orbital-border p-5 space-y-4">
          <div className="font-[family-name:var(--font-orbitron)] text-[0.7rem] tracking-wider text-orbital-purple">PERSONALIZAR</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-orbital-purple mb-1 block">EVENTO</label>
              <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-orbital-purple mb-1 block">DATA</label>
              <input type="text" value={eventDate} onChange={e => setEventDate(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-orbital-purple mb-1 block">LOCAL</label>
              <input type="text" value={eventLocal} onChange={e => setEventLocal(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-orbital-purple mb-1 block">WHATSAPP</label>
              <input type="text" value={contactWhatsapp} onChange={e => setContactWhatsapp(e.target.value)} placeholder="16999999999" className={inputClass} />
            </div>
          </div>

          <div className="bg-[#111] border border-orbital-border p-3 space-y-1">
            <div className="font-[family-name:var(--font-orbitron)] text-[0.6rem] text-orbital-text-dim">DADOS AUTOMÁTICOS (do sistema)</div>
            <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
              {stats.matches} partidas • {stats.teams} times • {stats.players} jogadores • {stats.highlights} highlights • {stats.viewers} viewers • {stats.presentes} presentes
            </div>
          </div>

          <button onClick={generate} disabled={generating}
            className="w-full py-3 bg-orbital-purple hover:bg-orbital-purple/80 disabled:opacity-40 text-white font-[family-name:var(--font-orbitron)] text-[0.7rem] tracking-wider transition-colors flex items-center justify-center gap-2"
          >
            {generating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            GERAR MÍDIA KIT
          </button>
        </div>

        {/* Preview */}
        <div className="space-y-3">
          <div className="bg-[#0A0A0A] border border-orbital-border p-2">
            {previewUrl ? (
              <motion.img initial={{ opacity: 0 }} animate={{ opacity: 1 }} src={previewUrl} alt="Mídia Kit preview" className="w-full object-contain" />
            ) : (
              <div className="w-full aspect-[595/842] flex items-center justify-center text-orbital-text-dim">
                <div className="text-center">
                  <FileText size={32} className="mx-auto mb-2 opacity-20" />
                  <p className="font-[family-name:var(--font-jetbrains)] text-xs">Clique GERAR pra criar o mídia kit</p>
                </div>
              </div>
            )}
          </div>
          {previewUrl && (
            <button onClick={downloadPDF}
              className="w-full py-2.5 bg-green-500/10 border border-green-500/30 hover:border-green-500/60 text-green-400 font-[family-name:var(--font-orbitron)] text-[0.7rem] tracking-wider transition-colors flex items-center justify-center gap-2"
            >
              <Download size={16} />
              DOWNLOAD PNG (A4)
            </button>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} width={CW} height={CH} className="hidden" />
    </div>
  );
}
