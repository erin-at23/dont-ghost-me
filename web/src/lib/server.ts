// Small helpers for API routes.
import { connection } from "next/server";
import { fromSlug, type UserId } from "./types";

export function asUser(v: unknown): UserId {
  return (typeof v === "string" && fromSlug(v)) || "partner";
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<Partial<T>> {
  try { return (await req.json()) as Partial<T>; } catch { return {}; }
}

/** Wrap a route so errors come back as JSON instead of an HTML page. */
export function route(fn: (req: Request) => Promise<unknown>) {
  return async (req: Request) => {
    await connection(); // always run at request time, never prerendered
    try {
      return Response.json(await fn(req), { headers: { "Cache-Control": "no-store" } });
    } catch (err) {
      console.error(err);
      return Response.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
  };
}
