import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { checkAdmin } from "../brand/auth";

export async function POST(req: NextRequest) {
  const authError = await checkAdmin(req);
  if (authError) return authError;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    // Validate file type
    // SVG removed: can contain <script> tags (Stored XSS)
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de arquivo não permitido. Use PNG, JPG, WebP ou GIF." }, { status: 400 });
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Arquivo muito grande. Máximo 2MB." }, { status: 400 });
    }

    const MIME_TO_EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
    const ext = MIME_TO_EXT[file.type] || "png";
    const filename = `logos/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao fazer upload";
    console.error("[UPLOAD ERROR]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
