"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2, Check, AlertCircle, Server, Wifi, WifiOff } from "lucide-react";
import { HudCard } from "@/components/hud-card";
import { useEffect, useState } from "react";
import { Server as ServerType, createServer, updateServer, deleteServer } from "@/lib/api";

export default function AdminServidores() {
  const [servers, setServers] = useState<ServerType[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ServerType | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [ipString, setIpString] = useState("");
  const [port, setPort] = useState("27015");
  const [rconPassword, setRconPassword] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [flag, setFlag] = useState("BR");

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [statuses, setStatuses] = useState<Record<number, boolean | null>>({});

  const fetchServers = async () => {
    try {
      const res = await fetch("/api/servers", { credentials: "include" });
      const data = await res.json();
      setServers(data.servers || []);
    } catch { /* */ }
    setLoading(false);
  };

  useEffect(() => { fetchServers(); }, []);

  // Check server status
  const checkStatus = async (id: number) => {
    setStatuses(prev => ({ ...prev, [id]: null }));
    try {
      const res = await fetch(`/api/servers/${id}/status`, { credentials: "include" });
      setStatuses(prev => ({ ...prev, [id]: res.ok }));
    } catch {
      setStatuses(prev => ({ ...prev, [id]: false }));
    }
  };

  const resetForm = () => {
    setDisplayName("");
    setIpString("");
    setPort("27015");
    setRconPassword("");
    setIsPublic(true);
    setFlag("BR");
    setEditing(null);
    setShowForm(false);
    setFeedback(null);
  };

  const openEdit = (server: ServerType) => {
    setEditing(server);
    setDisplayName(server.display_name);
    setIpString(server.ip_string);
    setPort(server.port.toString());
    setRconPassword("");
    setIsPublic(server.public_server);
    setFlag(server.flag || "BR");
    setShowForm(true);
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!displayName || !ipString || !port) {
      setFeedback({ type: "error", msg: "Nome, IP e porta são obrigatórios." });
      return;
    }
    if (!editing && !rconPassword) {
      setFeedback({ type: "error", msg: "Senha RCON é obrigatória para novos servidores." });
      return;
    }

    setSubmitting(true);
    try {
      if (editing) {
        await updateServer({
          server_id: editing.id,
          display_name: displayName,
          ip_string: ipString,
          port: parseInt(port),
          ...(rconPassword ? { rcon_password: rconPassword } : {}),
          public_server: isPublic,
          flag,
        });
        setFeedback({ type: "success", msg: `Servidor "${displayName}" atualizado!` });
      } else {
        await createServer({
          display_name: displayName,
          ip_string: ipString,
          port: parseInt(port),
          rcon_password: rconPassword,
          public_server: isPublic,
          flag,
        });
        setFeedback({ type: "success", msg: `Servidor "${displayName}" criado!` });
      }
      await fetchServers();
      setTimeout(resetForm, 1500);
    } catch (err) {
      setFeedback({ type: "error", msg: err instanceof Error ? err.message : "Erro ao salvar servidor" });
    }
    setSubmitting(false);
  };

  const handleDelete = async (server: ServerType) => {
    if (!confirm(`Deletar servidor "${server.display_name}"?`)) return;
    setDeleting(server.id);
    try {
      await deleteServer(server.id);
      await fetchServers();
    } catch {
      alert("Erro ao deletar servidor");
    }
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-orbital-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-[family-name:var(--font-orbitron)] text-sm font-bold text-orbital-text tracking-wider">
          SERVIDORES ({servers.length})
        </h2>
        {!showForm && (
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple">
            <Plus size={14} />
            NOVO SERVIDOR
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <HudCard label={editing ? "EDITAR SERVIDOR" : "NOVO SERVIDOR"} className="mb-6">
              <form onSubmit={handleSubmit} className="space-y-4 py-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">NOME</label>
                    <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Servidor CS2" className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors placeholder:text-orbital-text-dim/30" />
                  </div>
                  <div>
                    <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">PAÍS</label>
                    <input type="text" value={flag} onChange={e => setFlag(e.target.value)} placeholder="BR" maxLength={2} className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors placeholder:text-orbital-text-dim/30" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">IP</label>
                    <input type="text" value={ipString} onChange={e => setIpString(e.target.value)} placeholder="192.168.1.1" className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors placeholder:text-orbital-text-dim/30" />
                  </div>
                  <div>
                    <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">PORTA</label>
                    <input type="number" value={port} onChange={e => setPort(e.target.value)} placeholder="27015" className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors placeholder:text-orbital-text-dim/30" />
                  </div>
                  <div>
                    <label className="block font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-[0.15em] text-orbital-text-dim mb-2">RCON SENHA</label>
                    <input type="password" value={rconPassword} onChange={e => setRconPassword(e.target.value)} placeholder={editing ? "(manter atual)" : "Senha RCON"} className="w-full bg-[#0A0A0A] border border-orbital-border text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm px-3 py-2.5 focus:border-orbital-purple/50 focus:outline-none transition-colors placeholder:text-orbital-text-dim/30" />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} className="w-4 h-4 accent-orbital-purple" />
                  <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">Servidor público</span>
                </label>

                {feedback && (
                  <div className={`flex items-center gap-2 px-4 py-3 border font-[family-name:var(--font-jetbrains)] text-xs ${feedback.type === "success" ? "bg-orbital-success/10 border-orbital-success/30 text-orbital-success" : "bg-orbital-danger/10 border-orbital-danger/30 text-orbital-danger"}`}>
                    {feedback.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
                    {feedback.msg}
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="submit" disabled={submitting} className="flex items-center gap-2 px-6 py-2.5 bg-orbital-purple/20 border border-orbital-purple/50 hover:bg-orbital-purple/30 transition-all font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple disabled:opacity-50">
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    {editing ? "SALVAR" : "CRIAR"}
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

      {/* Server List */}
      <div className="space-y-2">
        {servers.map((server, i) => (
          <motion.div
            key={server.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-orbital-card border border-orbital-border p-4 flex items-center justify-between hover:border-orbital-purple/20 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-orbital-purple/10 border border-orbital-purple/20 flex items-center justify-center">
                <Server size={16} className="text-orbital-purple" />
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-orbitron)] text-xs font-bold text-orbital-text tracking-wider">
                  {server.display_name}
                </h3>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                    {server.ip_string}:{server.port}
                  </span>
                  {server.flag && <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim/50">{server.flag}</span>}
                  {server.public_server && <span className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-success/50">PÚBLICO</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => checkStatus(server.id)}
                className="p-2 text-orbital-text-dim hover:text-orbital-warning transition-colors"
                title="Verificar status"
              >
                {statuses[server.id] === null ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : statuses[server.id] === true ? (
                  <Wifi size={14} className="text-orbital-success" />
                ) : statuses[server.id] === false ? (
                  <WifiOff size={14} className="text-orbital-danger" />
                ) : (
                  <Wifi size={14} />
                )}
              </button>
              <button onClick={() => openEdit(server)} className="p-2 text-orbital-text-dim hover:text-orbital-purple transition-colors" title="Editar">
                <Pencil size={14} />
              </button>
              <button onClick={() => handleDelete(server)} disabled={deleting === server.id} className="p-2 text-orbital-text-dim hover:text-orbital-danger transition-colors" title="Deletar">
                {deleting === server.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          </motion.div>
        ))}

        {servers.length === 0 && (
          <HudCard className="text-center py-8">
            <Server size={24} className="text-orbital-border mx-auto mb-3" />
            <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">Nenhum servidor cadastrado</p>
          </HudCard>
        )}
      </div>
    </div>
  );
}
