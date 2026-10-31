import { getBackend } from "@/lib/backend";
import { asUser, body, route } from "@/lib/server";

// Mock: plays a scripted agent conversation. Live (Block 5): calls Erin's agent at AGENT_URL.
export const POST = route(async (req) => {
  const b = await body<{ as: string }>(req);
  await getBackend().findTime(asUser(b.as));
  return { ok: true };
});
