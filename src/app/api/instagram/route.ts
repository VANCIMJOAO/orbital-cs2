import { NextRequest, NextResponse } from "next/server";
import { dbPool } from "@/lib/tournaments-db";
import { checkAdmin } from "../brand/auth";

const META_GRAPH_URL = "https://graph.facebook.com/v21.0";

// Env vars needed:
// INSTAGRAM_ACCESS_TOKEN — long-lived token from Meta
// INSTAGRAM_BUSINESS_ID — Instagram Business account ID

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  const pool = dbPool;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS instagram_posts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      post_type ENUM('feed','reel','story','carousel') DEFAULT 'feed',
      caption TEXT,
      hashtags TEXT,
      media_url VARCHAR(512),
      media_type VARCHAR(20) DEFAULT 'IMAGE',
      scheduled_date DATE,
      scheduled_time VARCHAR(10),
      status ENUM('draft','scheduled','publishing','published','failed') DEFAULT 'draft',
      ig_container_id VARCHAR(50),
      ig_media_id VARCHAR(50),
      ig_permalink VARCHAR(255),
      error_message TEXT,
      insights JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      published_at DATETIME
    )
  `);
  tableReady = true;
}

// GET — listar posts (admin)
export async function GET(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;
  await ensureTable();

  const status = req.nextUrl.searchParams.get("status");
  const pool = dbPool;

  let query = "SELECT * FROM instagram_posts ORDER BY COALESCE(scheduled_date, '9999-12-31') ASC, created_at DESC";
  const params: string[] = [];

  if (status) {
    query = "SELECT * FROM instagram_posts WHERE status = ? ORDER BY COALESCE(scheduled_date, '9999-12-31') ASC, created_at DESC";
    params.push(status);
  }

  const [rows] = await pool.query(query, params);
  return NextResponse.json({ posts: rows });
}

// POST — criar post ou executar ação
export async function POST(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;
  await ensureTable();

  const pool = dbPool;
  const body = await req.json();

  // Ação: publicar post no Instagram
  if (body.action === "publish") {
    return publishToInstagram(body.post_id, pool);
  }

  // Ação: buscar insights de um post
  if (body.action === "insights") {
    return fetchInsights(body.post_id, pool);
  }

  // Ação: verificar conexão com Instagram
  if (body.action === "check_connection") {
    return checkConnection();
  }

  // Criar novo post
  const { title, post_type, caption, hashtags, media_url, media_type, scheduled_date, scheduled_time } = body;
  if (!title) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });

  const [result] = await pool.query(
    `INSERT INTO instagram_posts (title, post_type, caption, hashtags, media_url, media_type, scheduled_date, scheduled_time, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      post_type || "feed",
      caption || null,
      hashtags || null,
      media_url || null,
      media_type || "IMAGE",
      scheduled_date || null,
      scheduled_time || null,
      media_url ? "scheduled" : "draft",
    ]
  ) as [{ insertId: number }, unknown];

  return NextResponse.json({ id: result.insertId }, { status: 201 });
}

// PUT — atualizar post
export async function PUT(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;
  await ensureTable();

  const pool = dbPool;
  const body = await req.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const allowed = ["title", "post_type", "caption", "hashtags", "media_url", "media_type", "scheduled_date", "scheduled_time", "status"];
  const updates: string[] = [];
  const params: (string | number)[] = [];

  for (const key of allowed) {
    if (fields[key] !== undefined) {
      updates.push(`${key} = ?`);
      params.push(fields[key]);
    }
  }

  if (updates.length === 0) return NextResponse.json({ error: "Nada pra atualizar" }, { status: 400 });
  params.push(id);
  await pool.query(`UPDATE instagram_posts SET ${updates.join(", ")} WHERE id = ?`, params);
  return NextResponse.json({ ok: true });
}

// DELETE
export async function DELETE(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;
  await ensureTable();

  const pool = dbPool;
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  await pool.query("DELETE FROM instagram_posts WHERE id = ?", [id]);
  return NextResponse.json({ ok: true });
}

// ═══ Instagram Graph API Functions ═══

async function checkConnection(): Promise<NextResponse> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igId = process.env.INSTAGRAM_BUSINESS_ID;

  if (!token || !igId) {
    return NextResponse.json({
      connected: false,
      error: "INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_BUSINESS_ID não configurados",
    });
  }

  try {
    const res = await fetch(`${META_GRAPH_URL}/${igId}?fields=username,name,profile_picture_url,followers_count,media_count&access_token=${token}`);
    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ connected: false, error: err.error?.message || "Token inválido" });
    }
    const data = await res.json();
    return NextResponse.json({
      connected: true,
      account: {
        username: data.username,
        name: data.name,
        picture: data.profile_picture_url,
        followers: data.followers_count,
        posts: data.media_count,
      },
    });
  } catch (err) {
    return NextResponse.json({ connected: false, error: err instanceof Error ? err.message : "Erro" });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function publishToInstagram(postId: number, pool: any): Promise<NextResponse> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igId = process.env.INSTAGRAM_BUSINESS_ID;

  if (!token || !igId) {
    return NextResponse.json({ error: "Instagram não configurado" }, { status: 400 });
  }

  // Buscar post do banco
  const [rows] = await pool.query("SELECT * FROM instagram_posts WHERE id = ?", [postId]);
  const post = (rows as Record<string, unknown>[])[0];
  if (!post) return NextResponse.json({ error: "Post não encontrado" }, { status: 404 });
  if (!post.media_url) return NextResponse.json({ error: "Post sem mídia (URL da imagem/vídeo)" }, { status: 400 });

  const fullCaption = [post.caption, post.hashtags].filter(Boolean).join("\n\n");

  try {
    await pool.query("UPDATE instagram_posts SET status = 'publishing' WHERE id = ?", [postId]);

    // Step 1: Criar container
    const containerParams = new URLSearchParams({
      access_token: token,
      caption: fullCaption as string,
    });

    if (post.post_type === "reel") {
      containerParams.set("media_type", "REELS");
      containerParams.set("video_url", post.media_url as string);
    } else {
      containerParams.set("image_url", post.media_url as string);
    }

    const containerRes = await fetch(`${META_GRAPH_URL}/${igId}/media`, {
      method: "POST",
      body: containerParams,
    });

    if (!containerRes.ok) {
      const err = await containerRes.json();
      const errorMsg = err.error?.message || "Erro ao criar container";
      await pool.query("UPDATE instagram_posts SET status = 'failed', error_message = ? WHERE id = ?", [errorMsg, postId]);
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const containerData = await containerRes.json();
    const containerId = containerData.id;

    await pool.query("UPDATE instagram_posts SET ig_container_id = ? WHERE id = ?", [containerId, postId]);

    // Step 2: Aguardar processamento (pra vídeos pode demorar — max 50s pra não estourar timeout serverless)
    if (post.post_type === "reel") {
      let attempts = 0;
      let videoReady = false;
      while (attempts < 25) {
        const statusRes = await fetch(`${META_GRAPH_URL}/${containerId}?fields=status_code&access_token=${token}`);
        const statusData = await statusRes.json();
        if (statusData.status_code === "FINISHED") { videoReady = true; break; }
        if (statusData.status_code === "ERROR") {
          await pool.query("UPDATE instagram_posts SET status = 'failed', error_message = 'Video processing failed' WHERE id = ?", [postId]);
          return NextResponse.json({ error: "Processamento do vídeo falhou" }, { status: 400 });
        }
        await new Promise(r => setTimeout(r, 2000));
        attempts++;
      }
      if (!videoReady) {
        await pool.query("UPDATE instagram_posts SET status = 'failed', error_message = 'Video processing timeout (50s)' WHERE id = ?", [postId]);
        return NextResponse.json({ error: "Timeout no processamento do vídeo. Tente novamente." }, { status: 408 });
      }
    }

    // Step 3: Publicar
    const publishRes = await fetch(`${META_GRAPH_URL}/${igId}/media_publish`, {
      method: "POST",
      body: new URLSearchParams({
        access_token: token,
        creation_id: containerId,
      }),
    });

    if (!publishRes.ok) {
      const err = await publishRes.json();
      const errorMsg = err.error?.message || "Erro ao publicar";
      await pool.query("UPDATE instagram_posts SET status = 'failed', error_message = ? WHERE id = ?", [errorMsg, postId]);
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const publishData = await publishRes.json();
    const mediaId = publishData.id;

    // Step 4: Buscar permalink
    let permalink = "";
    try {
      const mediaRes = await fetch(`${META_GRAPH_URL}/${mediaId}?fields=permalink&access_token=${token}`);
      const mediaData = await mediaRes.json();
      permalink = mediaData.permalink || "";
    } catch { /* ok */ }

    await pool.query(
      "UPDATE instagram_posts SET status = 'published', ig_media_id = ?, ig_permalink = ?, published_at = NOW(), error_message = NULL WHERE id = ?",
      [mediaId, permalink, postId]
    );

    return NextResponse.json({ ok: true, mediaId, permalink });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao publicar";
    await pool.query("UPDATE instagram_posts SET status = 'failed', error_message = ? WHERE id = ?", [msg, postId]);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchInsights(postId: number, pool: any): Promise<NextResponse> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: "Token não configurado" }, { status: 400 });

  const [rows] = await pool.query("SELECT ig_media_id FROM instagram_posts WHERE id = ?", [postId]);
  const post = (rows as Record<string, unknown>[])[0];
  if (!post?.ig_media_id) return NextResponse.json({ error: "Post não publicado" }, { status: 400 });

  try {
    const res = await fetch(
      `${META_GRAPH_URL}/${post.ig_media_id}/insights?metric=impressions,reach,likes,comments,saved,shares&access_token=${token}`
    );
    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err.error?.message || "Erro" }, { status: 400 });
    }
    const data = await res.json();
    const insights: Record<string, number> = {};
    for (const item of data.data || []) {
      insights[item.name] = item.values?.[0]?.value || 0;
    }

    // Salvar insights no banco
    await pool.query("UPDATE instagram_posts SET insights = ? WHERE id = ?", [JSON.stringify(insights), postId]);

    return NextResponse.json({ insights });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro" }, { status: 500 });
  }
}
