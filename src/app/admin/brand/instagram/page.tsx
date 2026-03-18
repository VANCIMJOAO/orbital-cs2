"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Lightbulb, Clock, Hash, ChevronLeft, ChevronRight,
  X, Check, Copy, AlertTriangle, Camera, Video,
  Sparkles, Target, Trophy, Users, MessageSquare, Megaphone,
  Play, BarChart3, Star, Zap
} from "lucide-react";
import { BrandAIButton } from "@/components/brand-ai-button";

interface Post {
  id: number;
  title: string;
  post_type: "feed" | "story" | "reel";
  scheduled_date: string | null;
  scheduled_time: string | null;
  caption: string;
  hashtags: string;
  published: boolean;
  published_at: string | null;
  notes: string | null;
}

const TABS = [
  { id: "calendario", label: "CALENDÁRIO", icon: Calendar },
  { id: "ideias", label: "IDEIAS", icon: Lightbulb },
  { id: "horarios", label: "HORÁRIOS", icon: Clock },
  { id: "hashtags", label: "HASHTAGS", icon: Hash },
];

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  feed: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30" },
  story: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  reel: { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" },
};

const TYPE_DOT: Record<string, string> = {
  feed: "bg-purple-500",
  story: "bg-blue-500",
  reel: "bg-red-500",
};

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const HASHTAG_GROUPS = [
  { name: "Marca", color: "purple", tags: ["#orbitalroxa", "#orbitalroxacup", "#orbitalroxacs2"] },
  { name: "CS2 Brasil", color: "blue", tags: ["#cs2brasil", "#cs2", "#counterstrike2", "#counterstrikeoficial", "#cs2highlights", "#cs2stats", "#cs2competitive", "#cs2br"] },
  { name: "Localização", color: "green", tags: ["#ribeiraopreto", "#esportsrp", "#ribeiraopretogamer", "#franca", "#araraquara", "#interiorsp", "#saopaulogaming"] },
  { name: "Torneio", color: "amber", tags: ["#campeonatocs2", "#torneio", "#esportsbrasil", "#esports", "#esportslatam", "#gamingbrasil", "#competitivo", "#lanparty", "#lanhouse"] },
  { name: "Conteúdo", color: "red", tags: ["#highlight", "#ace", "#clutch", "#playofthegame", "#fraghighlight", "#headshot", "#wallbang", "#gaming", "#gamer"] },
  { name: "Streetwear", color: "pink", tags: ["#streetwear", "#streetwearbrasil", "#gamingfashion", "#underground", "#streetstyle"] },
];

const IDEAS = {
  recorrente: [
    { title: "Card de resultado de cada partida", icon: BarChart3, desc: "Automático após cada match" },
    { title: "Stat curiosa da semana", icon: Sparkles, desc: "Jogador/mapa/round em destaque" },
    { title: "Reel com highlight gerado", icon: Play, desc: "Clip automático da pipeline" },
    { title: "Player Spotlight", icon: Star, desc: "Série com perfil de cada jogador" },
    { title: "Bastidores do evento", icon: Users, desc: "Fotos e stories do presencial" },
    { title: "Countdown próximo campeonato", icon: Clock, desc: "Contagem regressiva em stories" },
    { title: "Enquete: mapa/time favorito", icon: MessageSquare, desc: "Engajamento via stories" },
    { title: "Anúncio de inscrições", icon: Megaphone, desc: "Quando abrir vagas" },
  ],
  pre: [
    { title: "Teaser anúncio", icon: Zap, desc: "Misterioso, só o #2" },
    { title: "Reveal data e local", icon: Calendar, desc: "Anúncio oficial" },
    { title: "Reveal prize pool", icon: Trophy, desc: "Quanto vale o campeonato" },
    { title: "Apresentação dos times", icon: Users, desc: "Post por time confirmado" },
    { title: "Revanche — rivalidades Cup #1", icon: Target, desc: "Highlights de confrontos" },
    { title: "Bracket reveal ao vivo", icon: BarChart3, desc: "Via site em tempo real" },
  ],
  pos: [
    { title: "Card campeão", icon: Trophy, desc: "Logo após a final" },
    { title: "Top 5 stats em 24h", icon: BarChart3, desc: "Ranking dos melhores" },
    { title: "Play of the Tournament", icon: Zap, desc: "Melhor jogada em reel" },
    { title: "Foto do pódio/premiação", icon: Star, desc: "Registro do momento" },
    { title: "Recap em vídeo", icon: Video, desc: "1-2 min com melhores momentos" },
    { title: "Perfil MVP do campeonato", icon: Star, desc: "Spotlight do MVP" },
  ],
};

const HORARIOS = [
  { time: "19h30", days: "Ter / Qua / Qui", types: ["Feed", "Reel", "Story"], pct: 95, color: "bg-green-500", desc: "Galera voltou do trabalho/faculdade, tá no celular antes de jogar" },
  { time: "12h00", days: "Seg / Ter / Qua", types: ["Feed", "Story"], pct: 75, color: "bg-blue-500", desc: "Almoço — rolagem de feed, bom para carrosséis e posts informativos" },
  { time: "14h00", days: "Sáb / Dom", types: ["Reel"], pct: 85, color: "bg-purple-500", desc: "Gamer acorda mais tarde, meio da tarde é quando mais assiste Reels" },
  { time: "20h00", days: "Domingo", types: ["Teaser", "Story", "Enquete"], pct: 70, color: "bg-amber-500", desc: "Galera mais relaxada, mais tempo na tela, bom para anúncios" },
];

const EVITAR = [
  "Antes das 10h em dias úteis (público dormindo/trabalhando)",
  "Sexta 22h–Sábado 2h (galera tá jogando CS2, não no Instagram)",
  "Mais de 1 post/dia no feed (algoritmo divide alcance)",
  "Postar sem legenda (palavras-chave ajudam no alcance orgânico)",
];

const FREQUENCIA = [
  { day: "Seg", type: "—" },
  { day: "Ter", type: "Story" },
  { day: "Qua", type: "Feed" },
  { day: "Qui", type: "Story" },
  { day: "Sex", type: "Feed" },
  { day: "Sáb", type: "Reel" },
  { day: "Dom", type: "Story" },
];

export default function InstagramPage() {
  const [tab, setTab] = useState("calendario");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [modalPost, setModalPost] = useState<Partial<Post> | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [saving, setSaving] = useState(false);
  const [selectedHashtags, setSelectedHashtags] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState("");

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch("/api/brand/posts", { credentials: "include" });
      const data = await res.json();
      setPosts(data.posts || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  // Calendar helpers
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfWeek = (year: number, month: number) => new Date(year, month, 1).getDay();

  const monthName = new Date(currentMonth.year, currentMonth.month).toLocaleString("pt-BR", { month: "long" });
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const getPostsForDate = (dateStr: string) =>
    posts.filter(p => p.scheduled_date && p.scheduled_date.startsWith(dateStr));

  const prevMonth = () => setCurrentMonth(prev => {
    const m = prev.month - 1;
    return m < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: m };
  });
  const nextMonth = () => setCurrentMonth(prev => {
    const m = prev.month + 1;
    return m > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: m };
  });

  const openCreateModal = (date: string) => {
    setModalMode("create");
    setModalPost({ title: "", post_type: "feed", scheduled_date: date, scheduled_time: "19:30", caption: "", hashtags: "", notes: "" });
  };

  const openEditModal = (post: Post) => {
    setModalMode("edit");
    setModalPost({ ...post });
  };

  const savePost = async () => {
    if (!modalPost?.title) return;
    setSaving(true);
    try {
      const method = modalMode === "create" ? "POST" : "PUT";
      await fetch("/api/brand/posts", {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modalPost),
      });
      await fetchPosts();
      setModalPost(null);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const deletePost = async (id: number) => {
    await fetch("/api/brand/posts", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await fetchPosts();
    setModalPost(null);
  };

  const togglePublished = async (post: Post) => {
    await fetch("/api/brand/posts", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: post.id, published: !post.published }),
    });
    await fetchPosts();
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2000);
  };

  const toggleHashtag = (tag: string) => {
    setSelectedHashtags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag); else if (next.size < 30) next.add(tag);
      return next;
    });
  };

  const hashtagCount = selectedHashtags.size;
  const hashtagColor = hashtagCount >= 26 ? "text-red-400" : hashtagCount >= 20 ? "text-amber-400" : "text-green-400";

  const labelClass = "font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-purple mb-1 block";
  const inputClass = "w-full bg-[#0A0A0A] border border-[#2A2A2A] text-sm text-white px-3 py-2 focus:border-orbital-purple outline-none font-[family-name:var(--font-jetbrains)]";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-orbital-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Stats
  const totalPosts = posts.length;
  const publishedPosts = posts.filter(p => p.published).length;
  const feedCount = posts.filter(p => p.post_type === "feed").length;
  const storyCount = posts.filter(p => p.post_type === "story").length;
  const reelCount = posts.filter(p => p.post_type === "reel").length;

  // Calendar grid
  const daysInMonth = getDaysInMonth(currentMonth.year, currentMonth.month);
  const firstDay = getFirstDayOfWeek(currentMonth.year, currentMonth.month);
  const calendarCells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push(null);
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d);
  while (calendarCells.length % 7 !== 0) calendarCells.push(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-orbitron)] text-sm tracking-[0.2em] text-white">INSTAGRAM</h1>
          <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-white/40 mt-1">
            Planejamento de conteúdo @orbitalroxa
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${TYPE_DOT.feed}`} />
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-white/50">{feedCount} Feed</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${TYPE_DOT.story}`} />
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-white/50">{storyCount} Story</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${TYPE_DOT.reel}`} />
            <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-white/50">{reelCount} Reel</span>
          </div>
          <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-green-400">
            {publishedPosts}/{totalPosts} publicados
          </div>
        </div>
      </div>

      {/* AI Button */}
      <BrandAIButton
        action="gerar-posts"
        label="GERAR POSTS COM IA"
        variant="compact"
        onComplete={() => fetchPosts()}
      />

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1A1A1A]">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] tracking-[0.15em] border-b-2 transition-all ${
              tab === t.id ? "text-orbital-purple border-orbital-purple" : "text-white/40 border-transparent hover:text-white/60"
            }`}>
            <t.icon size={12} />
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ===== CALENDÁRIO ===== */}
        {tab === "calendario" && (
          <motion.div key="cal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-2 hover:bg-white/5 text-white/40 hover:text-white"><ChevronLeft size={16} /></button>
              <span className="font-[family-name:var(--font-orbitron)] text-xs tracking-[0.2em] text-white capitalize">
                {monthName} {currentMonth.year}
              </span>
              <button onClick={nextMonth} className="p-2 hover:bg-white/5 text-white/40 hover:text-white"><ChevronRight size={16} /></button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-white/30 py-1">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, i) => {
                if (day === null) return <div key={`empty-${i}`} className="aspect-square bg-[#0A0A0A]/50" />;
                const dateStr = `${currentMonth.year}-${String(currentMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayPosts = getPostsForDate(dateStr);
                const isToday = dateStr === todayStr;

                return (
                  <div key={dateStr}
                    onClick={() => openCreateModal(dateStr)}
                    className={`aspect-square bg-[#111] border cursor-pointer hover:border-orbital-purple/40 transition-all p-1 flex flex-col ${
                      isToday ? "border-orbital-purple" : "border-[#1A1A1A]"
                    }`}>
                    <span className={`font-[family-name:var(--font-jetbrains)] text-[0.55rem] ${isToday ? "text-orbital-purple font-bold" : "text-white/40"}`}>
                      {day}
                    </span>
                    <div className="flex flex-col gap-0.5 mt-auto">
                      {dayPosts.map(p => (
                        <button key={p.id}
                          onClick={(e) => { e.stopPropagation(); openEditModal(p); }}
                          className={`text-left px-1 py-0.5 text-[0.45rem] truncate ${TYPE_COLORS[p.post_type].bg} ${TYPE_COLORS[p.post_type].text} ${p.published ? "opacity-40 line-through" : ""}`}>
                          {p.title}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ===== IDEIAS ===== */}
        {tab === "ideias" && (
          <motion.div key="ideias" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
            {[
              { key: "recorrente" as const, label: "CONTEÚDO RECORRENTE", desc: "Baseado no banco de dados" },
              { key: "pre" as const, label: "PRÉ-CAMPEONATO", desc: "Antes do Cup #2" },
              { key: "pos" as const, label: "PÓS-CAMPEONATO", desc: "Depois do evento" },
            ].map(section => (
              <div key={section.key}>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-purple">{section.label}</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-orbital-purple/30 to-transparent" />
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-white/30">{section.desc}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {IDEAS[section.key].map((idea, i) => (
                    <div key={i} className="bg-[#111] border border-[#1A1A1A] p-4 hover:border-orbital-purple/30 transition-all group">
                      <idea.icon size={16} className="text-orbital-purple mb-2" />
                      <h4 className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-white mb-1">{idea.title}</h4>
                      <p className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-white/30">{idea.desc}</p>
                      <button
                        onClick={() => {
                          setTab("calendario");
                          openCreateModal(todayStr);
                          setTimeout(() => setModalPost(prev => prev ? { ...prev, title: idea.title } : prev), 100);
                        }}
                        className="mt-3 font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-purple opacity-0 group-hover:opacity-100 transition-opacity">
                        + Agendar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ===== HORÁRIOS ===== */}
        {tab === "horarios" && (
          <motion.div key="horarios" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Time slots */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {HORARIOS.map((h, i) => (
                <div key={i} className="bg-[#111] border border-[#1A1A1A] p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-[family-name:var(--font-orbitron)] text-lg text-white">{h.time}</div>
                      <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-white/40 mt-0.5">{h.days}</div>
                    </div>
                    <div className="font-[family-name:var(--font-orbitron)] text-sm text-orbital-purple">{h.pct}%</div>
                  </div>
                  <div className="flex gap-1.5 mb-3">
                    {h.types.map(t => (
                      <span key={t} className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] px-2 py-0.5 bg-orbital-purple/10 text-orbital-purple border border-orbital-purple/20">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="w-full h-2 bg-[#0A0A0A] rounded-full overflow-hidden mb-2">
                    <div className={`h-full ${h.color} rounded-full transition-all`} style={{ width: `${h.pct}%` }} />
                  </div>
                  <p className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-white/30 italic">{h.desc}</p>
                </div>
              ))}
            </div>

            {/* Evitar */}
            <div className="bg-red-500/5 border border-red-500/15 p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-red-400" />
                <h3 className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-red-400">EVITAR</h3>
              </div>
              <div className="space-y-2">
                {EVITAR.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <X size={10} className="text-red-400 mt-0.5 shrink-0" />
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-white/50">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Frequência */}
            <div className="bg-[#111] border border-[#1A1A1A] p-5">
              <h3 className="font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-[0.2em] text-orbital-purple mb-4">FREQUÊNCIA RECOMENDADA</h3>
              <div className="grid grid-cols-7 gap-2">
                {FREQUENCIA.map(f => (
                  <div key={f.day} className="text-center">
                    <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-white/30 mb-1">{f.day}</div>
                    <div className={`py-1.5 text-[0.5rem] font-[family-name:var(--font-jetbrains)] ${
                      f.type === "—" ? "text-white/10" : f.type === "Feed" ? "bg-purple-500/15 text-purple-400" : f.type === "Reel" ? "bg-red-500/15 text-red-400" : "bg-blue-500/15 text-blue-400"
                    }`}>
                      {f.type}
                    </div>
                  </div>
                ))}
              </div>
              <p className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-white/25 mt-3">
                3-4 posts/semana + stories diários quando tiver conteúdo
              </p>
            </div>
          </motion.div>
        )}

        {/* ===== HASHTAGS ===== */}
        {tab === "hashtags" && (
          <motion.div key="hashtags" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            {/* Counter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Hash size={16} className="text-orbital-purple" />
                <span className={`font-[family-name:var(--font-orbitron)] text-sm ${hashtagColor}`}>
                  {hashtagCount}
                </span>
                <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-white/30">/ 30</span>
              </div>
              <button
                onClick={() => copyText(Array.from(selectedHashtags).join(" "), "hashtags")}
                disabled={hashtagCount === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orbital-purple/10 border border-orbital-purple/30 text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.55rem] hover:bg-orbital-purple/20 disabled:opacity-30 transition-all">
                {copied === "hashtags" ? <><Check size={10} /> Copiado!</> : <><Copy size={10} /> Copiar Hashtags</>}
              </button>
            </div>

            {/* Groups */}
            <div className="space-y-5">
              {HASHTAG_GROUPS.map(group => (
                <div key={group.name}>
                  <h3 className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-white/40 mb-2">{group.name.toUpperCase()}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {group.tags.map(tag => {
                      const selected = selectedHashtags.has(tag);
                      return (
                        <button key={tag} onClick={() => toggleHashtag(tag)}
                          className={`px-2.5 py-1 font-[family-name:var(--font-jetbrains)] text-[0.55rem] border transition-all ${
                            selected
                              ? "bg-orbital-purple/20 border-orbital-purple/50 text-orbital-purple"
                              : "bg-[#111] border-[#2A2A2A] text-white/40 hover:border-orbital-purple/30 hover:text-white/60"
                          }`}>
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Preview */}
            {hashtagCount > 0 && (
              <div className="bg-[#111] border border-[#1A1A1A] p-4">
                <h3 className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-white/30 mb-2">PREVIEW</h3>
                <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-purple leading-relaxed break-all">
                  {Array.from(selectedHashtags).join(" ")}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== MODAL ===== */}
      <AnimatePresence>
        {modalPost && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setModalPost(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-[#111] border border-[#2A2A2A] w-full max-w-lg max-h-[85vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}>
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.2em] text-orbital-purple">
                    {modalMode === "create" ? "NOVO POST" : "EDITAR POST"}
                  </h2>
                  <button onClick={() => setModalPost(null)} className="text-white/30 hover:text-white"><X size={16} /></button>
                </div>

                <div>
                  <label className={labelClass}>TÍTULO</label>
                  <input type="text" value={modalPost.title || ""} onChange={e => setModalPost({ ...modalPost, title: e.target.value })} className={inputClass} placeholder="Título do post" />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelClass}>TIPO</label>
                    <select value={modalPost.post_type || "feed"} onChange={e => setModalPost({ ...modalPost, post_type: e.target.value as Post["post_type"] })} className={inputClass}>
                      <option value="feed">Feed</option>
                      <option value="story">Story</option>
                      <option value="reel">Reel</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>DATA</label>
                    <input type="date" value={modalPost.scheduled_date || ""} onChange={e => setModalPost({ ...modalPost, scheduled_date: e.target.value })} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>HORÁRIO</label>
                    <input type="time" value={modalPost.scheduled_time || ""} onChange={e => setModalPost({ ...modalPost, scheduled_time: e.target.value })} className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>CAPTION</label>
                  <textarea value={modalPost.caption || ""} onChange={e => setModalPost({ ...modalPost, caption: e.target.value })} rows={5} className={`${inputClass} resize-none`} placeholder="Caption do post..." />
                  {modalPost.caption && (
                    <button onClick={() => copyText(modalPost.caption || "", "caption")} className="mt-1 flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-purple hover:underline">
                      {copied === "caption" ? <><Check size={8} /> Copiado!</> : <><Copy size={8} /> Copiar Caption</>}
                    </button>
                  )}
                </div>

                <div>
                  <label className={labelClass}>HASHTAGS</label>
                  <textarea value={modalPost.hashtags || ""} onChange={e => setModalPost({ ...modalPost, hashtags: e.target.value })} rows={2} className={`${inputClass} resize-none`} placeholder="#orbitalroxa #cs2 ..." />
                  {modalPost.hashtags && (
                    <button onClick={() => copyText(modalPost.hashtags || "", "modal-hashtags")} className="mt-1 flex items-center gap-1 font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-purple hover:underline">
                      {copied === "modal-hashtags" ? <><Check size={8} /> Copiado!</> : <><Copy size={8} /> Copiar Hashtags</>}
                    </button>
                  )}
                </div>

                <div>
                  <label className={labelClass}>NOTAS</label>
                  <input type="text" value={modalPost.notes || ""} onChange={e => setModalPost({ ...modalPost, notes: e.target.value })} className={inputClass} placeholder="Notas internas..." />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#1A1A1A]">
                  <div className="flex gap-2">
                    <button onClick={savePost} disabled={saving || !modalPost.title}
                      className="flex items-center gap-1.5 px-4 py-2 bg-orbital-purple/20 border border-orbital-purple/40 text-orbital-purple font-[family-name:var(--font-jetbrains)] text-[0.6rem] tracking-wider hover:bg-orbital-purple/30 disabled:opacity-30 transition-all">
                      <Check size={12} /> {saving ? "SALVANDO..." : "SALVAR"}
                    </button>
                    {modalMode === "edit" && (
                      <button onClick={() => togglePublished(modalPost as Post)}
                        className={`flex items-center gap-1.5 px-3 py-2 border font-[family-name:var(--font-jetbrains)] text-[0.6rem] transition-all ${
                          modalPost.published ? "border-green-500/30 text-green-400 bg-green-500/10" : "border-[#2A2A2A] text-white/40 hover:text-white"
                        }`}>
                        <Camera size={12} /> {modalPost.published ? "PUBLICADO" : "MARCAR PUBLICADO"}
                      </button>
                    )}
                  </div>
                  {modalMode === "edit" && modalPost.id && (
                    <button onClick={() => deletePost(modalPost.id!)}
                      className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-red-400/50 hover:text-red-400 transition-all">
                      Deletar
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
