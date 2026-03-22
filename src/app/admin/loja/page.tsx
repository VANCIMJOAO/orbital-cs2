"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { ShoppingBag, Package, Plus, X, Loader2, Trash2, CheckCircle2, AlertCircle, Eye, EyeOff, ExternalLink } from "lucide-react";

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  sizes: string[];
  stock: number;
  active: boolean;
}

interface Order {
  id: number;
  customer_name: string;
  customer_whatsapp: string;
  customer_email: string | null;
  address: string | null;
  items: { name: string; size: string; qty: number; price: number }[];
  total: number;
  status: "pendente" | "pago" | "enviado" | "entregue" | "cancelado";
  created_at: string;
}

const statusColors: Record<string, { text: string; bg: string }> = {
  pendente: { text: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
  pago: { text: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
  enviado: { text: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30" },
  entregue: { text: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
  cancelado: { text: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
};

export default function AdminLojaPage() {
  const [tab, setTab] = useState<"produtos" | "pedidos">("produtos");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Product form
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pImage, setPImage] = useState("");
  const [pSizes, setPSizes] = useState("P,M,G,GG");
  const [pStock, setPStock] = useState("10");

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setPName(p.name);
    setPDesc(p.description || "");
    setPPrice(String(p.price));
    setPImage(p.image_url || "");
    setPSizes(p.sizes.join(","));
    setPStock(String(p.stock));
    setShowForm(true);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSubmitting(true);
    const res = await fetch("/api/loja", {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "produto",
        id: editingId,
        name: pName,
        description: pDesc || null,
        price: parseInt(pPrice),
        image_url: pImage || null,
        sizes: JSON.stringify(pSizes.split(",").map(s => s.trim()).filter(Boolean)),
        stock: parseInt(pStock) || 0,
      }),
    });
    if (res.ok) {
      setFeedback({ type: "success", msg: "Produto atualizado!" });
      setEditingId(null);
      setShowForm(false);
      setPName(""); setPDesc(""); setPPrice(""); setPImage(""); setPSizes("P,M,G,GG"); setPStock("10");
      await fetchData();
    } else {
      setFeedback({ type: "error", msg: "Erro ao atualizar" });
    }
    setSubmitting(false);
  };

  const fetchData = useCallback(async () => {
    try {
      const [prodRes, ordRes] = await Promise.all([
        fetch("/api/loja", { credentials: "include" }).then(r => r.json()).catch(() => ({ produtos: [] })),
        fetch("/api/loja?type=pedidos", { credentials: "include" }).then(r => r.json()).catch(() => ({ pedidos: [] })),
      ]);
      setProducts((prodRes.produtos || []).map((p: Product) => ({
        ...p,
        sizes: typeof p.sizes === "string" ? JSON.parse(p.sizes) : (p.sizes || []),
      })));
      setOrders((ordRes.pedidos || []).map((o: Order) => ({
        ...o,
        items: typeof o.items === "string" ? JSON.parse(o.items) : (o.items || []),
      })));
    } catch { /* */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createProduct = async () => {
    if (!pName || !pPrice) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/loja", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pName, description: pDesc || null, price: parseInt(pPrice),
          image_url: pImage || null, sizes: pSizes.split(",").map(s => s.trim()).filter(Boolean),
          stock: parseInt(pStock) || 10,
        }),
      });
      if (res.ok) {
        setFeedback({ type: "success", msg: "Produto criado" });
        setShowForm(false);
        setPName(""); setPDesc(""); setPPrice(""); setPImage("");
        await fetchData();
      } else {
        const d = await res.json();
        setFeedback({ type: "error", msg: d.error || "Erro" });
      }
    } catch { setFeedback({ type: "error", msg: "Erro de conexão" }); }
    setSubmitting(false);
    setTimeout(() => setFeedback(null), 3000);
  };

  const toggleProduct = async (id: number, active: boolean) => {
    await fetch("/api/loja", {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, active: !active }),
    });
    await fetchData();
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Deletar produto?")) return;
    await fetch(`/api/loja?id=${id}`, { method: "DELETE", credentials: "include" });
    await fetchData();
  };

  const updateOrderStatus = async (id: number, status: string) => {
    await fetch("/api/loja", {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "pedido", id, status }),
    });
    await fetchData();
  };

  const inputClass = "w-full bg-[#111] border border-orbital-border px-3 py-2 text-orbital-text font-[family-name:var(--font-jetbrains)] text-xs placeholder:text-orbital-text-dim/50 focus:outline-none focus:border-orbital-purple/50";

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="text-orbital-purple animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag size={18} className="text-orbital-purple" />
          <div>
            <h1 className="font-[family-name:var(--font-orbitron)] text-lg tracking-wider text-orbital-text">LOJA</h1>
            <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
              {products.length} produtos — {orders.length} pedidos
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(["produtos", "pedidos"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider border transition-colors ${
              tab === t ? "bg-orbital-purple/10 border-orbital-purple/50 text-orbital-purple" : "bg-[#0A0A0A] border-orbital-border text-orbital-text-dim hover:text-orbital-text"
            }`}
          >
            {t === "produtos" ? <Package size={12} className="inline mr-1.5" /> : <ShoppingBag size={12} className="inline mr-1.5" />}
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`flex items-center gap-2 p-3 text-xs font-[family-name:var(--font-jetbrains)] ${feedback.type === "success" ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"}`}>
          {feedback.type === "success" ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
          {feedback.msg}
        </div>
      )}

      {/* PRODUTOS TAB */}
      {tab === "produtos" && (
        <div className="space-y-4">
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 text-orbital-purple font-[family-name:var(--font-jetbrains)] text-xs transition-colors"
          >
            {showForm ? <X size={12} /> : <Plus size={12} />}
            {showForm ? "CANCELAR" : "NOVO PRODUTO"}
          </button>

          {showForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="overflow-hidden">
              <div className="bg-[#0A0A0A] border border-orbital-purple/30 p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-orbital-purple mb-1 block">NOME *</label>
                    <input type="text" value={pName} onChange={e => setPName(e.target.value)} placeholder="Camiseta Oversized" className={inputClass} />
                  </div>
                  <div>
                    <label className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-orbital-purple mb-1 block">PREÇO (R$) *</label>
                    <input type="number" value={pPrice} onChange={e => setPPrice(e.target.value)} placeholder="89" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-orbital-purple mb-1 block">DESCRIÇÃO</label>
                  <input type="text" value={pDesc} onChange={e => setPDesc(e.target.value)} placeholder="Streetwear com referências CS2" className={inputClass} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-orbital-purple mb-1 block">IMAGEM URL</label>
                    <input type="text" value={pImage} onChange={e => setPImage(e.target.value)} placeholder="https://..." className={inputClass} />
                  </div>
                  <div>
                    <label className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-orbital-purple mb-1 block">TAMANHOS</label>
                    <input type="text" value={pSizes} onChange={e => setPSizes(e.target.value)} placeholder="P,M,G,GG" className={inputClass} />
                  </div>
                  <div>
                    <label className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-orbital-purple mb-1 block">ESTOQUE</label>
                    <input type="number" value={pStock} onChange={e => setPStock(e.target.value)} placeholder="10" className={inputClass} />
                  </div>
                </div>
                <button onClick={editingId ? saveEdit : createProduct} disabled={!pName || !pPrice || submitting}
                  className="px-4 py-2 bg-orbital-purple text-white font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider hover:bg-orbital-purple/80 disabled:opacity-30 transition-colors flex items-center gap-1.5"
                >
                  {submitting ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                  {editingId ? "SALVAR ALTERAÇÕES" : "CRIAR PRODUTO"}
                </button>
                {editingId && (
                  <button onClick={() => { setEditingId(null); setShowForm(false); setPName(""); setPDesc(""); setPPrice(""); setPImage(""); setPSizes("P,M,G,GG"); setPStock("10"); }}
                    className="px-4 py-2 text-orbital-text-dim hover:text-orbital-text font-[family-name:var(--font-jetbrains)] text-xs transition-colors"
                  >
                    CANCELAR EDIÇÃO
                  </button>
                )}
              </div>
            </motion.div>
          )}

          {/* Product list */}
          {products.length === 0 ? (
            <div className="bg-[#0A0A0A] border border-orbital-border p-8 text-center">
              <Package size={24} className="text-orbital-text-dim mx-auto mb-2" />
              <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">Nenhum produto cadastrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {products.map(p => (
                <div key={p.id} className={`flex items-center gap-3 p-3 bg-[#0A0A0A] border ${p.active ? "border-orbital-border" : "border-red-500/20 opacity-50"}`}>
                  {p.image_url && <img src={p.image_url} alt="" className="w-12 h-12 object-cover border border-orbital-border" />}
                  <div className="flex-1 min-w-0">
                    <div className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-text">{p.name}</div>
                    <div className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                      R$ {p.price} — {(p.sizes || []).join(", ")} — Estoque: {p.stock}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => startEdit(p)} className="p-1.5 text-orbital-text-dim hover:text-cyan-400 transition-colors" title="Editar">
                      <Package size={14} />
                    </button>
                    <button onClick={() => toggleProduct(p.id, p.active)} className="p-1.5 text-orbital-text-dim hover:text-orbital-purple transition-colors" title={p.active ? "Desativar" : "Ativar"}>
                      {p.active ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button onClick={() => deleteProduct(p.id)} className="p-1.5 text-orbital-text-dim hover:text-red-400 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PEDIDOS TAB */}
      {tab === "pedidos" && (
        <div className="space-y-2">
          {orders.length === 0 ? (
            <div className="bg-[#0A0A0A] border border-orbital-border p-8 text-center">
              <ShoppingBag size={24} className="text-orbital-text-dim mx-auto mb-2" />
              <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">Nenhum pedido recebido</p>
            </div>
          ) : (
            orders.map((o, idx) => {
              const sc = statusColors[o.status] || statusColors.pendente;
              return (
                <motion.div key={o.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}
                  className={`bg-[#0A0A0A] border p-4 space-y-3 ${sc.bg}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-text">PEDIDO #{o.id}</span>
                      <span className={`ml-2 font-[family-name:var(--font-jetbrains)] text-[0.65rem] px-1.5 py-0.5 ${sc.bg} ${sc.text}`}>
                        {o.status.toUpperCase()}
                      </span>
                    </div>
                    <span className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim">
                      {new Date(o.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-orbital-purple">CLIENTE</div>
                      <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">{o.customer_name}</div>
                    </div>
                    <div>
                      <div className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-orbital-purple">WHATSAPP</div>
                      <a href={`https://wa.me/55${o.customer_whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                        className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text hover:text-orbital-purple flex items-center gap-1"
                      >
                        {o.customer_whatsapp} <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>

                  <div>
                    <div className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-orbital-purple mb-1">ITENS</div>
                    {o.items.map((item, i) => (
                      <div key={i} className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">
                        {item.qty}x {item.name} ({item.size}) — R$ {item.price}
                      </div>
                    ))}
                    <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-purple mt-1 font-bold">
                      Total: R$ {o.total}
                    </div>
                  </div>

                  {o.address && (
                    <div>
                      <div className="font-[family-name:var(--font-orbitron)] text-[0.65rem] tracking-wider text-orbital-purple">ENDEREÇO</div>
                      <div className="font-[family-name:var(--font-jetbrains)] text-[0.65rem] text-orbital-text-dim">{o.address}</div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t border-orbital-border/20">
                    {o.status === "pendente" && (
                      <>
                        <button onClick={() => updateOrderStatus(o.id, "pago")} className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 font-[family-name:var(--font-jetbrains)] text-xs hover:border-blue-500/60 transition-colors">PAGO</button>
                        <button onClick={() => updateOrderStatus(o.id, "cancelado")} className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 font-[family-name:var(--font-jetbrains)] text-xs hover:border-red-500/60 transition-colors">CANCELAR</button>
                      </>
                    )}
                    {o.status === "pago" && (
                      <button onClick={() => updateOrderStatus(o.id, "enviado")} className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-[family-name:var(--font-jetbrains)] text-xs hover:border-cyan-500/60 transition-colors">ENVIADO</button>
                    )}
                    {o.status === "enviado" && (
                      <button onClick={() => updateOrderStatus(o.id, "entregue")} className="px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 font-[family-name:var(--font-jetbrains)] text-xs hover:border-green-500/60 transition-colors">ENTREGUE</button>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
