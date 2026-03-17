import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4">
      {/* Glitch 404 */}
      <div className="relative mb-6">
        <h1 className="font-[family-name:var(--font-orbitron)] text-[8rem] sm:text-[12rem] font-black tracking-wider text-orbital-purple/10 leading-none select-none">
          404
        </h1>
        <h1 className="absolute inset-0 font-[family-name:var(--font-orbitron)] text-[8rem] sm:text-[12rem] font-black tracking-wider text-orbital-purple leading-none select-none text-center"
          style={{ textShadow: "0 0 40px rgba(168,85,247,0.3), 0 0 80px rgba(168,85,247,0.1)" }}
        >
          404
        </h1>
      </div>

      <div className="text-center max-w-md">
        <h2 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.3em] text-orbital-text-dim mb-3">
          PÁGINA NÃO ENCONTRADA
        </h2>
        <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim/60 mb-8">
          A página que você está procurando não existe ou foi movida.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="px-5 py-2.5 bg-orbital-purple/15 border border-orbital-purple/50 hover:bg-orbital-purple/25 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple"
          >
            VOLTAR AO INÍCIO
          </Link>
          <Link
            href="/partidas"
            className="px-5 py-2.5 border border-orbital-border hover:border-orbital-purple/30 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-text-dim hover:text-orbital-text"
          >
            VER PARTIDAS
          </Link>
        </div>
      </div>

      {/* Corner accents */}
      <div className="fixed top-20 left-6 w-8 h-8 border-t border-l border-orbital-purple/20" />
      <div className="fixed top-20 right-6 w-8 h-8 border-t border-r border-orbital-purple/20" />
      <div className="fixed bottom-6 left-6 w-8 h-8 border-b border-l border-orbital-purple/20" />
      <div className="fixed bottom-6 right-6 w-8 h-8 border-b border-r border-orbital-purple/20" />
    </div>
  );
}
