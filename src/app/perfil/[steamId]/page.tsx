import { Metadata } from "next";
import { getPlayerProfile } from "@/lib/api";
import { ProfileContent } from "./profile-content";

export const revalidate = 30;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.orbitalroxa.com.br";

export async function generateMetadata({ params }: { params: Promise<{ steamId: string }> }): Promise<Metadata> {
  const { steamId } = await params;
  let name = steamId;
  try {
    const profile = await getPlayerProfile(steamId);
    const raw = profile as unknown as Record<string, unknown>;
    const stats = Array.isArray(profile) ? profile : raw?.playerstats;
    if (Array.isArray(stats) && stats.length > 0) {
      name = (stats[0] as Record<string, string>).name || steamId;
    } else if (raw?.name) {
      name = raw.name as string;
    }
  } catch { /* keep steamId as name */ }

  const title = `${name} | ORBITAL ROXA`;
  const description = `Perfil de ${name} na plataforma ORBITAL ROXA — stats, rating, highlights e histórico de partidas CS2.`;
  const ogImage = `${SITE_URL}/api/og/player?id=${steamId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
      type: "profile",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function ProfilePage({ params }: { params: Promise<{ steamId: string }> }) {
  const { steamId } = await params;
  return <ProfileContent steamId={steamId} />;
}
