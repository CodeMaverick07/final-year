"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MobileBottomNav } from "@/components/MobileBottomNav";

export function ProtectedMobileChrome() {
  const pathname = usePathname();
  const hideOnFullscreenFlow =
    pathname.startsWith("/capture") || pathname.startsWith("/record");

  if (hideOnFullscreenFlow) return null;

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-30 border-b border-border glass-surface md:hidden">
        <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
          <Link href="/feed" className="font-heading text-base font-semibold text-text-primary">
            Sanskriti
          </Link>
          <div className="flex items-center gap-2 text-xs">
            <Link href="/upload" className="rounded-md border border-border px-2.5 py-1.5 text-text-muted">
              Upload
            </Link>
            <Link href="/profile" className="rounded-md border border-border px-2.5 py-1.5 text-text-muted">
              Profile
            </Link>
            <Link href="/settings" className="rounded-md border border-border px-2.5 py-1.5 text-text-muted">
              Settings
            </Link>
          </div>
        </div>
      </header>
      <MobileBottomNav />
    </>
  );
}
