"use client";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { LiveToastProvider } from "@/components/live-toast";

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullscreen = pathname.startsWith("/live") || pathname.startsWith("/inscricao");

  if (isFullscreen) {
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
