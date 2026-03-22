"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, Plus, Minus, ArrowLeft, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const formatPrice = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

interface Product {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  sizes: string[];
  stock: number;
}

interface CartItem {
  product: Product;
  size: string;
  qty: number;
}

export default function LojaPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  // Checkout form
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  useEffect(() => {
    fetch("/api/loja")
      .then(r => r.json())
      .then(d => {
        const prods = (d.produtos || []).map((p: Product) => ({
          ...p,
          sizes: typeof p.sizes === "string" ? JSON.parse(p.sizes) : (p.sizes || []),
        }));
        setProducts(prods);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addToCart = (product: Product, size: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id && i.size === size);
      if (existing) {
        return prev.map(i => i === existing ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { product, size, qty: 1 }];
    });
    setShowCart(true);
  };

  const updateQty = (idx: number, delta: number) => {
    setCart(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], qty: Math.max(0, next[idx].qty + delta) };
      return next.filter(i => i.qty > 0);
    });
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.product.price * i.qty, 0);
  const cartCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const handleCheckout = async () => {
    if (!name || !whatsapp || cart.length === 0) return;
    setSubmitting(true);
    setOrderResult(null);

    try {
      const res = await fetch("/api/loja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pedido",
          customer_name: name,
          customer_whatsapp: whatsapp,
          customer_email: email || undefined,
          address: address || undefined,
          items: cart.map(i => ({ product_id: i.product.id, name: i.product.name, size: i.size, qty: i.qty, price: i.product.price })),
          total: cartTotal,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrderResult({ type: "success", msg: `Pedido #${data.id} criado! Entraremos em contato via WhatsApp.` });
        setCart([]);
        setShowCheckout(false);
      } else {
        setOrderResult({ type: "error", msg: data.error || "Erro ao criar pedido" });
      }
    } catch {
      setOrderResult({ type: "error", msg: "Erro de conexão" });
    }
    setSubmitting(false);
  };

  const inputClass = "w-full bg-[#111] border border-orbital-border px-3 py-2.5 text-orbital-text font-[family-name:var(--font-jetbrains)] text-sm placeholder:text-orbital-text-dim/30 focus:outline-none focus:border-orbital-purple/50";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="text-orbital-purple animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/" className="flex items-center gap-2 text-orbital-text-dim hover:text-orbital-purple transition-colors mb-3 font-[family-name:var(--font-jetbrains)] text-xs">
            <ArrowLeft size={14} /> VOLTAR
          </Link>
          <div className="flex items-center gap-3">
            <ShoppingBag size={24} className="text-orbital-purple" />
            <div>
              <h1 className="font-[family-name:var(--font-orbitron)] text-xl tracking-wider text-orbital-text">LOJA</h1>
              <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim">Streetwear ORBITAL ROXA</p>
            </div>
          </div>
        </div>

        {/* Cart button */}
        {cartCount > 0 && (
          <button
            onClick={() => setShowCart(!showCart)}
            className="relative flex items-center gap-2 px-4 py-2 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider text-orbital-purple transition-colors"
          >
            <ShoppingBag size={14} />
            CARRINHO
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-orbital-purple text-white text-[0.5rem] flex items-center justify-center font-bold">
              {cartCount}
            </span>
          </button>
        )}
      </div>

      {/* Order success */}
      <AnimatePresence>
        {orderResult && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`mb-6 p-4 flex items-center gap-3 font-[family-name:var(--font-jetbrains)] text-sm ${
              orderResult.type === "success" ? "bg-green-500/10 border border-green-500/30 text-green-400" : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}
          >
            {orderResult.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {orderResult.msg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products grid */}
      {products.length === 0 ? (
        <div className="bg-[#0A0A0A] border border-orbital-border p-12 text-center">
          <ShoppingBag size={32} className="text-orbital-text-dim mx-auto mb-3" />
          <p className="font-[family-name:var(--font-jetbrains)] text-sm text-orbital-text-dim">Nenhum produto disponível no momento</p>
          <p className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text-dim/50 mt-1">Em breve teremos novidades</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, idx) => (
            <ProductCard key={product.id} product={product} onAdd={addToCart} delay={idx * 0.1} />
          ))}
        </div>
      )}

      {/* Cart sidebar */}
      <AnimatePresence>
        {showCart && cart.length > 0 && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="fixed top-0 right-0 w-full max-w-md h-full bg-[#0A0A0A] border-l border-orbital-border z-50 flex flex-col"
          >
            {/* Cart header */}
            <div className="flex items-center justify-between p-4 border-b border-orbital-border">
              <span className="font-[family-name:var(--font-orbitron)] text-sm tracking-wider text-orbital-text">CARRINHO</span>
              <button onClick={() => setShowCart(false)} className="text-orbital-text-dim hover:text-orbital-text">
                <X size={18} />
              </button>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.map((item, idx) => (
                <div key={`${item.product.id}-${item.size}`} className="flex items-center gap-3 p-3 bg-[#111] border border-orbital-border">
                  <div className="flex-1">
                    <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text">{item.product.name}</div>
                    <div className="font-[family-name:var(--font-jetbrains)] text-[0.55rem] text-orbital-text-dim">Tamanho: {item.size}</div>
                    <div className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-purple mt-0.5">{formatPrice(item.product.price)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateQty(idx, -1)} className="w-6 h-6 bg-[#0A0A0A] border border-orbital-border flex items-center justify-center text-orbital-text-dim hover:text-orbital-text">
                      <Minus size={10} />
                    </button>
                    <span className="font-[family-name:var(--font-jetbrains)] text-xs text-orbital-text w-4 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(idx, 1)} className="w-6 h-6 bg-[#0A0A0A] border border-orbital-border flex items-center justify-center text-orbital-text-dim hover:text-orbital-text">
                      <Plus size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Cart total + checkout */}
            <div className="p-4 border-t border-orbital-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-orbital-text-dim">TOTAL</span>
                <span className="font-[family-name:var(--font-orbitron)] text-lg text-orbital-purple">{formatPrice(cartTotal)}</span>
              </div>

              {!showCheckout ? (
                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full py-3 bg-orbital-purple hover:bg-orbital-purple/80 text-white font-[family-name:var(--font-orbitron)] text-sm tracking-wider transition-colors"
                >
                  FINALIZAR PEDIDO
                </button>
              ) : (
                <div className="space-y-2">
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome *" className={inputClass} />
                  <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="WhatsApp *" className={inputClass} />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (opcional)" className={inputClass} />
                  <textarea value={address} onChange={e => setAddress(e.target.value)} placeholder="Endereço para entrega (opcional)" rows={2} className={`${inputClass} resize-none`} />
                  <button
                    onClick={handleCheckout}
                    disabled={!name || !whatsapp || submitting}
                    className="w-full py-3 bg-orbital-purple hover:bg-orbital-purple/80 disabled:opacity-30 text-white font-[family-name:var(--font-orbitron)] text-sm tracking-wider transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <ShoppingBag size={16} />}
                    {submitting ? "ENVIANDO..." : `PEDIR — ${formatPrice(cartTotal)}`}
                  </button>
                  <p className="font-[family-name:var(--font-jetbrains)] text-[0.5rem] text-orbital-text-dim/40 text-center">
                    Pagamento via PIX — entraremos em contato pelo WhatsApp
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Backdrop */}
      <AnimatePresence>
        {showCart && cart.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCart(false)}
            className="fixed inset-0 bg-black/60 z-40"
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ProductCard({ product, onAdd, delay }: { product: Product; onAdd: (p: Product, size: string) => void; delay: number }) {
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] || "U");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-[#0A0A0A] border border-orbital-border overflow-hidden group hover:border-orbital-purple/30 transition-colors"
    >
      {/* Image */}
      <div className="aspect-square relative bg-[#111] overflow-hidden">
        {product.image_url ? (
          <Image src={product.image_url} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={48} className="text-orbital-text-dim/20" />
          </div>
        )}
        {product.stock <= 0 && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="font-[family-name:var(--font-orbitron)] text-xs tracking-wider text-red-400">ESGOTADO</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-[family-name:var(--font-orbitron)] text-sm tracking-wider text-orbital-text">{product.name}</h3>
          {product.description && (
            <p className="font-[family-name:var(--font-jetbrains)] text-[0.6rem] text-orbital-text-dim mt-1">{product.description}</p>
          )}
        </div>

        <div className="font-[family-name:var(--font-orbitron)] text-lg text-orbital-purple">
          {formatPrice(product.price)}
        </div>

        {/* Sizes */}
        {product.sizes.length > 0 && (
          <div className="flex gap-1.5">
            {product.sizes.map(size => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-2.5 py-1 font-[family-name:var(--font-jetbrains)] text-[0.55rem] border transition-colors ${
                  selectedSize === size
                    ? "bg-orbital-purple/20 border-orbital-purple/60 text-orbital-purple"
                    : "bg-[#111] border-orbital-border text-orbital-text-dim hover:border-orbital-purple/30"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        )}

        {/* Add to cart */}
        <button
          onClick={() => onAdd(product, selectedSize)}
          disabled={product.stock <= 0}
          className="w-full py-2.5 bg-orbital-purple/10 border border-orbital-purple/30 hover:border-orbital-purple/60 hover:bg-orbital-purple/20 disabled:opacity-30 disabled:cursor-not-allowed text-orbital-purple font-[family-name:var(--font-orbitron)] text-[0.6rem] tracking-wider transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={12} /> ADICIONAR
        </button>
      </div>
    </motion.div>
  );
}
