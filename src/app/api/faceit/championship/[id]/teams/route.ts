import { NextRequest, NextResponse } from "next/server";
import { getFaceitChampionship, getFaceitPlayer } from "@/lib/faceit";

const FACEIT_API_KEY = process.env.FACEIT_API_KEY || "";
const FACEIT_BASE = "https://open.faceit.com/data/v4";
const FACEIT_INTERNAL = "https://api.faceit.com";

interface FaceitSubscription {
  team: {
    team_id: string;
    name: string;
    members: {
      user_id: string;
      nickname: string;
      avatar: string;
      country: string;
      skill_level: number;
    }[];
  };
  roster: string[];
  status: string;
}

interface InternalSubscription {
  id: string;
  name: string;
  avatar: string;
  members: {
    userId: string;
    nickname: string;
    avatar: string;
    country: string;
    gameSkillLevel: number;
  }[];
  substitutes: unknown[];
  status: string;
}

// Buscar subscriptions via Data API
async function fetchSubscriptionsData(id: string): Promise<FaceitSubscription[]> {
  const res = await fetch(
    `${FACEIT_BASE}/championships/${id}/subscriptions?offset=0&limit=50`,
    {
      headers: {
        Authorization: `Bearer ${FACEIT_API_KEY}`,
        Accept: "application/json",
      },
    }
  );
  if (!res.ok) throw new Error(`Data API ${res.status}`);
  const data = await res.json();
  return data.items || [];
}

// Buscar subscriptions via Internal API (fallback)
async function fetchSubscriptionsInternal(id: string): Promise<FaceitSubscription[]> {
  const res = await fetch(
    `${FACEIT_INTERNAL}/championships/v1/championship/${id}/subscription`,
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) throw new Error(`Internal API ${res.status}`);
  const data = await res.json();
  const items: InternalSubscription[] = data.payload?.items || data.items || [];

  return items.map((item) => ({
    team: {
      team_id: item.id,
      name: item.name,
      members: (item.members || []).map((m) => ({
        user_id: m.userId,
        nickname: m.nickname,
        avatar: m.avatar || "",
        country: m.country || "",
        skill_level: m.gameSkillLevel || 0,
      })),
    },
    roster: (item.members || []).map((m) => m.userId),
    status: item.status || "joined",
  }));
}

// GET — buscar times inscritos num championship da Faceit com Steam IDs
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // 1. Buscar championship info
    const championship = await getFaceitChampionship(id);

    // 2. Buscar subscriptions (Data API → fallback Internal API)
    let subscriptions: FaceitSubscription[] = [];
    try {
      subscriptions = await fetchSubscriptionsData(id);
    } catch {
      subscriptions = await fetchSubscriptionsInternal(id);
    }

    // 3. Pra cada time, buscar Steam IDs dos jogadores
    const teams = await Promise.all(
      subscriptions.map(async (sub) => {
        const members = await Promise.all(
          sub.team.members.map(async (member) => {
            try {
              const profile = await getFaceitPlayer(member.user_id);
              const cs2 = profile.games?.cs2;
              return {
                faceit_id: member.user_id,
                nickname: member.nickname,
                steam_id: cs2?.game_player_id || profile.steam_id_64 || "",
                steam_name: cs2?.game_player_name || member.nickname,
                avatar: member.avatar,
                skill_level: cs2?.skill_level || member.skill_level,
                elo: cs2?.faceit_elo || 0,
                country: member.country,
              };
            } catch {
              return {
                faceit_id: member.user_id,
                nickname: member.nickname,
                steam_id: "",
                steam_name: member.nickname,
                avatar: member.avatar,
                skill_level: member.skill_level,
                elo: 0,
                country: member.country,
              };
            }
          })
        );

        return {
          faceit_team_id: sub.team.team_id,
          name: sub.team.name,
          tag: sub.team.name.substring(0, 5).toUpperCase(),
          members,
          status: sub.status,
        };
      })
    );

    return NextResponse.json({
      championship: {
        id: championship.championship_id,
        name: championship.name,
        type: championship.type,
        status: championship.status,
        slots: championship.slots,
        game: championship.game_id,
        region: championship.region,
      },
      teams,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
