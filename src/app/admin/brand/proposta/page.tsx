"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  FileText, Printer, Copy, Loader2, Check, ChevronDown
} from "lucide-react";

interface Sponsor {
  id: number;
  name: string;
}

export default function PropostaPage() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [sponsorName, setSponsorName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [selectedPackage, setSelectedPackage] = useState<"bronze" | "prata" | "ouro">("prata");
  const [copied, setCopied] = useState(false);
  const proposalRef = useRef<HTMLDivElement>(null);

  const fetchSponsors = useCallback(async () => {
    try {
      const res = await fetch("/api/brand/sponsors");
      if (res.ok) {
        const data = await res.json();
        setSponsors((data.sponsors || []).map((s: Sponsor) => ({ id: s.id, name: s.name })));
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSponsors(); }, [fetchSponsors]);

  function handlePrint() {
    window.print();
  }

  function handleCopy() {
    const el = proposalRef.current;
    if (!el) return;
    const text = el.innerText;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const currentMonth = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-orbital-purple animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #proposal-content, #proposal-content * { visibility: visible; }
          #proposal-content {
            position: absolute; left: 0; top: 0; width: 100%;
            background: white !important; color: black !important;
            padding: 40px !important; font-size: 12pt !important;
          }
          #proposal-content h1, #proposal-content h2, #proposal-content h3 {
            color: #333 !important;
          }
          #proposal-content .print-hide { display: none !important; }
          #proposal-content .border-orbital-purple { border-color: #A855F7 !important; }
          #proposal-content .bg-orbital-purple\\/10 { background: #f3e8ff !important; }
        }
      `}</style>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 print-hide">
          <div>
            <h1 className="font-[family-name:var(--font-orbitron)] text-lg tracking-wider text-orbital-text">
              PROPOSTA DE PATROCINIO
            </h1>
            <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-1">
              Template editavel para envio a patrocinadores
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-purple transition-colors"
            >
              <Printer size={12} /> Imprimir / PDF
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 border border-[#1A1A1A] hover:border-[#333] font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim hover:text-orbital-text transition-colors"
            >
              {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
              {copied ? "Copiado!" : "Copiar texto"}
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-[#111] border border-[#1A1A1A] p-4 flex items-end gap-4 flex-wrap print-hide">
          <div>
            <label className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim block mb-1">
              Patrocinador
            </label>
            <div className="flex gap-2">
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) setSponsorName(e.target.value);
                }}
                className="bg-[#0A0A0A] border border-[#1A1A1A] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text focus:outline-none"
              >
                <option value="">Selecionar...</option>
                {sponsors.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
              <input
                value={sponsorName}
                onChange={(e) => setSponsorName(e.target.value)}
                placeholder="ou digite o nome..."
                className="bg-[#0A0A0A] border border-[#1A1A1A] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder-orbital-text-dim/40 focus:outline-none focus:border-orbital-purple/40"
              />
            </div>
          </div>
          <div>
            <label className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim block mb-1">
              Telefone
            </label>
            <input
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="(16) 99999-9999"
              className="bg-[#0A0A0A] border border-[#1A1A1A] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder-orbital-text-dim/40 focus:outline-none focus:border-orbital-purple/40"
            />
          </div>
          <div>
            <label className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim block mb-1">
              Pacote destaque
            </label>
            <select
              value={selectedPackage}
              onChange={(e) => setSelectedPackage(e.target.value as "bronze" | "prata" | "ouro")}
              className="bg-[#0A0A0A] border border-[#1A1A1A] px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text focus:outline-none"
            >
              <option value="bronze">Bronze</option>
              <option value="prata">Prata</option>
              <option value="ouro">Ouro</option>
            </select>
          </div>
        </div>

        {/* Proposal Document */}
        <div id="proposal-content" ref={proposalRef} className="bg-[#111] border border-[#1A1A1A] p-6 md:p-10 space-y-8">
          {/* Header */}
          <div className="text-center border-b border-[#1A1A1A] pb-6">
            <div className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] text-orbital-purple mb-2">
              PROPOSTA DE PATROCINIO
            </div>
            <h2 className="font-[family-name:var(--font-orbitron)] text-xl tracking-wider text-orbital-text">
              ORBITAL ROXA CUP #2
            </h2>
            <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-2">
              Ribeirao Preto, {currentMonth}
            </p>
            {sponsorName && (
              <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text mt-1">
                Para: <span className="text-orbital-purple font-bold">{sponsorName}</span>
              </p>
            )}
          </div>

          {/* Quem Somos */}
          <section>
            <h3 className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-purple mb-3">
              QUEM SOMOS
            </h3>
            <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim leading-relaxed">
              A Orbital Roxa e uma crew de producao de campeonatos de CS2 (Counter-Strike 2) baseada em
              Ribeirao Preto - SP. Organizamos eventos presenciais competitivos com infraestrutura profissional:
              servidor dedicado, transmissao ao vivo, sistema de estatisticas em tempo real e plataforma web propria.
              Nosso primeiro evento, a Orbital Roxa Cup #1, foi um sucesso absoluto e queremos crescer com parceiros que
              acreditam na cena gamer regional.
            </p>
          </section>

          {/* Metricas Cup #1 */}
          <section>
            <h3 className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-purple mb-3">
              METRICAS DO CUP #1
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Jogadores", value: "40" },
                { label: "Presenciais", value: "60+" },
                { label: "Pico Live", value: "120" },
                { label: "Partidas", value: "14" },
              ].map((m) => (
                <div key={m.label} className="text-center p-3 border border-[#1A1A1A]">
                  <div className="font-[family-name:var(--font-orbitron)] text-sm text-orbital-text">{m.value}</div>
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">{m.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Nossa Plataforma */}
          <section>
            <h3 className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-purple mb-3">
              NOSSA PLATAFORMA
            </h3>
            <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim leading-relaxed mb-2">
              O site orbitalroxa.com.br oferece:
            </p>
            <ul className="space-y-1">
              {[
                "Bracket de campeonato em tempo real com double elimination",
                "Estatisticas detalhadas por jogador, partida e mapa",
                "Highlights automaticos gerados a partir das demos",
                "Transmissao ao vivo integrada (Twitch)",
                "Leaderboard com ranking geral e por season",
                "Perfis individuais com historico completo",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-orbital-purple mt-0.5 text-xs">&#9679;</span>
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Cup #2 */}
          <section>
            <h3 className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-purple mb-3">
              CUP #2 — PROJECAO
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Jogadores", value: "80+" },
                { label: "Presenciais", value: "120+" },
                { label: "Pico Live", value: "300+" },
                { label: "Premiacao", value: "R$4k+" },
              ].map((m) => (
                <div key={m.label} className="text-center p-3 border border-[#1A1A1A]">
                  <div className="font-[family-name:var(--font-orbitron)] text-sm text-orbital-purple">{m.value}</div>
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">{m.label}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Pacotes */}
          <section>
            <h3 className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-purple mb-4">
              PACOTES DE PATROCINIO
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Bronze */}
              <div className={`border p-5 space-y-3 transition-colors ${
                selectedPackage === "bronze"
                  ? "border-orbital-purple bg-orbital-purple/5"
                  : "border-[#1A1A1A]"
              }`}>
                <div className="text-center">
                  <div className="font-[family-name:var(--font-orbitron)] text-xs text-amber-700 tracking-wider">BRONZE</div>
                  <div className="font-[family-name:var(--font-orbitron)] text-lg text-orbital-text mt-1">R$ 500</div>
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">ou equivalente em produto</div>
                </div>
                <ul className="space-y-1.5">
                  {["Logo no site", "Mencao na live", "Story no Instagram"].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-green-500 text-xs mt-0.5">&#10003;</span>
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Prata */}
              <div className={`border p-5 space-y-3 transition-colors ${
                selectedPackage === "prata"
                  ? "border-orbital-purple bg-orbital-purple/5"
                  : "border-[#1A1A1A]"
              }`}>
                <div className="text-center">
                  <div className="font-[family-name:var(--font-orbitron)] text-xs text-gray-300 tracking-wider">PRATA</div>
                  <div className="font-[family-name:var(--font-orbitron)] text-lg text-orbital-text mt-1">R$ 1.000</div>
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">ou equivalente em produto</div>
                  {selectedPackage === "prata" && (
                    <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-purple mt-1">RECOMENDADO</div>
                  )}
                </div>
                <ul className="space-y-1.5">
                  {[
                    "Tudo do Bronze",
                    "Banner nos mapas do servidor CS2",
                    "Banner fisico no evento",
                    "Post dedicado no Instagram",
                    "Logo no cracha dos jogadores",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-green-500 text-xs mt-0.5">&#10003;</span>
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Ouro */}
              <div className={`border p-5 space-y-3 transition-colors ${
                selectedPackage === "ouro"
                  ? "border-orbital-purple bg-orbital-purple/5"
                  : "border-[#1A1A1A]"
              }`}>
                <div className="text-center">
                  <div className="font-[family-name:var(--font-orbitron)] text-xs text-yellow-500 tracking-wider">OURO</div>
                  <div className="font-[family-name:var(--font-orbitron)] text-lg text-orbital-text mt-1">R$ 2.000+</div>
                  <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">investimento premium</div>
                </div>
                <ul className="space-y-1.5">
                  {[
                    "Tudo do Prata",
                    "Nome do torneio inclui a marca",
                    "Espaco para distribuicao de produto no evento",
                    "Fotos profissionais no podio com o produto",
                    "Relatorio pos-evento com metricas",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-green-500 text-xs mt-0.5">&#10003;</span>
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Contato */}
          <section className="border-t border-[#1A1A1A] pt-6">
            <h3 className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-purple mb-3">
              CONTATO
            </h3>
            <div className="space-y-1">
              <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">
                Joao Vancim — Producao &amp; Tecnologia
              </p>
              <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
                {contactPhone || "(16) XXXXX-XXXX"}
              </p>
              <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
                jvancim@gmail.com
              </p>
              <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-purple">
                orbitalroxa.com.br
              </p>
              <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
                @orbitalroxa.gg
              </p>
            </div>
          </section>
        </div>
      </motion.div>
    </>
  );
}
