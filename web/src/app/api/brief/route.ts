import { brief } from "@/lib/ai";
import { getBackend } from "@/lib/backend";
import { asUser, body, route } from "@/lib/server";
import { NAMES } from "@/mocks";

// Generated once per accepted proposal per user, then served from cache.
export const POST = route(async (req) => {
  const b = await body<{ as: string; other: string }>(req);
  const as = asUser(b.as);
  const other = asUser(b.other);
  const backend = getBackend();
  const cached = await backend.getBrief(as);
  if (cached?.brief) return { brief: cached.brief };
  const text = await brief(await backend.getProfile(as, other), NAMES[other]);
  if (cached) await backend.saveBrief(as, cached.proposalId, text);
  return { brief: text };
});
