import { getBackend } from "@/lib/backend";
import { asUser, body, route } from "@/lib/server";

export const POST = route(async (req) => {
  const b = await body<{ as: string; other: string; value: boolean }>(req);
  await getBackend().setWantsClose(asUser(b.as), asUser(b.other), !!b.value);
  return { ok: true };
});
