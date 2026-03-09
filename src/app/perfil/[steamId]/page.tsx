import { ProfileContent } from "./profile-content";

export const revalidate = 30;

export default async function ProfilePage({ params }: { params: Promise<{ steamId: string }> }) {
  const { steamId } = await params;
  return <ProfileContent steamId={steamId} />;
}
