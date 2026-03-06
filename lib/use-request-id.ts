"use client";

import { useMemo } from "react";

export function useRequestId() {
  const requestId = useMemo(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return new URLSearchParams(window.location.search).get("id");
  }, []);

  return {
    requestId,
    resolved: typeof window !== "undefined",
  };
}
