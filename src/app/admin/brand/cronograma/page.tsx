"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import {
  CalendarDays, Check, Plus, Loader2, Trash2, Filter, X
} from "lucide-react";
import { BrandAIButton } from "@/components/brand-ai-button";

interface BrandTask {
  id: number;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  week: number;
  week_label: string;
  week_date: string;
  done: boolean;
}

interface WeekGroup {
  week: number;
  label: string;
  date: string;
  tasks: BrandTask[];
}

const CATEGORIES = [
  { id: "all", label: "Todos" },
  { id: "instagram", label: "Instagram" },
  { id: "conteudo", label: "Conteúdo" },
  { id: "negocio", label: "Negócio" },
  { id: "tech", label: "Tech" },
  { id: "campeonato", label: "Campeonato" },
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  instagram: { bg: "bg-purple-500/15", text: "text-purple-300" },
  conteudo: { bg: "bg-blue-500/15", text: "text-blue-300" },
  negocio: { bg: "bg-amber-500/15", text: "text-amber-300" },
  tech: { bg: "bg-emerald-500/15", text: "text-emerald-300" },
  campeonato: { bg: "bg-red-500/15", text: "text-red-300" },
};

const PRIORITY_LABELS: Record<string, { label: string; cls: string }> = {
  high: { label: "Alta", cls: "text-red-400" },
  med: { label: "Média", cls: "text-amber-400" },
  low: { label: "Baixa", cls: "text-green-400" },
};

export default function CronogramaPage() {
  const [tasks, setTasks] = useState<BrandTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [addingWeek, setAddingWeek] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("conteudo");
  const [newPriority, setNewPriority] = useState("med");
  const [toggling, setToggling] = useState<number | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/brand/tasks");
      if (!res.ok) return;
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const weeks: WeekGroup[] = [];
  const weekMap = new Map<number, WeekGroup>();
  for (const t of tasks) {
    if (!weekMap.has(t.week)) {
      weekMap.set(t.week, { week: t.week, label: t.week_label, date: t.week_date, tasks: [] });
    }
    weekMap.get(t.week)!.tasks.push(t);
  }
  for (const [, wg] of Array.from(weekMap.entries()).sort((a, b) => a[0] - b[0])) {
    weeks.push(wg);
  }

  const filteredWeeks = weeks.map(w => ({
    ...w,
    tasks: filter === "all" ? w.tasks : w.tasks.filter(t => t.category === filter),
  }));

  async function toggleTask(id: number, done: boolean) {
    setToggling(id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, done: !done } : t));
    try {
      await fetch("/api/brand/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, done: !done }),
      });
    } catch { /* ignore */ } finally {
      setToggling(null);
    }
  }

  async function addTask(week: number) {
    if (!newTitle.trim()) return;
    const weekGroup = weeks.find(w => w.week === week);
    try {
      const res = await fetch("/api/brand/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          category: newCategory,
          priority: newPriority,
          week,
          week_label: weekGroup?.label || "",
          week_date: weekGroup?.date || "",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(prev => [...prev, {
          id: data.id,
          title: newTitle.trim(),
          description: null,
          category: newCategory,
          priority: newPriority,
          week,
          week_label: weekGroup?.label || "",
          week_date: weekGroup?.date || "",
          done: false,
        }]);
        setNewTitle("");
        setAddingWeek(null);
      }
    } catch { /* ignore */ }
  }

  async function deleteTask(id: number) {
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await fetch("/api/brand/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch { /* ignore */ }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 text-orbital-purple animate-spin" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-orbitron)] text-lg tracking-wider text-orbital-text">
            CRONOGRAMA
          </h1>
          <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-1">
            Timeline de execução rumo ao Cup #2
          </p>
        </div>
        <BrandAIButton
          action="gerar-cronograma"
          label="GERAR COM IA"
          variant="compact"
          confirmMessage="A IA vai substituir todas as tasks atuais por um novo cronograma. Continuar?"
          onComplete={() => fetchTasks()}
        />
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={12} className="text-orbital-text-dim" />
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.id)}
            className={`px-3 py-1.5 font-[family-name:var(--font-jetbrains)] text-[0.65rem] border transition-colors ${
              filter === cat.id
                ? "bg-orbital-purple/15 border-orbital-purple/40 text-orbital-purple"
                : "bg-[#111] border-[#1A1A1A] text-orbital-text-dim hover:border-[#333]"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Purple line */}
        <div className="absolute left-[11px] top-0 bottom-0 w-0.5 bg-orbital-purple/20" />

        <div className="space-y-8">
          {filteredWeeks.map((wg, idx) => {
            const weekDone = wg.tasks.filter(t => t.done).length;
            const weekTotal = wg.tasks.length;
            const weekPct = weekTotal > 0 ? Math.round((weekDone / weekTotal) * 100) : 0;
            const isCurrent = idx === 0;

            return (
              <div key={wg.week} className="relative pl-10">
                {/* Dot */}
                <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  weekPct === 100
                    ? "bg-green-500/20 border-green-500"
                    : isCurrent
                      ? "bg-orbital-purple/20 border-orbital-purple animate-pulse"
                      : "bg-[#111] border-[#333]"
                }`}>
                  {weekPct === 100 && <Check size={10} className="text-green-500" />}
                  {weekPct < 100 && isCurrent && <div className="w-2 h-2 rounded-full bg-orbital-purple" />}
                </div>

                {/* Week Header */}
                <div className="mb-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-text">
                      {wg.label}
                    </h3>
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                      {wg.date}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="w-24 h-1 bg-[#1A1A1A] rounded-full overflow-hidden">
                      <div className="h-full bg-orbital-purple rounded-full transition-all" style={{ width: `${weekPct}%` }} />
                    </div>
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">
                      {weekDone}/{weekTotal}
                    </span>
                  </div>
                </div>

                {/* Tasks */}
                <div className="space-y-1.5">
                  <AnimatePresence>
                    {wg.tasks.map((task) => {
                      const catColor = CATEGORY_COLORS[task.category] || { bg: "bg-gray-500/15", text: "text-gray-300" };
                      const prio = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS.med;
                      return (
                        <motion.div
                          key={task.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className={`flex items-center gap-3 px-3 py-2 bg-[#111] border border-[#1A1A1A] group ${
                            task.done ? "opacity-50" : ""
                          }`}
                        >
                          <button
                            onClick={() => toggleTask(task.id, task.done)}
                            disabled={toggling === task.id}
                            className={`w-4 h-4 rounded-sm border shrink-0 flex items-center justify-center transition-colors ${
                              task.done
                                ? "bg-green-500/20 border-green-500"
                                : "border-[#333] hover:border-orbital-purple"
                            }`}
                          >
                            {task.done && <Check size={8} className="text-green-500" />}
                            {toggling === task.id && <Loader2 size={8} className="animate-spin text-orbital-purple" />}
                          </button>

                          <span className={`font-[family-name:var(--font-jetbrains)] text-xs flex-1 ${
                            task.done ? "line-through text-orbital-text-dim" : "text-orbital-text"
                          }`}>
                            {task.title}
                          </span>

                          <span className={`px-1.5 py-0.5 ${catColor.bg} ${catColor.text} font-[family-name:var(--font-jetbrains)] text-[0.55rem] rounded-sm`}>
                            {task.category}
                          </span>

                          <span className={`font-[family-name:var(--font-jetbrains)] text-[0.55rem] ${prio.cls}`}>
                            {prio.label}
                          </span>

                          <button
                            onClick={() => deleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 text-orbital-text-dim hover:text-red-400 transition-all"
                          >
                            <Trash2 size={12} />
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Add Task */}
                {addingWeek === wg.week ? (
                  <div className="mt-2 p-3 bg-[#0A0A0A] border border-orbital-purple/30 space-y-2">
                    <input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Título da task..."
                      className="w-full bg-transparent border border-[#1A1A1A] px-2 py-1.5 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder-orbital-text-dim/40 focus:outline-none focus:border-orbital-purple/40"
                      onKeyDown={(e) => e.key === "Enter" && addTask(wg.week)}
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="bg-[#111] border border-[#1A1A1A] px-2 py-1 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text focus:outline-none"
                      >
                        <option value="instagram">Instagram</option>
                        <option value="conteudo">Conteúdo</option>
                        <option value="negocio">Negócio</option>
                        <option value="tech">Tech</option>
                        <option value="campeonato">Campeonato</option>
                      </select>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value)}
                        className="bg-[#111] border border-[#1A1A1A] px-2 py-1 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text focus:outline-none"
                      >
                        <option value="high">Alta</option>
                        <option value="med">Média</option>
                        <option value="low">Baixa</option>
                      </select>
                      <button
                        onClick={() => addTask(wg.week)}
                        className="px-3 py-1 bg-orbital-purple/20 border border-orbital-purple/40 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-purple hover:bg-orbital-purple/30 transition-colors"
                      >
                        Adicionar
                      </button>
                      <button
                        onClick={() => { setAddingWeek(null); setNewTitle(""); }}
                        className="text-orbital-text-dim hover:text-orbital-text"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingWeek(wg.week)}
                    className="mt-2 flex items-center gap-1.5 px-3 py-1.5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim hover:text-orbital-purple transition-colors"
                  >
                    <Plus size={10} /> Adicionar task
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
