"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import {
  CheckSquare, Check, Plus, Loader2, Trash2, X, ChevronDown, ChevronRight
} from "lucide-react";
import { BrandAIButton } from "@/components/brand-ai-button";

interface CheckItem {
  id: number;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  done: boolean;
  sort_order: number;
}

const CATEGORY_INFO: Record<string, { label: string; color: string }> = {
  visual: { label: "Identidade Visual", color: "border-purple-500" },
  digital: { label: "Presenca Digital", color: "border-blue-500" },
  patrocinio: { label: "Captacao de Patrocinio", color: "border-amber-500" },
  campeonato: { label: "Organizacao Cup #2", color: "border-red-500" },
};

const PRIORITY_BADGE: Record<string, { label: string; cls: string }> = {
  high: { label: "Alta", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  med: { label: "Media", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  low: { label: "Baixa", cls: "bg-green-500/15 text-green-400 border-green-500/30" },
};

export default function ChecklistPage() {
  const [items, setItems] = useState<CheckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [addingCategory, setAddingCategory] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("med");
  const [toggling, setToggling] = useState<number | null>(null);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch("/api/brand/checklist");
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.checklist || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const categories = ["visual", "digital", "patrocinio", "campeonato"];

  async function toggleItem(id: number, done: boolean) {
    setToggling(id);
    setItems(prev => prev.map(i => i.id === id ? { ...i, done: !done } : i));
    try {
      await fetch("/api/brand/checklist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, done: !done }),
      });
    } catch { /* ignore */ } finally {
      setToggling(null);
    }
  }

  async function addItem(category: string) {
    if (!newTitle.trim()) return;
    try {
      const res = await fetch("/api/brand/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), category, priority: newPriority }),
      });
      if (res.ok) {
        const data = await res.json();
        setItems(prev => [...prev, {
          id: data.id,
          title: newTitle.trim(),
          description: null,
          category,
          priority: newPriority,
          done: false,
          sort_order: 999,
        }]);
        setNewTitle("");
        setAddingCategory(null);
      }
    } catch { /* ignore */ }
  }

  async function deleteItem(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await fetch("/api/brand/checklist", {
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-orbitron)] text-lg tracking-wider text-orbital-text">
            CHECKLIST
          </h1>
          <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim mt-1">
            Itens essenciais para o lancamento da marca
          </p>
        </div>
        <BrandAIButton
          action="revisar-checklist"
          label="REVISAR COM IA"
          variant="compact"
          onComplete={() => fetchItems()}
        />
      </div>

      <div className="space-y-4">
        {categories.map((cat) => {
          const catInfo = CATEGORY_INFO[cat] || { label: cat, color: "border-gray-500" };
          const catItems = items.filter(i => i.category === cat);
          const doneCount = catItems.filter(i => i.done).length;
          const totalCount = catItems.length;
          const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
          const isCollapsed = collapsed[cat];

          return (
            <div key={cat} className={`bg-[#111] border border-[#1A1A1A] overflow-hidden border-l-2 ${catInfo.color}`}>
              {/* Category Header */}
              <button
                onClick={() => setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isCollapsed ? <ChevronRight size={14} className="text-orbital-text-dim" /> : <ChevronDown size={14} className="text-orbital-text-dim" />}
                  <h3 className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-text">
                    {catInfo.label.toUpperCase()}
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-1.5 bg-[#1A1A1A] rounded-full overflow-hidden">
                    <div className="h-full bg-orbital-purple rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                    {doneCount}/{totalCount} concluidos
                  </span>
                </div>
              </button>

              {/* Items */}
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 space-y-1">
                      {catItems.map((item) => {
                        const prio = PRIORITY_BADGE[item.priority] || PRIORITY_BADGE.med;
                        return (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 px-3 py-2 rounded-sm group transition-opacity ${
                              item.done ? "opacity-50" : ""
                            }`}
                          >
                            <button
                              onClick={() => toggleItem(item.id, item.done)}
                              disabled={toggling === item.id}
                              className={`w-4 h-4 rounded-sm border shrink-0 flex items-center justify-center transition-colors ${
                                item.done
                                  ? "bg-green-500/20 border-green-500"
                                  : "border-[#333] hover:border-orbital-purple"
                              }`}
                            >
                              {item.done && <Check size={8} className="text-green-500" />}
                              {toggling === item.id && <Loader2 size={8} className="animate-spin text-orbital-purple" />}
                            </button>

                            <span className={`font-[family-name:var(--font-jetbrains)] text-xs flex-1 ${
                              item.done ? "line-through text-orbital-text-dim" : "text-orbital-text"
                            }`}>
                              {item.title}
                            </span>

                            <span className={`px-1.5 py-0.5 border ${prio.cls} font-[family-name:var(--font-jetbrains)] text-[0.55rem] rounded-sm`}>
                              {prio.label}
                            </span>

                            <button
                              onClick={() => deleteItem(item.id)}
                              className="opacity-0 group-hover:opacity-100 text-orbital-text-dim hover:text-red-400 transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}

                      {/* Add Item */}
                      {addingCategory === cat ? (
                        <div className="mt-2 p-3 bg-[#0A0A0A] border border-orbital-purple/30 space-y-2">
                          <input
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            placeholder="Titulo do item..."
                            className="w-full bg-transparent border border-[#1A1A1A] px-2 py-1.5 font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text placeholder-orbital-text-dim/40 focus:outline-none focus:border-orbital-purple/40"
                            onKeyDown={(e) => e.key === "Enter" && addItem(cat)}
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <select
                              value={newPriority}
                              onChange={(e) => setNewPriority(e.target.value)}
                              className="bg-[#111] border border-[#1A1A1A] px-2 py-1 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text focus:outline-none"
                            >
                              <option value="high">Alta</option>
                              <option value="med">Media</option>
                              <option value="low">Baixa</option>
                            </select>
                            <button
                              onClick={() => addItem(cat)}
                              className="px-3 py-1 bg-orbital-purple/20 border border-orbital-purple/40 font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-purple hover:bg-orbital-purple/30 transition-colors"
                            >
                              Adicionar
                            </button>
                            <button
                              onClick={() => { setAddingCategory(null); setNewTitle(""); }}
                              className="text-orbital-text-dim hover:text-orbital-text"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAddingCategory(cat)}
                          className="flex items-center gap-1.5 px-3 py-1.5 font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim hover:text-orbital-purple transition-colors"
                        >
                          <Plus size={10} /> Adicionar item
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
