"use client";

import { useSearchParams } from "next/navigation";

export function useRequestId() {
  const searchParams = useSearchParams();

  return {
    requestId: searchParams.get("id"),
    resolved: true,
    searchParams,
  };
}
