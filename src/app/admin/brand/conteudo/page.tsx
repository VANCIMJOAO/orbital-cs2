"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Loader2, Image, Film, MessageSquare, Calendar, Send, Trash2,
  CheckCircle2, AlertCircle, Upload, Sparkles, Copy, ChevronDown, ExternalLink,
  Eye, Clock,
} from "lucide-react";

interface Post {
  id: number;
  title: string;
  post_type: "feed" | "reel" | "story" | "carousel";
  caption: string | null;
  hashtags: string | null;
  media_url: string | null;
  media_type: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: "draft" | "scheduled" | "publishing" | "published" | "failed";
  ig_permalink: string | null;
  error_message: string | null;
  insights: Record<string, number> | null;
  published_at: string | null;
  created_at: string;
}

const typeConfig = {
  feed: { icon: Image, color: "text-blue-400", bg: "bg-blue-500/10", label: "FEED" },
  reel: { icon: Film, color: "text-purple-400", bg: "bg-purple-500/10", label: "REEL" },
  story: { icon: MessageSquare, color: "text-pink-400", bg: "bg-pink-500/10", label: "STORY" },
  carousel: { icon: Image, color: "text-cyan-400", bg: "bg-cyan-500/10", label: "CAROUSEL" },
};

const statusConfig: Record<string, { color: string; label: string }> = {
  draft: { color: "text-yellow-400", label: "RASCUNHO" },
  scheduled: { color: "text-blue-400", label: "AGENDADO" },
  publishing: { color: "text-cyan-400", label: "PUBLICANDO..." },
  published: { color: "text-green-400", label: "PUBLICADO" },
  failed: { color: "text-red-400", label: "FALHOU" },
};

export default function ConteudoPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "draft" | "scheduled" | "published">("all");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [aiResult, setAiResult] = useState<{ postId: number; content: string } | null>(null);

  // Create form
  const [title, setTitle] = useState("");
  const [postType, setPostType] = useState<"feed" | "reel" | "story">("feed");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [schedDate, setSchedDate] = useState("");
  const [schedTime, setSchedTime] = useState("19:30");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/instagram", { credentials: "include" });
      const data = await res.json();
      setPosts((data.posts || []).map((p: Post) => ({
        ...p,
        insights: typeof p.insights === "string" ? JSON.parse(p.insights) : p.insights,
      })));
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const showFeedback = (type: "success" | "error", msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  };

  const createPost = async () => {
    if (!title) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/instagram", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, post_type: postType, caption: caption || null, hashtags: hashtags || null,
          media_url: mediaUrl || null, media_type: postType === "reel" ? "VIDEO" : "IMAGE",
          scheduled_date: schedDate || null, scheduled_time: schedTime || null,
        }),
      });
      if (res.ok) {
        showFeedback("success", "Post criado");
        setShowCreate(false);
        setTitle(""); setCaption(""); setHashtags(""); setMediaUrl(""); setSchedDate("");
        await fetchPosts();
      } else {
        const d = await res.json();
        showFeedback("error", d.error || "Erro");
      }
    } catch { showFeedback("error", "Erro de conexão"); }
    setSubmitting(false);
  };

  const publishPost = async (id: number) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/instagram", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", post_id: id }),
      });
      const data = await res.json();
      if (res.ok) {
        showFeedback("success", "Publicado no Instagram!");
        await fetchPosts();
      } else {
        showFeedback("error", data.error || "Erro ao publicar");
      }
    } catch { showFeedback("error", "Erro de conexão"); }
    setSubmitting(false);
  };

  const deletePost = async (id: number) => {
    if (!confirm("Deletar este post?")) return;
    await fetch(`/api/instagram?id=${id}`, { method: "DELETE", credentials: "include" });
    await fetchPosts();
  };

  const uploadMedia = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/instagram/upload", { method: "POST", credentials: "include", body: form });
      const data = await res.json();
      if (res.ok) {
        setMediaUrl(data.url);
        showFeedback("success", "Mídia enviada");
      } else {
        showFeedback("error", data.error || "Erro no upload");
      }
    } catch { showFeedback("error", "Erro no upload"); }
    setUploading(false);
  };

  const callAI = async (action: string, context: string, setter: (v: string) => void) => {
    setAiLoading(action);
    try {
      const res = await fetch("/api/brand/ai/execute", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, context }),
      });
      const data = await res.json();
      if (res.ok && data.result) setter(data.result);
      else showFeedback("error", "IA não retornou resultado");
    } catch { showFeedback("error", "Erro na IA"); }
    setAiLoading(null);
  };

  const debounceTimers = useRef<Record<number, NodeJS.Timeout>>({});

  const updatePost = (id: number, fields: Record<string, unknown>) => {
    // Update local state immediately (no lag)
    setPosts(prev => prev.map(p => p.id === id ? { ...p, ...fields } as Post : p));

    // Debounce the API save (500ms)
    if (debounceTimers.current[id]) clearTimeout(debounceTimers.current[id]);
    debounceTimers.current[id] = setTimeout(async () => {
      await fetch("/api/instagram", {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...fields }),
      });
    }, 500);
  };

  const filteredPosts = posts.filter(p => filter === "all" || p.status === filter);
  const inputClass = "w-full bg-[#111] border border-orbital-border px-3 py-2 text-orbital-text font-[family-name:var(--font-jetbrains)] text-xs placeholder:text-orbital-text-dim/30 focus:outline-none focus:border-orbital-purple/50";

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="text-orbital-purple animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calendar size={18} className="text-orbital-purple" />
          <div>
            <h1 className="font-[family-name:var(--font-orbitron)] text-lg tracking-wider text-orbital-text">CONTEÚDO</h1>
            <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">{posts.length} posts — {posts.filter(p => p.status === "published").length} publicados</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 text-orbital-purple font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-wider transition-colors"
        >
          {showCreate ? <X size={14} /> : <Plus size={14} />}
          {showCreate ? "CANCELAR" : "NOVO POST"}
        </button>
      </div>

      {/* Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`flex items-center gap-2 p-3 text-xs font-[family-name:var(--font-jetbrains)] ${feedback.type === "success" ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}
          >
            {feedback.type === "success" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-[#0A0A0A] border border-orbital-purple/30 p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple mb-1 block">TÍTULO *</label>
                  <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Resultado Cup #1" className={inputClass} />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple mb-1 block">TIPO</label>
                    <div className="flex gap-1.5">
                      {(["feed", "reel", "story"] as const).map(t => {
                        const cfg = typeConfig[t];
                        return (
                          <button key={t} onClick={() => setPostType(t)}
                            className={`flex-1 py-2 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider border transition-colors ${postType === t ? `${cfg.bg} border-current ${cfg.color}` : "bg-[#111] border-orbital-border text-orbital-text-dim"}`}
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Media upload */}
              <div>
                <label className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple mb-1 block">MÍDIA</label>
                <div className="flex gap-2">
                  <input type="text" value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} placeholder="URL da imagem/vídeo ou faça upload →" className={`${inputClass} flex-1`} />
                  <label className={`flex items-center gap-1.5 px-3 py-2 bg-[#111] border border-orbital-border hover:border-orbital-purple/30 text-orbital-text-dim font-[family-name:var(--font-jetbrains)] text-xs cursor-pointer transition-colors ${uploading ? "opacity-50" : ""}`}>
                    {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    UPLOAD
                    <input type="file" accept="image/*,video/mp4" onChange={e => e.target.files?.[0] && uploadMedia(e.target.files[0])} className="hidden" disabled={uploading} />
                  </label>
                </div>
                {mediaUrl && (
                  <div className="mt-2">
                    {mediaUrl.match(/\.(mp4|mov)$/i) ? (
                      <video src={mediaUrl} className="h-32 rounded border border-orbital-border" controls />
                    ) : (
                      <img src={mediaUrl} alt="" className="h-32 rounded border border-orbital-border object-cover" />
                    )}
                  </div>
                )}
              </div>

              {/* Caption + AI */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple">CAPTION</label>
                  <button
                    onClick={() => callAI("gerar-caption", `Post: ${title}. Tipo: ${postType}`, setCaption)}
                    disabled={!!aiLoading || !title}
                    className="flex items-center gap-1 px-2 py-1 bg-orbital-purple/10 border border-orbital-purple/30 text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.5rem] hover:border-orbital-purple/60 transition-colors disabled:opacity-30"
                  >
                    {aiLoading === "gerar-caption" ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                    GERAR COM IA
                  </button>
                </div>
                <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Escreva a legenda do post..." rows={4} className={`${inputClass} resize-none`} />
              </div>

              {/* Hashtags + AI */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple">HASHTAGS</label>
                  <button
                    onClick={() => callAI("gerar-hashtags", `Post: ${title}. Tipo: ${postType}. Caption: ${caption}`, setHashtags)}
                    disabled={!!aiLoading || !title}
                    className="flex items-center gap-1 px-2 py-1 bg-orbital-purple/10 border border-orbital-purple/30 text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.5rem] hover:border-orbital-purple/60 transition-colors disabled:opacity-30"
                  >
                    {aiLoading === "gerar-hashtags" ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                    GERAR
                  </button>
                </div>
                <input type="text" value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="#orbitalroxa #cs2 #cs2brasil" className={inputClass} />
              </div>

              {/* Schedule */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple mb-1 block">DATA</label>
                  <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple mb-1 block">HORÁRIO</label>
                  <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} className={inputClass} />
                </div>
              </div>

              {/* Submit */}
              <button onClick={createPost} disabled={!title || submitting}
                className="w-full py-2.5 bg-orbital-purple hover:bg-orbital-purple/80 disabled:opacity-30 text-white font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                CRIAR POST
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <div className="flex gap-2">
        {(["all", "draft", "scheduled", "published"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider border transition-colors ${filter === f ? "bg-orbital-purple/10 border-orbital-purple/50 text-orbital-purple" : "bg-[#0A0A0A] border-orbital-border text-orbital-text-dim hover:text-orbital-text"}`}
          >
            {f === "all" ? "TODOS" : f === "draft" ? "RASCUNHOS" : f === "scheduled" ? "AGENDADOS" : "PUBLICADOS"}
            <span className="ml-1 opacity-50">({posts.filter(p => f === "all" || p.status === f).length})</span>
          </button>
        ))}
      </div>

      {/* Posts List */}
      <div className="space-y-2">
        {filteredPosts.length === 0 && (
          <div className="bg-[#0A0A0A] border border-orbital-border p-8 text-center">
            <Calendar size={24} className="text-orbital-text-dim mx-auto mb-2" />
            <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">Nenhum post {filter !== "all" ? `com status "${filter}"` : ""}</p>
          </div>
        )}

        {filteredPosts.map((post, idx) => {
          const tc = typeConfig[post.post_type] || typeConfig.feed;
          const sc = statusConfig[post.status] || statusConfig.draft;
          const TypeIcon = tc.icon;
          const expanded = expandedId === post.id;

          return (
            <motion.div key={post.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.02 }}
              className="bg-[#0A0A0A] border border-orbital-border overflow-hidden"
            >
              {/* Row */}
              <button onClick={() => setExpandedId(expanded ? null : post.id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.02] transition-colors text-left"
              >
                {/* Type badge */}
                <span className={`font-[family-name:var(--font-orbitron)] text-[0.5rem] px-2 py-0.5 ${tc.bg} ${tc.color} shrink-0`}>
                  {tc.label}
                </span>

                {/* Title */}
                <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text flex-1 truncate">{post.title}</span>

                {/* Media indicator */}
                {post.media_url && <TypeIcon size={12} className="text-orbital-text-dim shrink-0" />}

                {/* Date */}
                {post.scheduled_date && (
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim shrink-0">
                    {new Date(post.scheduled_date.toString().slice(0, 10) + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    {post.scheduled_time && ` ${post.scheduled_time}`}
                  </span>
                )}

                {/* Status — click to toggle */}
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const newStatus = post.status === "published" ? "draft" : "published";
                    await fetch("/api/instagram", {
                      method: "PUT",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: post.id, status: newStatus }),
                    });
                    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: newStatus } : p));
                  }}
                  className={`font-[family-name:var(--font-jetbrains)] text-[0.5rem] px-1.5 py-0.5 shrink-0 hover:opacity-80 transition-opacity cursor-pointer ${sc.color}`}
                >
                  {sc.label}
                </button>

                <ChevronDown size={12} className={`text-orbital-text-dim shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
              </button>

              {/* Expanded */}
              <AnimatePresence>
                {expanded && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="border-t border-orbital-border/30 p-4 space-y-3">
                      {/* Preview */}
                      {post.media_url && (
                        <div>
                          {post.media_url.match(/\.(mp4|mov)$/i) ? (
                            <video src={post.media_url} className="h-40 rounded border border-orbital-border" controls />
                          ) : (
                            <img src={post.media_url} alt="" className="h-40 rounded border border-orbital-border object-cover" />
                          )}
                        </div>
                      )}

                      {/* Caption */}
                      <div>
                        <label className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple mb-1 block">CAPTION</label>
                        <textarea
                          value={post.caption || ""}
                          onChange={e => updatePost(post.id, { caption: e.target.value })}
                          placeholder="Sem caption..."
                          rows={3}
                          className={`${inputClass} resize-none`}
                        />
                      </div>

                      {/* Hashtags */}
                      <div>
                        <label className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple mb-1 block">HASHTAGS</label>
                        <input
                          type="text"
                          value={post.hashtags || ""}
                          onChange={e => updatePost(post.id, { hashtags: e.target.value })}
                          placeholder="Sem hashtags..."
                          className={inputClass}
                        />
                      </div>

                      {/* Error */}
                      {post.error_message && (
                        <div className="bg-red-500/10 border border-red-500/30 p-2 text-xs text-red-400 font-[family-name:var(--font-jetbrains)]">
                          {post.error_message}
                        </div>
                      )}

                      {/* Insights */}
                      {post.insights && Object.keys(post.insights).length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                          {Object.entries(post.insights).map(([key, val]) => (
                            <div key={key} className="bg-[#111] border border-orbital-border p-2 text-center">
                              <div className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text font-bold">{val}</div>
                              <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] text-orbital-text-dim/50">{key.toUpperCase()}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Permalink */}
                      {post.ig_permalink && (
                        <a href={post.ig_permalink} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-orbital-purple hover:text-orbital-text font-[family-name:var(--font-jetbrains)] text-xs transition-colors"
                        >
                          <ExternalLink size={10} /> Ver no Instagram
                        </a>
                      )}

                      {/* AI Actions */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-orbital-border/20">
                        <button
                          onClick={async () => {
                            showFeedback("success", "Gerando caption...");
                            const res = await fetch("/api/brand/ai/execute", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "gerar-caption", context: { title: post.title, post_type: post.post_type } }) });
                            if (res.ok) { const d = await res.json(); updatePost(post.id, { caption: d.result }); showFeedback("success", "Caption gerada"); }
                            else showFeedback("error", "Erro ao gerar caption");
                          }}
                          className="flex items-center gap-1 px-2 py-1.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.6rem] transition-colors"
                        >
                          🧠 CAPTION
                        </button>
                        <button
                          onClick={async () => {
                            showFeedback("success", "Gerando hashtags...");
                            const res = await fetch("/api/brand/ai/execute", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "gerar-hashtags", context: { title: post.title, post_type: post.post_type, caption: post.caption } }) });
                            if (res.ok) { const d = await res.json(); updatePost(post.id, { hashtags: d.result }); showFeedback("success", "Hashtags geradas"); }
                            else showFeedback("error", "Erro ao gerar hashtags");
                          }}
                          className="flex items-center gap-1 px-2 py-1.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.6rem] transition-colors"
                        >
                          # HASHTAGS
                        </button>
                        <button
                          onClick={async () => {
                            setAiResult({ postId: post.id, content: "Buscando mídia no Google Drive..." });
                            const res = await fetch("/api/brand/ai/execute", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sugerir-midia", context: { title: post.title, post_type: post.post_type } }) });
                            if (res.ok) { const d = await res.json(); setAiResult({ postId: post.id, content: d.result }); }
                            else setAiResult({ postId: post.id, content: "❌ Erro ao sugerir mídia" });
                          }}
                          className="flex items-center gap-1 px-2 py-1.5 bg-cyan-500/10 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-400 font-[family-name:var(--font-jetbrains)] text-[0.6rem] transition-colors"
                        >
                          📸 SUGERIR MÍDIA
                        </button>
                        <button
                          onClick={async () => {
                            showFeedback("success", "Gerando prompt...");
                            const res = await fetch("/api/brand/ai/execute", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "gerar-prompt-imagem", context: { title: post.title, post_type: post.post_type, caption: post.caption } }) });
                            if (res.ok) { const d = await res.json(); navigator.clipboard.writeText(d.result); showFeedback("success", "Prompt copiado pro clipboard"); }
                            else showFeedback("error", "Erro ao gerar prompt");
                          }}
                          className="flex items-center gap-1 px-2 py-1.5 bg-yellow-500/10 border border-yellow-500/30 hover:border-yellow-500/60 text-yellow-400 font-[family-name:var(--font-jetbrains)] text-[0.6rem] transition-colors"
                        >
                          🎨 PROMPT IMG
                        </button>
                      </div>

                      {/* AI Result */}
                      {aiResult && aiResult.postId === post.id && (
                        <div className="bg-[#0A0A0A] border border-orbital-purple/30 p-4 relative">
                          <button
                            onClick={() => setAiResult(null)}
                            className="absolute top-2 right-2 text-orbital-text-dim hover:text-orbital-text"
                          >
                            <X size={14} />
                          </button>
                          <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-purple mb-2">
                            RESULTADO DA IA
                          </div>
                          <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
                            {aiResult.content}
                          </div>
                          <button
                            onClick={() => { navigator.clipboard.writeText(aiResult.content); showFeedback("success", "Copiado!"); }}
                            className="mt-2 flex items-center gap-1 px-2 py-1 text-orbital-text-dim hover:text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.6rem] transition-colors"
                          >
                            <Copy size={10} /> COPIAR
                          </button>
                        </div>
                      )}

                      {/* Main Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-orbital-border/20">
                        {/* Publish button */}
                        {(post.status === "draft" || post.status === "scheduled" || post.status === "failed") && post.media_url && (
                          <button onClick={() => publishPost(post.id)} disabled={submitting}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 border border-green-500/30 hover:border-green-500/60 text-green-400 font-[family-name:var(--font-jetbrains)] text-xs transition-colors disabled:opacity-40"
                          >
                            {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            PUBLICAR AGORA
                          </button>
                        )}

                        {/* Copy caption */}
                        {post.caption && (
                          <button onClick={() => { navigator.clipboard.writeText([post.caption, post.hashtags].filter(Boolean).join("\n\n")); showFeedback("success", "Copiado!"); }}
                            className="flex items-center gap-1 px-2 py-1.5 text-orbital-text-dim hover:text-orbital-purple font-[family-name:var(--font-jetbrains)] text-xs transition-colors"
                          >
                            <Copy size={12} /> COPIAR
                          </button>
                        )}

                        {/* Preview */}
                        {post.media_url && !post.media_url.match(/\.(mp4|mov)$/i) && (
                          <button onClick={() => window.open(post.media_url!, "_blank")}
                            className="flex items-center gap-1 px-2 py-1.5 text-orbital-text-dim hover:text-orbital-purple font-[family-name:var(--font-jetbrains)] text-xs transition-colors"
                          >
                            <Eye size={12} /> PREVIEW
                          </button>
                        )}

                        {/* Fetch insights */}
                        {post.status === "published" && (
                          <button onClick={async () => {
                            const res = await fetch("/api/instagram", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "insights", post_id: post.id }) });
                            if (res.ok) { showFeedback("success", "Insights atualizados"); await fetchPosts(); }
                            else showFeedback("error", "Erro ao buscar insights");
                          }}
                            className="flex items-center gap-1 px-2 py-1.5 text-orbital-text-dim hover:text-orbital-purple font-[family-name:var(--font-jetbrains)] text-xs transition-colors"
                          >
                            <Clock size={12} /> INSIGHTS
                          </button>
                        )}

                        {/* Delete */}
                        <button onClick={() => deletePost(post.id)}
                          className="ml-auto flex items-center gap-1 px-2 py-1.5 text-orbital-text-dim hover:text-red-400 font-[family-name:var(--font-jetbrains)] text-xs transition-colors"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
