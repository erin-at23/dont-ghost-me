"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Polls a JSON URL. Keeps the last good data when a request fails,
 * so the UI rides through an actor-server restart and recovers by itself.
 */
export function usePoll<T>(url: string, ms = 1000) {
  const [data, setData] = useState<T | null>(null);
  const [offline, setOffline] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setData((await res.json()) as T);
      setOffline(false);
    } catch {
      setOffline(true);
    }
  }, [url]);

  useEffect(() => {
    let alive = true;
    let t: ReturnType<typeof setTimeout>;
    const tick = async () => {
      await refresh();
      if (alive) t = setTimeout(tick, ms);
    };
    tick();
    return () => { alive = false; clearTimeout(t); };
  }, [url, ms, refresh]);

  return { data, offline, refresh };
}

export async function post<T = { ok: boolean }>(url: string, payload?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? `HTTP ${res.status}`);
  return json as T;
}
