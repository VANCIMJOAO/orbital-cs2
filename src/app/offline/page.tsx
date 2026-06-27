"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-8 text-center">
      {/* Glow ring icon */}
      <div className="w-[120px] h-[120px] rounded-full border-[3px] border-orbital-purple flex items-center justify-center mb-8 shadow-[0_0_30px_6px_rgba(168,85,247,0.4)]">
        <span className="text-4xl font-extrabold text-orbital-purple tracking-wider font-[family-name:var(--font-russo)]">
          OR
        </span>
      </div>

      <h1 className="text-3xl font-bold text-orbital-purple mb-4 tracking-[0.1em] font-[family-name:var(--font-russo)]">
        SEM CONEXÃO
      </h1>

      <p className="text-lg text-[#A3A3A3] max-w-[400px] leading-relaxed mb-8 font-[family-name:var(--font-jetbrains)]">
        Você está offline. Verifique sua conexão com a internet e tente novamente.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="bg-transparent text-orbital-purple border-2 border-orbital-purple px-8 py-3 text-base font-semibold tracking-wider cursor-pointer uppercase transition-all duration-200 hover:bg-orbital-purple hover:text-[#0A0A0A] font-[family-name:var(--font-russo)]"
      >
        Tentar Novamente
      </button>
    </div>
  );
}
