import { getBackend } from "@/lib/backend";
import { body, route } from "@/lib/server";

export const POST = route(async (req) => {
  const b = await body<{ days: number }>(req);
  await getBackend().simulateDaysPassed(Number(b.days) || 21);
  return { ok: true };
});
