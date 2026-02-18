"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function ProtectedContentPadding({ children }: Props) {
  const pathname = usePathname();
  const hideOnFullscreenFlow =
    pathname.startsWith("/capture") || pathname.startsWith("/record");

  return (
    <main className={`min-h-screen w-full ${hideOnFullscreenFlow ? "" : "pb-20"} md:pb-0`}>
      {children}
    </main>
  );
}
