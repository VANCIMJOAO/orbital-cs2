"use client";

import { motion, AnimatePresence } from "framer-motion";
import { HudCard, StatBox } from "@/components/hud-card";
import { useEffect, useState, useCallback } from "react";
import {
  BarChart3, CalendarDays, CheckSquare, FileText, Handshake, Megaphone,
  Plus, Check, Loader2, AlertCircle, Trash2, Copy, Printer,
  Clock, Instagram, Hash, Eye, Target, Users, Tv,
  Swords, CircleDot, ArrowRight, X, StickyNote
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────
interface BrandTask {
  id: number;
  category: string;
  title: string;
  description: string | null;
  done: boolean;
  due_date: string | null;
}

interface BrandChecklist {
  id: number;
  category: string;
  title: string;
  done: boolean;
}

interface BrandSponsor {
  id: number;
  name: string;
  type: string | null;
  value: string | null;
  status: "prospect" | "contact" | "nego" | "closed" | "lost";
  notes: string | null;
}

interface BrandPost {
  id: number;
  title: string;
  caption: string | null;
  post_type: "feed" | "story" | "reel";
  hashtags: string | null;
  scheduled_for: string | null;
  posted: boolean;
  posted_at: string | null;
  instagram_url: string | null;
}

interface BrandNote {
  id: number;
  section: string;
  content: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard", label: "DASHBOARD", icon: BarChart3 },
  { id: "cronograma", label: "CRONOGRAMA", icon: CalendarDays },
  { id: "checklist", label: "CHECKLIST", icon: CheckSquare },
  { id: "conteudo", label: "CONTEUDO", icon: Instagram },
  { id: "patrocinios", label: "PATROCINIOS", icon: Handshake },
  { id: "proposta", label: "PROPOSTA", icon: FileText },
];

const WEEK_LABELS: Record<string, string> = {
  semana1: "SEMANA 1 -- Lancamento",
  semana2: "SEMANA 2 -- Parcerias",
  semana3: "SEMANA 3 -- Preparacao",
  semana4: "SEMANA 4 -- Inscricoes",
  semana5: "SEMANA 5 -- Fase de Grupos",
  semana6: "SEMANA 6 -- Playoffs & Final",
};

const CHECKLIST_LABELS: Record<string, string> = {
  identidade_visual: "IDENTIDADE VISUAL",
  presenca_digital: "PRESENCA DIGITAL",
  patrocinio: "PATROCINIO",
};

const STATUS_LABELS: Record<string, string> = {
  prospect: "Prospect",
  contact: "Em Contato",
  nego: "Negociando",
  closed: "Fechado",
  lost: "Perdido",
};

const STATUS_COLORS: Record<string, string> = {
  prospect: "text-orbital-text-dim border-orbital-border bg-white/5",
  contact: "text-blue-400 border-blue-500/30 bg-blue-500/10",
  nego: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
  closed: "text-green-400 border-green-500/30 bg-green-500/10",
  lost: "text-red-400 border-red-500/30 bg-red-500/10",
};

const STATUS_FLOW: Record<string, string> = {
  prospect: "contact",
  contact: "nego",
  nego: "closed",
  closed: "closed",
  lost: "lost",
};

const HASHTAG_PRESETS = [
  "#OrbitalRoxa", "#CS2", "#CounterStrike2", "#CS2Brasil",
  "#ESports", "#Gaming", "#GamerBR", "#FPS", "#Competitive",
  "#OrbitalCup", "#CS2Cup", "#TorneioCS2",
];

const POST_TYPE_COLORS: Record<string, string> = {
  feed: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  story: "text-pink-400 border-pink-400/30 bg-pink-400/10",
  reel: "text-purple-400 border-purple-400/30 bg-purple-400/10",
};

// ─── CUP #2 TARGET DATE ─────────────────────────────────────────────
const CUP2_DATE = new Date("2026-05-10T14:00:00");

function getCountdown() {
  const now = new Date();
  const diff = CUP2_DATE.getTime() - now.getTime();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0 };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes };
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function AdminBrand() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<BrandTask[]>([]);
  const [checklist, setChecklist] = useState<BrandChecklist[]>([]);
  const [sponsors, setSponsors] = useState<BrandSponsor[]>([]);
  const [posts, setPosts] = useState<BrandPost[]>([]);
  const [notes, setNotes] = useState<BrandNote[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const res = await fetch("/api/brand", { credentials: "include" });
      if (!res.ok) throw new Error("Erro ao carregar dados");
      const data = await res.json();
      setTasks(data.tasks || []);
      setChecklist(data.checklist || []);
      setSponsors(data.sponsors || []);
      setPosts((data.posts || []).map((p: BrandPost) => ({
        ...p,
        hashtags: typeof p.hashtags === "string" ? p.hashtags : p.hashtags,
      })));
      setNotes(data.notes || []);
    } catch (err) {
      console.error("[BRAND]", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const showFeedback = (type: "success" | "error", msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3000);
  };

  // ─── Computed stats ──────────────────────────────────────────────
  const tasksDone = tasks.filter(t => t.done).length;
  const tasksTotal = tasks.length;
  const checkDone = checklist.filter(c => c.done).length;
  const checkTotal = checklist.length;
  const totalProgress = tasksTotal + checkTotal > 0
    ? Math.round(((tasksDone + checkDone) / (tasksTotal + checkTotal)) * 100)
    : 0;

  const sponsorsByStatus = {
    prospect: sponsors.filter(s => s.status === "prospect").length,
    contact: sponsors.filter(s => s.status === "contact").length,
    nego: sponsors.filter(s => s.status === "nego").length,
    closed: sponsors.filter(s => s.status === "closed").length,
    lost: sponsors.filter(s => s.status === "lost").length,
  };

  const postedCount = posts.filter(p => p.posted).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-orbital-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-orbital-purple/10 border border-orbital-purple/30 flex items-center justify-center">
          <Megaphone size={18} className="text-orbital-purple" />
        </div>
        <div>
          <h1 className="font-[family-name:var(--font-orbitron)] text-sm font-bold text-orbital-text tracking-wider">
            COMMAND CENTER
          </h1>
          <p className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
            Gestao de marca, conteudo e patrocinios
          </p>
        </div>
      </div>

      {/* Feedback toast */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mb-4 flex items-center gap-2 px-4 py-3 border font-[family-name:var(--font-jetbrains)] text-xs ${
              feedback.type === "success"
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}
          >
            {feedback.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
            {feedback.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 border-b border-orbital-border">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 font-[family-name:var(--font-orbitron)] text-[0.55rem] tracking-wider whitespace-nowrap transition-all border-b-2 -mb-[1px] ${
                isActive
                  ? "border-orbital-purple text-orbital-purple"
                  : "border-transparent text-orbital-text-dim hover:text-orbital-text"
              }`}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "dashboard" && (
            <DashboardTab
              totalProgress={totalProgress}
              tasksDone={tasksDone}
              tasksTotal={tasksTotal}
              checkDone={checkDone}
              checkTotal={checkTotal}
              sponsorsByStatus={sponsorsByStatus}
              sponsorsTotal={sponsors.length}
              postsTotal={posts.length}
              postedCount={postedCount}
            />
          )}
          {activeTab === "cronograma" && (
            <CronogramaTab
              tasks={tasks}
              setTasks={setTasks}
              showFeedback={showFeedback}
            />
          )}
          {activeTab === "checklist" && (
            <ChecklistTab
              checklist={checklist}
              setChecklist={setChecklist}
              showFeedback={showFeedback}
            />
          )}
          {activeTab === "conteudo" && (
            <ConteudoTab
              posts={posts}
              setPosts={setPosts}
              showFeedback={showFeedback}
            />
          )}
          {activeTab === "patrocinios" && (
            <PatrociniosTab
              sponsors={sponsors}
              setSponsors={setSponsors}
              notes={notes}
              setNotes={setNotes}
              sponsorsByStatus={sponsorsByStatus}
              showFeedback={showFeedback}
            />
          )}
          {activeTab === "proposta" && <PropostaTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 1: DASHBOARD
// ═══════════════════════════════════════════════════════════════════════
function DashboardTab({
  totalProgress, tasksDone, tasksTotal, checkDone, checkTotal,
  sponsorsByStatus, sponsorsTotal, postsTotal, postedCount,
}: {
  totalProgress: number;
  tasksDone: number;
  tasksTotal: number;
  checkDone: number;
  checkTotal: number;
  sponsorsByStatus: Record<string, number>;
  sponsorsTotal: number;
  postsTotal: number;
  postedCount: number;
}) {
  const [countdown, setCountdown] = useState(getCountdown());

  useEffect(() => {
    const interval = setInterval(() => setCountdown(getCountdown()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <HudCard label="PROGRESSO GERAL">
        <div className="py-2">
          <div className="flex items-center justify-between mb-2">
            <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">
              Tasks: {tasksDone}/{tasksTotal} | Checklist: {checkDone}/{checkTotal}
            </span>
            <span className="font-[family-name:var(--font-orbitron)] text-sm text-orbital-purple font-bold">
              {totalProgress}%
            </span>
          </div>
          <div className="w-full h-3 bg-[#0A0A0A] border border-orbital-border overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${totalProgress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-orbital-purple/60 to-orbital-purple"
            />
          </div>
        </div>
      </HudCard>

      {/* Countdown */}
      <HudCard label="COUNTDOWN CUP #2" glow>
        <div className="flex items-center justify-center gap-8 py-4">
          <div className="text-center">
            <div className="font-[family-name:var(--font-jetbrains)] text-3xl font-bold text-orbital-purple">
              {countdown.days}
            </div>
            <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim mt-1">
              DIAS
            </div>
          </div>
          <div className="text-orbital-purple/30 font-bold text-2xl">:</div>
          <div className="text-center">
            <div className="font-[family-name:var(--font-jetbrains)] text-3xl font-bold text-orbital-text">
              {countdown.hours}
            </div>
            <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim mt-1">
              HORAS
            </div>
          </div>
          <div className="text-orbital-purple/30 font-bold text-2xl">:</div>
          <div className="text-center">
            <div className="font-[family-name:var(--font-jetbrains)] text-3xl font-bold text-orbital-text">
              {countdown.minutes}
            </div>
            <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.2em] text-orbital-text-dim mt-1">
              MINUTOS
            </div>
          </div>
        </div>
        <div className="text-center font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
          10 de Maio de 2026 -- 14:00 BRT
        </div>
      </HudCard>

      {/* Cup #1 Stats */}
      <HudCard label="CUP #1 -- RESULTADOS">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
          <StatBox label="JOGADORES" value={40} sub="inscritos" />
          <StatBox label="PRESENCIAL" value="60+" sub="publico" />
          <StatBox label="LIVE PEAK" value={120} sub="viewers" />
          <StatBox label="PARTIDAS" value={14} sub="jogadas" />
        </div>
      </HudCard>

      {/* Cup #2 Targets */}
      <HudCard label="CUP #2 -- METAS">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
          <div className="text-center">
            <Target size={16} className="text-orbital-purple mx-auto mb-1" />
            <div className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold text-orbital-text">80</div>
            <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim">JOGADORES</div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-green-400 mt-0.5">+100%</div>
          </div>
          <div className="text-center">
            <Users size={16} className="text-orbital-purple mx-auto mb-1" />
            <div className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold text-orbital-text">120+</div>
            <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim">PRESENCIAL</div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-green-400 mt-0.5">+100%</div>
          </div>
          <div className="text-center">
            <Tv size={16} className="text-orbital-purple mx-auto mb-1" />
            <div className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold text-orbital-text">300+</div>
            <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim">LIVE PEAK</div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-green-400 mt-0.5">+150%</div>
          </div>
          <div className="text-center">
            <Swords size={16} className="text-orbital-purple mx-auto mb-1" />
            <div className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold text-orbital-text">28+</div>
            <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim">PARTIDAS</div>
            <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-green-400 mt-0.5">+100%</div>
          </div>
        </div>
      </HudCard>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <HudCard>
          <div className="text-center py-1">
            <Handshake size={16} className="text-orbital-purple mx-auto mb-1" />
            <div className="font-[family-name:var(--font-jetbrains)] text-xl font-bold text-orbital-text">{sponsorsTotal}</div>
            <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim">SPONSORS</div>
          </div>
        </HudCard>
        <HudCard>
          <div className="text-center py-1">
            <Check size={16} className="text-green-400 mx-auto mb-1" />
            <div className="font-[family-name:var(--font-jetbrains)] text-xl font-bold text-green-400">{sponsorsByStatus.closed}</div>
            <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim">FECHADOS</div>
          </div>
        </HudCard>
        <HudCard>
          <div className="text-center py-1">
            <Instagram size={16} className="text-pink-400 mx-auto mb-1" />
            <div className="font-[family-name:var(--font-jetbrains)] text-xl font-bold text-orbital-text">{postsTotal}</div>
            <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim">POSTS</div>
          </div>
        </HudCard>
        <HudCard>
          <div className="text-center py-1">
            <Eye size={16} className="text-blue-400 mx-auto mb-1" />
            <div className="font-[family-name:var(--font-jetbrains)] text-xl font-bold text-orbital-text">{postedCount}</div>
            <div className="font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-[0.15em] text-orbital-text-dim">PUBLICADOS</div>
          </div>
        </HudCard>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 2: CRONOGRAMA
// ═══════════════════════════════════════════════════════════════════════
function CronogramaTab({
  tasks, setTasks, showFeedback,
}: {
  tasks: BrandTask[];
  setTasks: React.Dispatch<React.SetStateAction<BrandTask[]>>;
  showFeedback: (type: "success" | "error", msg: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [newCategory, setNewCategory] = useState("semana1");
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const toggleTask = async (task: BrandTask) => {
    const newDone = !task.done;
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: newDone } : t));
    try {
      await fetch("/api/brand/tasks", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, done: newDone }),
      });
    } catch {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, done: !newDone } : t));
      showFeedback("error", "Erro ao atualizar task");
    }
  };

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/brand/tasks", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory, title: newTitle, description: newDesc }),
      });
      const data = await res.json();
      setTasks(prev => [...prev, {
        id: data.id,
        category: newCategory,
        title: newTitle,
        description: newDesc || null,
        done: false,
        due_date: null,
      }]);
      setNewTitle("");
      setNewDesc("");
      setShowForm(false);
      showFeedback("success", "Task adicionada!");
    } catch {
      showFeedback("error", "Erro ao criar task");
    }
    setSubmitting(false);
  };

  const deleteTask = async (id: number) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await fetch("/api/brand/tasks", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      showFeedback("error", "Erro ao deletar task");
    }
  };

  const weeks = Object.keys(WEEK_LABELS);
  const tasksByWeek = weeks.map(w => ({
    week: w,
    label: WEEK_LABELS[w],
    items: tasks.filter(t => t.category === w),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-orbitron)] text-xs font-bold text-orbital-text tracking-wider">
          CRONOGRAMA CUP #2
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple"
          >
            <Plus size={14} /> NOVA TASK
          </button>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <HudCard label="NOVA TASK" className="mb-2">
              <form onSubmit={addTask} className="space-y-3 py-2">
                <div>
                  <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">SEMANA</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors"
                  >
                    {weeks.map(w => (
                      <option key={w} value={w}>{WEEK_LABELS[w]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">TITULO</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder="Nome da task"
                    className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors placeholder:text-orbital-text-dim/30"
                  />
                </div>
                <div>
                  <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">DESCRICAO (opcional)</label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={e => setNewDesc(e.target.value)}
                    placeholder="Descricao breve"
                    className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors placeholder:text-orbital-text-dim/30"
                  />
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 bg-orbital-purple/20 border border-orbital-purple/50 hover:bg-orbital-purple/30 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple disabled:opacity-50">
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    CRIAR
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 border border-orbital-border hover:border-orbital-text-dim transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-text-dim">
                    CANCELAR
                  </button>
                </div>
              </form>
            </HudCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Weeks */}
      {tasksByWeek.map(({ week, label, items }) => {
        const done = items.filter(i => i.done).length;
        const total = items.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        return (
          <HudCard key={week} label={label}>
            {/* Week progress */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-1.5 bg-[#0A0A0A] border border-orbital-border overflow-hidden">
                <div
                  className="h-full bg-orbital-purple transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                {done}/{total}
              </span>
            </div>

            {items.length === 0 ? (
              <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim/50 py-2">Nenhuma task nesta semana</p>
            ) : (
              <div className="space-y-1">
                {items.map(task => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 px-3 py-2.5 border transition-all group ${
                      task.done
                        ? "border-green-500/20 bg-green-500/5"
                        : "border-orbital-border hover:border-orbital-purple/20"
                    }`}
                  >
                    <button
                      onClick={() => toggleTask(task)}
                      className={`w-5 h-5 border flex items-center justify-center shrink-0 transition-all ${
                        task.done
                          ? "bg-green-500/20 border-green-500/50 text-green-400"
                          : "border-orbital-border hover:border-orbital-purple/50"
                      }`}
                    >
                      {task.done && <Check size={12} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={`font-[family-name:var(--font-jetbrains)] text-xs ${task.done ? "text-orbital-text-dim line-through" : "text-orbital-text"}`}>
                        {task.title}
                      </div>
                      {task.description && (
                        <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim/60 mt-0.5">
                          {task.description}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-1 text-orbital-text-dim/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </HudCard>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 3: CHECKLIST
// ═══════════════════════════════════════════════════════════════════════
function ChecklistTab({
  checklist, setChecklist, showFeedback,
}: {
  checklist: BrandChecklist[];
  setChecklist: React.Dispatch<React.SetStateAction<BrandChecklist[]>>;
  showFeedback: (type: "success" | "error", msg: string) => void;
}) {
  const toggleChecklist = async (item: BrandChecklist) => {
    const newDone = !item.done;
    setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, done: newDone } : c));
    try {
      // Use the brand main route with a special checklist toggle
      await fetch("/api/brand/checklist-toggle", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, done: newDone }),
      });
    } catch {
      setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, done: !newDone } : c));
      showFeedback("error", "Erro ao atualizar item");
    }
  };

  const categories = Object.keys(CHECKLIST_LABELS);

  return (
    <div className="space-y-4">
      <h2 className="font-[family-name:var(--font-orbitron)] text-xs font-bold text-orbital-text tracking-wider">
        CHECKLIST DE MARCA
      </h2>

      {categories.map(cat => {
        const items = checklist.filter(c => c.category === cat);
        const done = items.filter(c => c.done).length;
        const total = items.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;

        return (
          <HudCard key={cat} label={CHECKLIST_LABELS[cat]}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-1.5 bg-[#0A0A0A] border border-orbital-border overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${pct === 100 ? "bg-green-500" : "bg-orbital-purple"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`font-[family-name:var(--font-jetbrains)] text-[0.6rem] ${pct === 100 ? "text-green-400" : "text-orbital-text-dim"}`}>
                {done}/{total} ({pct}%)
              </span>
            </div>

            <div className="space-y-1">
              {items.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-3 py-2.5 border transition-all cursor-pointer ${
                    item.done
                      ? "border-green-500/20 bg-green-500/5"
                      : "border-orbital-border hover:border-orbital-purple/20"
                  }`}
                  onClick={() => toggleChecklist(item)}
                >
                  <div
                    className={`w-5 h-5 border flex items-center justify-center shrink-0 transition-all ${
                      item.done
                        ? "bg-green-500/20 border-green-500/50 text-green-400"
                        : "border-orbital-border hover:border-orbital-purple/50"
                    }`}
                  >
                    {item.done && <Check size={12} />}
                  </div>
                  <span className={`font-[family-name:var(--font-jetbrains)] text-xs ${item.done ? "text-orbital-text-dim line-through" : "text-orbital-text"}`}>
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </HudCard>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 4: CONTEUDO
// ═══════════════════════════════════════════════════════════════════════
function ConteudoTab({
  posts, setPosts, showFeedback,
}: {
  posts: BrandPost[];
  setPosts: React.Dispatch<React.SetStateAction<BrandPost[]>>;
  showFeedback: (type: "success" | "error", msg: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [postType, setPostType] = useState<"feed" | "story" | "reel">("feed");
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [scheduledFor, setScheduledFor] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setCaption("");
    setPostType("feed");
    setSelectedHashtags([]);
    setScheduledFor("");
    setShowForm(false);
  };

  const addPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/brand/posts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          caption,
          post_type: postType,
          hashtags: selectedHashtags,
          scheduled_for: scheduledFor || null,
        }),
      });
      const data = await res.json();
      setPosts(prev => [{
        id: data.id,
        title,
        caption,
        post_type: postType,
        hashtags: JSON.stringify(selectedHashtags),
        scheduled_for: scheduledFor || null,
        posted: false,
        posted_at: null,
        instagram_url: null,
      }, ...prev]);
      resetForm();
      showFeedback("success", "Post criado!");
    } catch {
      showFeedback("error", "Erro ao criar post");
    }
    setSubmitting(false);
  };

  const togglePosted = async (post: BrandPost) => {
    const newPosted = !post.posted;
    setPosts(prev => prev.map(p => p.id === post.id ? { ...p, posted: newPosted } : p));
    try {
      await fetch("/api/brand/posts", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, posted: newPosted }),
      });
    } catch {
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, posted: !newPosted } : p));
    }
  };

  const deletePost = async (id: number) => {
    setPosts(prev => prev.filter(p => p.id !== id));
    try {
      await fetch("/api/brand/posts", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      showFeedback("error", "Erro ao deletar post");
    }
  };

  const copyCaption = (post: BrandPost) => {
    const hashtags = parseHashtags(post.hashtags);
    const text = [post.caption, "", hashtags.join(" ")].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text);
    showFeedback("success", "Caption copiada!");
  };

  const toggleHashtag = (tag: string) => {
    setSelectedHashtags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const parseHashtags = (h: string | null): string[] => {
    if (!h) return [];
    try { return JSON.parse(h); } catch { return []; }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "Sem data";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-orbitron)] text-xs font-bold text-orbital-text tracking-wider">
          CALENDARIO DE CONTEUDO ({posts.length})
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple"
          >
            <Plus size={14} /> NOVO POST
          </button>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <HudCard label="NOVO POST" className="mb-2">
              <form onSubmit={addPost} className="space-y-3 py-2">
                <div>
                  <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">TITULO</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Nome do post"
                    className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors placeholder:text-orbital-text-dim/30"
                  />
                </div>
                <div>
                  <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">CAPTION</label>
                  <textarea
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    placeholder="Texto do post..."
                    rows={3}
                    className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors placeholder:text-orbital-text-dim/30 resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">TIPO</label>
                    <select
                      value={postType}
                      onChange={e => setPostType(e.target.value as "feed" | "story" | "reel")}
                      className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors"
                    >
                      <option value="feed">Feed</option>
                      <option value="story">Story</option>
                      <option value="reel">Reel</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">DATA</label>
                    <input
                      type="datetime-local"
                      value={scheduledFor}
                      onChange={e => setScheduledFor(e.target.value)}
                      className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Hashtag picker */}
                <div>
                  <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">
                    <Hash size={10} className="inline mr-1" />HASHTAGS
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {HASHTAG_PRESETS.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleHashtag(tag)}
                        className={`px-2 py-1 border font-[family-name:var(--font-jetbrains)] text-[0.6rem] transition-all ${
                          selectedHashtags.includes(tag)
                            ? "bg-orbital-purple/20 border-orbital-purple/50 text-orbital-purple"
                            : "border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button type="submit" disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 bg-orbital-purple/20 border border-orbital-purple/50 hover:bg-orbital-purple/30 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple disabled:opacity-50">
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    CRIAR
                  </button>
                  <button type="button" onClick={resetForm} className="px-6 py-2.5 border border-orbital-border hover:border-orbital-text-dim transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-text-dim">
                    CANCELAR
                  </button>
                </div>
              </form>
            </HudCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Posts grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {posts.map((post, i) => {
          const hashtags = parseHashtags(post.hashtags);
          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`bg-orbital-card border p-4 transition-all group ${
                post.posted
                  ? "border-green-500/20"
                  : "border-orbital-border hover:border-orbital-purple/20"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 border font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider uppercase ${POST_TYPE_COLORS[post.post_type]}`}>
                    {post.post_type}
                  </span>
                  {post.posted && (
                    <span className="px-2 py-0.5 bg-green-500/10 border border-green-500/30 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-green-400">
                      PUBLICADO
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => copyCaption(post)} className="p-1 text-orbital-text-dim hover:text-orbital-purple transition-colors" title="Copiar caption">
                    <Copy size={12} />
                  </button>
                  <button onClick={() => deletePost(post.id)} className="p-1 text-orbital-text-dim hover:text-red-400 transition-colors" title="Deletar">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <h3 className="font-[family-name:var(--font-orbitron)] text-[0.65rem] font-bold text-orbital-text tracking-wider mb-1">
                {post.title}
              </h3>

              {post.caption && (
                <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mb-2 line-clamp-2">
                  {post.caption}
                </p>
              )}

              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {hashtags.slice(0, 4).map((tag: string) => (
                    <span key={tag} className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-purple/60">
                      {tag}
                    </span>
                  ))}
                  {hashtags.length > 4 && (
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim">
                      +{hashtags.length - 4}
                    </span>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mt-3 pt-2 border-t border-orbital-border/50">
                <div className="flex items-center gap-1.5 font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
                  <Clock size={10} />
                  {formatDate(post.scheduled_for)}
                </div>
                <button
                  onClick={() => togglePosted(post)}
                  className={`px-2 py-1 border font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider transition-all ${
                    post.posted
                      ? "bg-green-500/10 border-green-500/30 text-green-400 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
                      : "border-orbital-border hover:border-green-500/30 text-orbital-text-dim hover:text-green-400"
                  }`}
                >
                  {post.posted ? "DESFAZER" : "MARCAR POSTADO"}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {posts.length === 0 && (
        <HudCard className="text-center py-8">
          <Instagram size={24} className="text-orbital-border mx-auto mb-3" />
          <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">Nenhum post agendado</p>
        </HudCard>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 5: PATROCINIOS
// ═══════════════════════════════════════════════════════════════════════
function PatrociniosTab({
  sponsors, setSponsors, notes, setNotes, sponsorsByStatus, showFeedback,
}: {
  sponsors: BrandSponsor[];
  setSponsors: React.Dispatch<React.SetStateAction<BrandSponsor[]>>;
  notes: BrandNote[];
  setNotes: React.Dispatch<React.SetStateAction<BrandNote[]>>;
  sponsorsByStatus: Record<string, number>;
  showFeedback: (type: "success" | "error", msg: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const sponsorNote = notes.find(n => n.section === "patrocinio")?.content || "";
  const [noteText, setNoteText] = useState(sponsorNote);
  const [savingNote, setSavingNote] = useState(false);

  const addSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/brand/sponsors", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, value }),
      });
      const data = await res.json();
      setSponsors(prev => [{
        id: data.id,
        name,
        type: type || null,
        value: value || null,
        status: "prospect",
        notes: null,
      }, ...prev]);
      setName("");
      setType("");
      setValue("");
      setShowForm(false);
      showFeedback("success", "Sponsor adicionado!");
    } catch {
      showFeedback("error", "Erro ao criar sponsor");
    }
    setSubmitting(false);
  };

  const advanceStatus = async (sponsor: BrandSponsor) => {
    const nextStatus = STATUS_FLOW[sponsor.status] as BrandSponsor["status"];
    if (nextStatus === sponsor.status) return;
    setSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, status: nextStatus } : s));
    try {
      await fetch("/api/brand/sponsors", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sponsor, status: nextStatus }),
      });
    } catch {
      setSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, status: sponsor.status } : s));
    }
  };

  const markLost = async (sponsor: BrandSponsor) => {
    setSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, status: "lost" } : s));
    try {
      await fetch("/api/brand/sponsors", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...sponsor, status: "lost" }),
      });
    } catch {
      setSponsors(prev => prev.map(s => s.id === sponsor.id ? { ...s, status: sponsor.status } : s));
    }
  };

  const deleteSponsor = async (id: number) => {
    setSponsors(prev => prev.filter(s => s.id !== id));
    try {
      await fetch("/api/brand/sponsors", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch {
      showFeedback("error", "Erro ao deletar sponsor");
    }
  };

  const saveNote = async () => {
    setSavingNote(true);
    try {
      await fetch("/api/brand/notes", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "patrocinio", content: noteText }),
      });
      setNotes(prev => {
        const idx = prev.findIndex(n => n.section === "patrocinio");
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], content: noteText };
          return updated;
        }
        return [...prev, { id: 0, section: "patrocinio", content: noteText }];
      });
      showFeedback("success", "Nota salva!");
    } catch {
      showFeedback("error", "Erro ao salvar nota");
    }
    setSavingNote(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-orbitron)] text-xs font-bold text-orbital-text tracking-wider">
          PIPELINE DE PATROCINIOS ({sponsors.length})
        </h2>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple"
          >
            <Plus size={14} /> NOVO SPONSOR
          </button>
        )}
      </div>

      {/* Pipeline metrics */}
      <div className="grid grid-cols-5 gap-2">
        {(["prospect", "contact", "nego", "closed", "lost"] as const).map(status => (
          <div key={status} className={`border p-3 text-center ${STATUS_COLORS[status]}`}>
            <div className="font-[family-name:var(--font-jetbrains)] text-xl font-bold">
              {sponsorsByStatus[status]}
            </div>
            <div className="font-[family-name:var(--font-orbitron)] text-[0.45rem] tracking-wider mt-1 uppercase">
              {STATUS_LABELS[status]}
            </div>
          </div>
        ))}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <HudCard label="NOVO SPONSOR" className="mb-2">
              <form onSubmit={addSponsor} className="space-y-3 py-2">
                <div>
                  <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">NOME</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nome da empresa" className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors placeholder:text-orbital-text-dim/30" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">TIPO</label>
                    <input type="text" value={type} onChange={e => setType(e.target.value)} placeholder="Periferico, Energetico..." className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors placeholder:text-orbital-text-dim/30" />
                  </div>
                  <div>
                    <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">VALOR ESTIMADO</label>
                    <input type="text" value={value} onChange={e => setValue(e.target.value)} placeholder="R$500-1k" className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors placeholder:text-orbital-text-dim/30" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 bg-orbital-purple/20 border border-orbital-purple/50 hover:bg-orbital-purple/30 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple disabled:opacity-50">
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    CRIAR
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 border border-orbital-border hover:border-orbital-text-dim transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-text-dim">
                    CANCELAR
                  </button>
                </div>
              </form>
            </HudCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sponsor cards */}
      <div className="space-y-2">
        {sponsors.map((sponsor, i) => (
          <motion.div
            key={sponsor.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className={`bg-orbital-card border p-4 transition-all group ${
              sponsor.status === "closed"
                ? "border-green-500/20"
                : sponsor.status === "lost"
                ? "border-red-500/20 opacity-60"
                : "border-orbital-border hover:border-orbital-purple/20"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 border flex items-center justify-center ${STATUS_COLORS[sponsor.status]}`}>
                  <CircleDot size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-[family-name:var(--font-orbitron)] text-xs font-bold text-orbital-text tracking-wider">
                      {sponsor.name}
                    </h3>
                    <span className={`px-2 py-0.5 border font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider ${STATUS_COLORS[sponsor.status]}`}>
                      {STATUS_LABELS[sponsor.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {sponsor.type && (
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                        {sponsor.type}
                      </span>
                    )}
                    {sponsor.value && (
                      <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-purple">
                        {sponsor.value}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {sponsor.status !== "closed" && sponsor.status !== "lost" && (
                  <button
                    onClick={() => advanceStatus(sponsor)}
                    className="flex items-center gap-1 px-2 py-1 border border-orbital-border hover:border-orbital-purple/30 font-[family-name:var(--font-orbitron)] text-[0.5rem] tracking-wider text-orbital-text-dim hover:text-orbital-purple transition-all"
                    title="Avancar status"
                  >
                    <ArrowRight size={10} />
                    {STATUS_LABELS[STATUS_FLOW[sponsor.status]]}
                  </button>
                )}
                {sponsor.status !== "closed" && sponsor.status !== "lost" && (
                  <button
                    onClick={() => markLost(sponsor)}
                    className="p-1 text-orbital-text-dim/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Marcar como perdido"
                  >
                    <X size={12} />
                  </button>
                )}
                <button
                  onClick={() => deleteSponsor(sponsor.id)}
                  className="p-1 text-orbital-text-dim/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  title="Deletar"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Notes */}
      <HudCard label="NOTAS DE PATROCINIO">
        <div className="space-y-3 py-2">
          <textarea
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            rows={4}
            className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors resize-none"
            placeholder="Anotacoes sobre patrocinios..."
          />
          <button
            onClick={saveNote}
            disabled={savingNote}
            className="flex items-center gap-2 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple disabled:opacity-50"
          >
            {savingNote ? <Loader2 size={12} className="animate-spin" /> : <StickyNote size={12} />}
            SALVAR NOTA
          </button>
        </div>
      </HudCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// TAB 6: PROPOSTA
// ═══════════════════════════════════════════════════════════════════════
function PropostaTab() {
  const [copied, setCopied] = useState(false);

  const proposalText = `PROPOSTA COMERCIAL -- ORBITAL ROXA CUP #2

SOBRE NOS
A ORBITAL ROXA e uma organizacao de esports focada em Counter-Strike 2,
com sede em Sao Paulo. Organizamos torneios presenciais e online com
transmissao ao vivo, comunidade ativa e producao profissional.

RESULTADOS DA CUP #1
- 40 jogadores inscritos (8 times)
- 60+ pessoas no evento presencial
- 120 viewers simultaneos na transmissao
- 14 partidas em 2 dias de competicao
- Cobertura em redes sociais com 5k+ impressoes

METAS DA CUP #2
- 80 jogadores (16 times)
- 120+ publico presencial
- 300+ viewers na live
- 28+ partidas em formato expandido
- Producao com casters profissionais

PACOTES DE PATROCINIO

[OURO] R$3.000 - R$5.000
- Logo no overlay da transmissao (posicao principal)
- Logo em todas as artes e materiais
- Mencao em todas as postagens
- Stand/espaco no evento presencial
- 3 posts dedicados no Instagram
- Banner no site orbitalroxa.com.br

[PRATA] R$1.000 - R$3.000
- Logo no overlay da transmissao
- Logo em materiais principais
- Mencao em postagens de abertura/encerramento
- 1 post dedicado no Instagram
- Logo no site

[BRONZE] R$500 - R$1.000
- Logo em materiais do evento
- Mencao no encerramento
- Logo no site

PERMUTA / APOIO
- Produtos para premiacao/sorteio
- Equipamentos para o evento
- Alimentacao/bebidas para participantes

CONTATO
Email: contato@orbitalroxa.com.br
Instagram: @orbitalroxa
Discord: discord.gg/orbitalroxa
Site: www.orbitalroxa.com.br`;

  const copyText = () => {
    navigator.clipboard.writeText(proposalText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printProposal = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Proposta Comercial - ORBITAL ROXA</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 40px; line-height: 1.8; color: #111; }
            h1 { text-align: center; border-bottom: 2px solid #A855F7; padding-bottom: 10px; }
            pre { white-space: pre-wrap; font-size: 14px; }
          </style>
        </head>
        <body>
          <pre>${proposalText}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-orbitron)] text-xs font-bold text-orbital-text tracking-wider">
          PROPOSTA COMERCIAL
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={copyText}
            className={`flex items-center gap-2 px-4 py-2 border transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider ${
              copied
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-orbital-card border-orbital-border hover:border-orbital-purple/40 text-orbital-text-dim hover:text-orbital-purple"
            }`}
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "COPIADO!" : "COPIAR TEXTO"}
          </button>
          <button
            onClick={printProposal}
            className="flex items-center gap-2 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple"
          >
            <Printer size={14} /> IMPRIMIR / PDF
          </button>
        </div>
      </div>

      <HudCard label="PREVIEW">
        <pre className="font-[family-name:var(--font-jetbrains)] text-[0.7rem] text-orbital-text leading-relaxed whitespace-pre-wrap py-2">
          {proposalText}
        </pre>
      </HudCard>
    </div>
  );
}
