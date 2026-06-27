"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Heart, Eye, MessageSquare, Bookmark, Share2, Loader2, WifiOff, Users } from "lucide-react";

interface Post {
  id: number;
  title: string;
  post_type: string;
  status: string;
  ig_permalink: string | null;
  insights: Record<string, number> | null;
  published_at: string | null;
  media_url: string | null;
}

interface AccountInfo {
  username: string;
  followers: number;
  posts: number;
  picture: string;
}

export default function AnalyticsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/instagram", { credentials: "include" }).then(r => r.json()).catch(() => ({ posts: [] })),
      fetch("/api/instagram", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_connection" }),
      }).then(r => r.json()).catch(() => ({ connected: false })),
    ]).then(([postsData, connData]) => {
      const allPosts = (postsData.posts || []).map((p: Post) => ({
        ...p,
        insights: typeof p.insights === "string" ? JSON.parse(p.insights) : p.insights,
      }));
      setPosts(allPosts);
      setConnected(connData.connected);
      if (connData.account) setAccount(connData.account);
    }).finally(() => setLoading(false));
  }, []);

  const publishedPosts = posts.filter(p => p.status === "published" && p.insights);

  // Aggregate insights
  const totalImpressions = publishedPosts.reduce((s, p) => s + (p.insights?.impressions || 0), 0);
  const totalReach = publishedPosts.reduce((s, p) => s + (p.insights?.reach || 0), 0);
  const totalLikes = publishedPosts.reduce((s, p) => s + (p.insights?.likes || 0), 0);
  const totalComments = publishedPosts.reduce((s, p) => s + (p.insights?.comments || 0), 0);
  const totalSaved = publishedPosts.reduce((s, p) => s + (p.insights?.saved || 0), 0);
  const totalShares = publishedPosts.reduce((s, p) => s + (p.insights?.shares || 0), 0);

  const avgEngagement = publishedPosts.length > 0
    ? ((totalLikes + totalComments + totalSaved + totalShares) / publishedPosts.length).toFixed(1)
    : "0";

  // Best performing post
  const bestPost = publishedPosts.length > 0
    ? publishedPosts.reduce((best, p) => {
        const eng = (p.insights?.likes || 0) + (p.insights?.comments || 0) + (p.insights?.saved || 0);
        const bestEng = (best.insights?.likes || 0) + (best.insights?.comments || 0) + (best.insights?.saved || 0);
        return eng > bestEng ? p : best;
      })
    : null;

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="text-orbital-purple animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 size={18} className="text-orbital-purple" />
        <div>
          <h1 className="font-[family-name:var(--font-russo)] text-lg tracking-wider text-orbital-text">ANALYTICS</h1>
          <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
            {connected ? `@${account?.username || "orbitalroxa.gg"}` : "Instagram não conectado"}
          </p>
        </div>
      </div>

      {!connected ? (
        <div className="bg-yellow-500/5 border border-yellow-500/30 p-8 text-center space-y-3">
          <WifiOff size={32} className="text-yellow-400 mx-auto" />
          <p className="font-[family-name:var(--font-jetbrains)] text-sm text-yellow-400">Instagram não conectado</p>
          <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
            Configure INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_BUSINESS_ID pra ver analytics
          </p>
        </div>
      ) : (
        <>
          {/* Account Overview */}
          {account && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-[#0A0A0A] border border-orbital-border p-5"
            >
              <div className="flex items-center gap-4">
                {account.picture && <img src={account.picture} alt="" className="w-16 h-16 rounded-full border-2 border-orbital-purple/30" />}
                <div className="flex-1">
                  <div className="font-[family-name:var(--font-russo)] text-sm tracking-wider text-orbital-text">@{account.username}</div>
                  <div className="flex items-center gap-6 mt-2">
                    <div className="text-center">
                      <div className="font-[family-name:var(--font-jetbrains)] text-lg font-bold text-orbital-text">{account.followers}</div>
                      <div className="font-[family-name:var(--font-russo)] text-[0.65rem] text-orbital-text-dim">SEGUIDORES</div>
                    </div>
                    <div className="text-center">
                      <div className="font-[family-name:var(--font-jetbrains)] text-lg font-bold text-orbital-text">{account.posts}</div>
                      <div className="font-[family-name:var(--font-russo)] text-[0.65rem] text-orbital-text-dim">POSTS</div>
                    </div>
                    <div className="text-center">
                      <div className="font-[family-name:var(--font-jetbrains)] text-lg font-bold text-orbital-purple">{avgEngagement}</div>
                      <div className="font-[family-name:var(--font-russo)] text-[0.65rem] text-orbital-text-dim">ENG/POST</div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { icon: Eye, label: "IMPRESSÕES", value: totalImpressions, color: "text-blue-400" },
              { icon: Users, label: "ALCANCE", value: totalReach, color: "text-cyan-400" },
              { icon: Heart, label: "CURTIDAS", value: totalLikes, color: "text-red-400" },
              { icon: MessageSquare, label: "COMENTÁRIOS", value: totalComments, color: "text-green-400" },
              { icon: Bookmark, label: "SALVOS", value: totalSaved, color: "text-yellow-400" },
              { icon: Share2, label: "COMPARTILHAMENTOS", value: totalShares, color: "text-purple-400" },
            ].map((m, i) => (
              <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-[#0A0A0A] border border-orbital-border p-3 text-center"
              >
                <m.icon size={14} className={`${m.color} mx-auto mb-1 opacity-60`} />
                <div className={`font-[family-name:var(--font-jetbrains)] text-xl font-bold ${m.color}`}>{m.value}</div>
                <div className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider text-orbital-text-dim/50">{m.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Best Post */}
          {bestPost && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-[#0A0A0A] border border-orbital-purple/30 p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={14} className="text-orbital-purple" />
                <span className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider text-orbital-purple">MELHOR POST</span>
              </div>
              <div className="flex items-center gap-4">
                {bestPost.media_url && !bestPost.media_url.match(/\.(mp4|mov)$/i) && (
                  <img src={bestPost.media_url} alt="" className="w-16 h-16 object-cover rounded border border-orbital-border" />
                )}
                <div className="flex-1">
                  <div className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text">{bestPost.title}</div>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="font-[family-name:var(--font-jetbrains)] text-xs text-red-400">❤ {bestPost.insights?.likes || 0}</span>
                    <span className="font-[family-name:var(--font-jetbrains)] text-xs text-green-400">💬 {bestPost.insights?.comments || 0}</span>
                    <span className="font-[family-name:var(--font-jetbrains)] text-xs text-yellow-400">🔖 {bestPost.insights?.saved || 0}</span>
                    <span className="font-[family-name:var(--font-jetbrains)] text-xs text-blue-400">👁 {bestPost.insights?.impressions || 0}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Posts Performance Table */}
          {publishedPosts.length > 0 && (
            <div className="bg-[#0A0A0A] border border-orbital-border overflow-hidden">
              <div className="p-3 border-b border-orbital-border/30">
                <span className="font-[family-name:var(--font-russo)] text-[0.65rem] tracking-wider text-orbital-purple">PERFORMANCE POR POST</span>
              </div>
              <div className="overflow-x-auto relative">
                <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#0A0A0A] to-transparent pointer-events-none lg:hidden z-10" />
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-orbital-border/30">
                      <th className="text-left px-3 py-2 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">Post</th>
                      <th className="text-center px-2 py-2 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">Impressões</th>
                      <th className="text-center px-2 py-2 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">Alcance</th>
                      <th className="text-center px-2 py-2 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">❤</th>
                      <th className="text-center px-2 py-2 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">💬</th>
                      <th className="text-center px-2 py-2 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">🔖</th>
                    </tr>
                  </thead>
                  <tbody>
                    {publishedPosts.map(p => (
                      <tr key={p.id} className="border-b border-orbital-border/10 hover:bg-white/[0.02]">
                        <td className="px-3 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text truncate max-w-[200px]">{p.title}</td>
                        <td className="text-center px-2 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-blue-400">{p.insights?.impressions || 0}</td>
                        <td className="text-center px-2 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-cyan-400">{p.insights?.reach || 0}</td>
                        <td className="text-center px-2 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-red-400">{p.insights?.likes || 0}</td>
                        <td className="text-center px-2 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-green-400">{p.insights?.comments || 0}</td>
                        <td className="text-center px-2 py-2 font-[family-name:var(--font-jetbrains)] text-xs text-yellow-400">{p.insights?.saved || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {publishedPosts.length === 0 && (
            <div className="bg-[#0A0A0A] border border-orbital-border p-8 text-center">
              <BarChart3 size={24} className="text-orbital-text-dim mx-auto mb-2" />
              <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
                Publique posts pelo Conteúdo pra ver analytics aqui
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
