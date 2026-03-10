import { NextRequest, NextResponse } from "next/server";

const PTERO_URL = process.env.PTERO_URL || "";
const PTERO_SERVER_ID = process.env.PTERO_SERVER_ID || "";
const PTERO_API_KEY = process.env.PTERO_API_KEY || "";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!filename) {
    return NextResponse.json({ error: "Filename required" }, { status: 400 });
  }

  const filePath = `/game/csgo/MatchZy/${filename}`;

  try {
    const res = await fetch(
      `${PTERO_URL}/api/client/servers/${PTERO_SERVER_ID}/files/download?file=${encodeURIComponent(filePath)}`,
      {
        headers: {
          Authorization: `Bearer ${PTERO_API_KEY}`,
          Accept: "application/json",
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("Pterodactyl API error:", res.status, text);
      return NextResponse.json(
        { error: "Falha ao obter link de download" },
        { status: res.status }
      );
    }

    const data = await res.json();
    const downloadUrl = data.attributes?.url;

    if (!downloadUrl) {
      return NextResponse.json(
        { error: "URL de download não encontrada" },
        { status: 500 }
      );
    }

    return NextResponse.redirect(downloadUrl);
  } catch (err) {
    console.error("Demo download error:", err);
    return NextResponse.json(
      { error: "Erro interno ao buscar demo" },
      { status: 500 }
    );
  }
}
