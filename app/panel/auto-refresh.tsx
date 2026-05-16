"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Refresca el panel (server component) cada `seconds` segundos. */
export function AutoRefresh({ seconds = 6 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
