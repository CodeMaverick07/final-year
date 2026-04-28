"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reg: ServiceWorkerRegistration | undefined;
    navigator.serviceWorker
      .register("/sw.js", { updateViaCache: "none" })
      .then((r) => {
        reg = r;
        r.update().catch(() => {});
      })
      .catch((err) => console.error("SW registration failed:", err));

    const onControllerChange = () => {
      // New SW took over — reload once so the page is served via it.
      if ((window as unknown as { __sanskritiSwReloaded?: boolean }).__sanskritiSwReloaded) return;
      (window as unknown as { __sanskritiSwReloaded?: boolean }).__sanskritiSwReloaded = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      void reg;
    };
  }, []);
  return null;
}
