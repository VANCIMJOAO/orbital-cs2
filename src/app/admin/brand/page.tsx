"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Instagram, BarChart3, Wifi, WifiOff, Loader2, ExternalLink, Image, Film, MessageSquare } from "lucide-react";
import Link from "next/link";

interface IGAccount {
  username: string;
  name: string;
  picture: string;
  followers: number;
  posts: number;
}

interface PostSummary {
  total: number;
  drafts: number;
  scheduled: number;
  published: number;
  failed: number;
}

export default function BrandDashboard() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [account, setAccount] = useState<IGAccount | null>(null);
  const [connectionError, setConnectionError] = useState("");
  const [postSummary, setPostSummary] = useState<PostSummary>({ total: 0, drafts: 0, scheduled: 0, published: 0, failed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      // Check Instagram connection
      fetch("/api/instagram", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_connection" }),
      }).then(r => r.json()).catch(() => ({ connected: false, error: "Erro de rede" })),
      // Get posts summary
      fetch("/api/instagram", { credentials: "include" }).then(r => r.json()).catch(() => ({ posts: [] })),
    ]).then(([connData, postsData]) => {
      setConnected(connData.connected);
      if (connData.connected) setAccount(connData.account);
      else setConnectionError(connData.error || "");

      const posts = postsData.posts || [];
      setPostSummary({
        total: posts.length,
        drafts: posts.filter((p: { status: string }) => p.status === "draft").length,
        scheduled: posts.filter((p: { status: string }) => p.status === "scheduled").length,
        published: posts.filter((p: { status: string }) => p.status === "published").length,
        failed: posts.filter((p: { status: string }) => p.status === "failed").length,
      });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="text-orbital-purple animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Instagram size={20} className="text-orbital-purple" />
        <div>
          <h1 className="font-[family-name:var(--font-russo)] text-lg tracking-wider text-orbital-text">INSTAGRAM</h1>
          <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
            Gerenciamento de conteúdo @orbitalroxa.gg
          </p>
        </div>
      </div>

      {/* Connection Status */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className={`p-4 border ${connected ? "bg-green-500/5 border-green-500/30" : "bg-yellow-500/5 border-yellow-500/30"}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {connected ? <Wifi size={16} className="text-green-400" /> : <WifiOff size={16} className="text-yellow-400" />}
            <div>
              <div className="font-[family-name:var(--font-russo)] text-[0.6rem] tracking-wider text-orbital-text">
                {connected ? "CONECTADO" : "NÃO CONECTADO"}
              </div>
              {connected && account ? (
                <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim flex items-center gap-2 mt-0.5">
                  {account.picture && <img src={account.picture} alt="" className="w-5 h-5 rounded-full" />}
                  @{account.username} — {account.followers} seguidores — {account.posts} posts
                </div>
              ) : (
                <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-yellow-400/70 mt-0.5">
                  {connectionError || "Configure INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_BUSINESS_ID no Vercel"}
                </p>
              )}
            </div>
          </div>
          {connected && (
            <a href="https://www.instagram.com/orbitalroxa.gg/" target="_blank" rel="noopener noreferrer"
              className="text-orbital-text-dim hover:text-orbital-purple transition-colors"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </motion.div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "TOTAL", value: postSummary.total, color: "text-orbital-text", icon: MessageSquare },
          { label: "RASCUNHOS", value: postSummary.drafts, color: "text-yellow-400", icon: MessageSquare },
          { label: "AGENDADOS", value: postSummary.scheduled, color: "text-blue-400", icon: Image },
          { label: "PUBLICADOS", value: postSummary.published, color: "text-green-400", icon: Film },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-[#0A0A0A] border border-orbital-border p-3 text-center"
          >
            <m.icon size={12} className={`${m.color} mx-auto mb-1 opacity-60`} />
            <div className={`font-[family-name:var(--font-jetbrains)] text-xl font-bold ${m.color}`}>{m.value}</div>
            <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider text-orbital-text-dim/50">{m.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/admin/brand/conteudo"
          className="group p-6 bg-[#0A0A0A] border border-orbital-border hover:border-orbital-purple/40 transition-colors"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orbital-purple/10 border border-orbital-purple/30 flex items-center justify-center">
              <Image size={18} className="text-orbital-purple" />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-russo)] text-sm tracking-wider text-orbital-text group-hover:text-orbital-purple transition-colors">
                CONTEÚDO
              </h2>
              <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                Criar, agendar e publicar posts
              </p>
            </div>
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim/50">
            Calendário • Upload de mídia • IA para captions • Publicar direto no Instagram
          </div>
        </Link>

        <Link href="/admin/brand/analytics"
          className="group p-6 bg-[#0A0A0A] border border-orbital-border hover:border-orbital-purple/40 transition-colors"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orbital-purple/10 border border-orbital-purple/30 flex items-center justify-center">
              <BarChart3 size={18} className="text-orbital-purple" />
            </div>
            <div>
              <h2 className="font-[family-name:var(--font-russo)] text-sm tracking-wider text-orbital-text group-hover:text-orbital-purple transition-colors">
                ANALYTICS
              </h2>
              <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                Métricas e desempenho
              </p>
            </div>
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim/50">
            Impressões • Alcance • Engajamento • Melhor horário • Crescimento
          </div>
        </Link>
      </div>

      {/* Connection setup guide (only if not connected) */}
      {!connected && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="bg-[#0A0A0A] border border-orbital-border p-5 space-y-3"
        >
          <h3 className="font-[family-name:var(--font-russo)] text-[0.6rem] tracking-wider text-orbital-purple">
            COMO CONECTAR O INSTAGRAM
          </h3>
          <ol className="space-y-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
            <li className="flex gap-2"><span className="text-orbital-purple shrink-0">1.</span> Crie um app em developers.facebook.com</li>
            <li className="flex gap-2"><span className="text-orbital-purple shrink-0">2.</span> Adicione o produto Instagram Graph API</li>
            <li className="flex gap-2"><span className="text-orbital-purple shrink-0">3.</span> Gere um Access Token de longa duração</li>
            <li className="flex gap-2"><span className="text-orbital-purple shrink-0">4.</span> Encontre o Instagram Business Account ID</li>
            <li className="flex gap-2"><span className="text-orbital-purple shrink-0">5.</span> Adicione no Vercel: INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_BUSINESS_ID</li>
          </ol>
        </motion.div>
      )}
    </div>
  );
}
