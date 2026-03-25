import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { G5API_URL } from "@/lib/constants";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const steamId = req.nextUrl.searchParams.get("id");
  if (!steamId) return new Response("Missing id", { status: 400 });

  // Fetch player stats
  let name = steamId;
  let kills = 0, deaths = 0, assists = 0, rating = 0, wins = 0, maps = 0, hsp = 0;

  try {
    // Fetch player stats for K/D/A/HS
    const res = await fetch(`${G5API_URL}/playerstats/${steamId}`, { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      const stats = data.playerstats || data.playerStats || [];
      if (stats.length > 0) {
        name = stats[0].name || steamId;
        for (const s of stats) {
          kills += s.kills || 0;
          deaths += s.deaths || 0;
          assists += s.assists || 0;
          maps += 1;
        }
        const totalHS = stats.reduce((sum: number, s: { headshot_kills: number }) => sum + (s.headshot_kills || 0), 0);
        rating = stats.reduce((sum: number, s: { rating: number }) => sum + (s.rating || 0), 0) / stats.length;
        hsp = kills > 0 ? Math.round((totalHS / kills) * 100) : 0;
      }
    }
    // Fetch wins from leaderboard (player_stats.winner is always 0 in G5API)
    const lbRes = await fetch(`${G5API_URL}/leaderboard/players`, { next: { revalidate: 300 } });
    if (lbRes.ok) {
      const lbData = await lbRes.json();
      const lb = lbData.leaderboard || lbData || [];
      const entry = (Array.isArray(lb) ? lb : []).find((e: { steamId?: string; steam_id?: string }) => (e.steamId || e.steam_id) === steamId);
      if (entry) {
        wins = entry.wins || 0;
        if (!name || name === steamId) name = entry.name || steamId;
      }
    }
  } catch { /* fallback to defaults */ }

  const kdr = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0A0A0A",
          fontFamily: "monospace",
          position: "relative",
        }}
      >
        {/* Purple gradient top */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, transparent, #A855F7, transparent)" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ color: "#A855F7", fontSize: 14, letterSpacing: 4, fontWeight: 700 }}>ORBITAL ROXA</span>
        </div>

        {/* Player name */}
        <div style={{ fontSize: 48, fontWeight: 900, color: "#FFFFFF", letterSpacing: 3, marginBottom: 30 }}>
          {name.toUpperCase()}
        </div>

        {/* Stats grid */}
        <div style={{ display: "flex", gap: 40, marginBottom: 30 }}>
          <StatBox label="RATING" value={rating.toFixed(2)} color={rating >= 1.15 ? "#A855F7" : rating >= 1.0 ? "#22C55E" : "#EF4444"} />
          <StatBox label="K/D" value={kdr} color={parseFloat(kdr) >= 1.0 ? "#22C55E" : "#EF4444"} />
          <StatBox label="HS%" value={`${hsp}%`} color="#F59E0B" />
          <StatBox label="KILLS" value={String(kills)} color="#FFFFFF" />
          <StatBox label="WINS" value={String(wins)} color="#22C55E" />
          <StatBox label="MAPS" value={String(maps)} color="#FFFFFF" />
        </div>

        {/* Footer */}
        <div style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, letterSpacing: 2 }}>
          orbitalroxa.com.br
        </div>

        {/* Purple gradient bottom */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "linear-gradient(90deg, transparent, #A855F7, transparent)" }} />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: 3, fontWeight: 600 }}>{label}</span>
      <span style={{ color, fontSize: 32, fontWeight: 900 }}>{value}</span>
    </div>
  );
}
