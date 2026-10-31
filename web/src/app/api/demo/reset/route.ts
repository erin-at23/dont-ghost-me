import { getBackend } from "@/lib/backend";
import { route } from "@/lib/server";

export const POST = route(async () => {
  await getBackend().reset();
  return { ok: true };
});
