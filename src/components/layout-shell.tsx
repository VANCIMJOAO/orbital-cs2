"use client";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { LiveToastProvider } from "@/components/live-toast";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLive = pathname.startsWith("/live");

  if (isLive) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-20 overflow-x-hidden">
        {children}
      </main>
      <LiveToastProvider />
    </>
  );
}
