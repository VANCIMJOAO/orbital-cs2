import { Metadata } from "next";
import { getPlayerProfile } from "@/lib/api";
import { ProfileContent } from "./profile-content";

export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ steamId: string }> }): Promise<Metadata> {
  const { steamId } = await params;
  try {
    const profile = await getPlayerProfile(steamId);
    const name = profile?.name || steamId;
    return {
      title: `${name} | ORBITAL ROXA`,
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
