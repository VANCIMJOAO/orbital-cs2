import { Metadata } from "next";
import { getPlayerProfile } from "@/lib/api";
import { ProfileContent } from "./profile-content";

export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ steamId: string }> }): Promise<Metadata> {
  const { steamId } = await params;
  try {
    const profile = await getPlayerProfile(steamId);
    // profile can be an array of stats per map — get name from first entry
    const raw = profile as unknown as Record<string, unknown>;
    const stats = Array.isArray(profile) ? profile : raw?.playerstats;
    const name = Array.isArray(stats) && stats.length > 0 ? (stats[0] as Record<string, string>).name : raw?.name as string | undefined;
    return {
      title: `${name || steamId} | ORBITAL ROXA`,
    };
  } catch {
    return {
      title: `${steamId} | ORBITAL ROXA`,
    };
  }
}

export default async function ProfilePage({ params }: { params: Promise<{ steamId: string }> }) {
  const { steamId } = await params;
  return <ProfileContent steamId={steamId} />;
}
