"use client";

import { useState, RefObject } from "react";
import { Download, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";

interface BracketExportButtonProps {
  bracketRef: RefObject<HTMLDivElement | null>;
  tournamentName: string;
}

export function BracketExportButton({ bracketRef, tournamentName }: BracketExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!bracketRef.current || loading) return;
    setLoading(true);

    const el = bracketRef.current;

    // Salvar estado original
    const originalOverflow = el.style.overflow;
    const originalOverflowX = el.style.overflowX;
    const originalPadding = el.style.padding;
    const originalBg = el.style.background;

    try {
      // Temporariamente ajustar o elemento para captura
      el.style.overflow = "visible";
      el.style.overflowX = "visible";
      el.style.background = "#0A0A0A";
      el.style.padding = "16px";

      // Também corrigir overflow em filhos
      const overflowChildren: { el: HTMLElement; overflow: string; overflowX: string }[] = [];
      el.querySelectorAll("*").forEach((child) => {
        const htmlChild = child as HTMLElement;
        const cs = getComputedStyle(htmlChild);
        if (cs.overflowX === "auto" || cs.overflowX === "scroll" ||
            cs.overflow === "auto" || cs.overflow === "scroll") {
          overflowChildren.push({
            el: htmlChild,
            overflow: htmlChild.style.overflow,
            overflowX: htmlChild.style.overflowX,
          });
          htmlChild.style.overflow = "visible";
          htmlChild.style.overflowX = "visible";
        }
      });

      // Adicionar header temporário
      const header = document.createElement("div");
      header.style.cssText = "display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid rgba(168,85,247,0.3)";
      header.innerHTML = `
        <span style="font-family:Orbitron,monospace;font-size:16px;font-weight:800;letter-spacing:0.1em;color:#A855F7;text-transform:uppercase">${tournamentName}</span>
        <span style="font-family:Orbitron,monospace;font-size:11px;letter-spacing:0.15em;color:rgba(255,255,255,0.4)">ORBITAL ROXA</span>
      `;
      el.insertBefore(header, el.firstChild);

      // Adicionar footer temporário
      const footer = document.createElement("div");
      footer.style.cssText = "margin-top:20px;padding-top:12px;border-top:1px solid rgba(168,85,247,0.2);text-align:center;font-family:JetBrains Mono,monospace;font-size:10px;letter-spacing:0.1em;color:rgba(255,255,255,0.3)";
      footer.textContent = "orbitalroxa.com.br";
      el.appendChild(footer);

      // Capturar
      let dataUrl: string;
      try {
        dataUrl = await toPng(el, {
          pixelRatio: 2,
          backgroundColor: "#0A0A0A",
          style: {
            overflow: "visible",
          },
        });
      } finally {
        // Sempre remover header/footer temporários e restaurar estilos
        if (header.parentNode) el.removeChild(header);
        if (footer.parentNode) el.removeChild(footer);
        el.style.overflow = originalOverflow;
        el.style.overflowX = originalOverflowX;
        el.style.padding = originalPadding;
        el.style.background = originalBg;
        overflowChildren.forEach(({ el: child, overflow, overflowX }) => {
          child.style.overflow = overflow;
          child.style.overflowX = overflowX;
        });
      }

      // Download ou Share
      const fileName = `${tournamentName.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase()}_bracket.png`;

      if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
        try {
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], fileName, { type: "image/png" });
          await navigator.share({ files: [file], title: `${tournamentName} - Bracket` });
        } catch {
          downloadImage(dataUrl, fileName);
        }
      } else {
        downloadImage(dataUrl, fileName);
      }
    } catch (err) {
      console.error("Erro ao exportar bracket:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="inline-flex items-center gap-2 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-russo)] text-[0.6rem] tracking-wider text-orbital-purple disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
      {loading ? "EXPORTANDO..." : "EXPORTAR IMAGEM"}
    </button>
  );
}

function downloadImage(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}
