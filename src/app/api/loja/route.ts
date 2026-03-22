import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/tournaments-db";
import { checkAdmin } from "../brand/auth";

let tableReady = false;

async function ensureTable() {
  if (tableReady) return;
  const pool = dbPool;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS loja_produtos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      price INT NOT NULL,
      image_url VARCHAR(512),
      sizes JSON,
      active BOOLEAN DEFAULT TRUE,
      stock INT DEFAULT 0,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS loja_pedidos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(255) NOT NULL,
      customer_whatsapp VARCHAR(20) NOT NULL,
      customer_email VARCHAR(255),
      address TEXT,
      items JSON NOT NULL,
      total INT NOT NULL,
      status ENUM('pendente','pago','enviado','entregue','cancelado') DEFAULT 'pendente',
      pix_comprovante_url VARCHAR(512),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  tableReady = true;
}

// GET — listar produtos (público) ou pedidos (admin)
export async function GET(req: NextRequest) {
  await ensureTable();
  const pool = dbPool;
  const type = req.nextUrl.searchParams.get("type");

  if (type === "pedidos") {
    const authError = await checkAdmin(req);
    if (authError) return authError;
    const [rows] = await pool.query("SELECT * FROM loja_pedidos ORDER BY created_at DESC");
    return NextResponse.json({ pedidos: rows });
  }

  // Público: produtos ativos
  const [rows] = await pool.query("SELECT * FROM loja_produtos WHERE active = TRUE ORDER BY sort_order, id");
  return NextResponse.json({ produtos: rows });
}

// POST — criar produto (admin) ou fazer pedido (público)
export async function POST(req: NextRequest) {
  await ensureTable();
  const pool = dbPool;
  const body = await req.json();

  // Pedido público
  if (body.action === "pedido") {
    const { customer_name, customer_whatsapp, customer_email, address, items } = body;
    if (!customer_name || !customer_whatsapp || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Campos obrigatórios faltando" }, { status: 400 });
    }

    // Validar e recalcular total no servidor (nunca confiar no client)
    const productIds = items.map((i: { product_id: number }) => i.product_id).filter(Boolean);
    let serverTotal = 0;
    if (productIds.length > 0) {
      const placeholders = productIds.map(() => "?").join(",");
      const [products] = await pool.query(
        `SELECT id, price, stock, name FROM loja_produtos WHERE id IN (${placeholders}) AND active = TRUE`,
        productIds
      ) as [{ id: number; price: number; stock: number; name: string }[], unknown];
      const productMap = new Map(products.map(p => [p.id, p]));

      for (const item of items) {
        // Validate quantity
        const qty = Math.floor(Number(item.qty || item.quantity || 1));
        if (!qty || qty < 1 || qty > 99) {
          return NextResponse.json({ error: `Quantidade inválida para produto ${item.product_id}` }, { status: 400 });
        }

        const product = productMap.get(item.product_id);
        if (!product) {
          return NextResponse.json({ error: `Produto ${item.product_id} não encontrado ou inativo` }, { status: 400 });
        }

        // Check stock
        if (product.stock < qty) {
          return NextResponse.json({ error: `${product.name} sem estoque suficiente (disponível: ${product.stock})` }, { status: 409 });
        }

        serverTotal += product.price * qty;
      }

      // Decrement stock
      for (const item of items) {
        const qty = Math.max(1, Math.floor(Number(item.qty || item.quantity || 1)));
        await pool.query("UPDATE loja_produtos SET stock = stock - ? WHERE id = ?", [qty, item.product_id]);
      }
    }

    if (serverTotal <= 0) {
      return NextResponse.json({ error: "Pedido inválido — produtos não encontrados" }, { status: 400 });
    }

    const [result] = await pool.query(
      "INSERT INTO loja_pedidos (customer_name, customer_whatsapp, customer_email, address, items, total) VALUES (?, ?, ?, ?, ?, ?)",
      [customer_name, customer_whatsapp, customer_email || null, address || null, JSON.stringify(items), serverTotal]
    ) as [{ insertId: number }, unknown];
    return NextResponse.json({ id: result.insertId, total: serverTotal }, { status: 201 });
  }

  // Criar produto (admin)
  const authError = await checkAdmin(req);
  if (authError) return authError;

  const { name, description, price, image_url, sizes, stock } = body;
  if (!name || !price) return NextResponse.json({ error: "name e price obrigatórios" }, { status: 400 });

  const [result] = await pool.query(
    "INSERT INTO loja_produtos (name, description, price, image_url, sizes, stock) VALUES (?, ?, ?, ?, ?, ?)",
    [name, description || null, price, image_url || null, JSON.stringify(sizes || []), stock || 0]
  ) as [{ insertId: number }, unknown];
  return NextResponse.json({ id: result.insertId }, { status: 201 });
}

// PUT — atualizar produto ou pedido (admin)
export async function PUT(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  await ensureTable();
  const pool = dbPool;
  const body = await req.json();

  if (body.type === "pedido") {
    const { id, status, notes } = body;
    if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    const updates: string[] = [];
    const params: (string | number)[] = [];
    if (status) { updates.push("status = ?"); params.push(status); }
    if (notes !== undefined) { updates.push("notes = ?"); params.push(notes); }
    if (updates.length === 0) return NextResponse.json({ error: "Nada" }, { status: 400 });
    params.push(id);
    await pool.query(`UPDATE loja_pedidos SET ${updates.join(", ")} WHERE id = ?`, params);
    return NextResponse.json({ ok: true });
  }

  // Produto
  const { id, name, description, price, image_url, sizes, stock, active } = body;
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  const updates: string[] = [];
  const params: (string | number | boolean)[] = [];
  if (name) { updates.push("name = ?"); params.push(name); }
  if (description !== undefined) { updates.push("description = ?"); params.push(description); }
  if (price !== undefined) { updates.push("price = ?"); params.push(price); }
  if (image_url !== undefined) { updates.push("image_url = ?"); params.push(image_url); }
  if (sizes !== undefined) { updates.push("sizes = ?"); params.push(JSON.stringify(sizes)); }
  if (stock !== undefined) { updates.push("stock = ?"); params.push(stock); }
  if (active !== undefined) { updates.push("active = ?"); params.push(active); }
  if (updates.length === 0) return NextResponse.json({ error: "Nada" }, { status: 400 });
  params.push(id);
  await pool.query(`UPDATE loja_produtos SET ${updates.join(", ")} WHERE id = ?`, params);
  return NextResponse.json({ ok: true });
}

// DELETE (admin)
export async function DELETE(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;
  await ensureTable();
  const pool = dbPool;
  const id = req.nextUrl.searchParams.get("id");
  const type = req.nextUrl.searchParams.get("type") || "produto";
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  const table = type === "pedido" ? "loja_pedidos" : "loja_produtos";
  await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
  return NextResponse.json({ ok: true });
}
