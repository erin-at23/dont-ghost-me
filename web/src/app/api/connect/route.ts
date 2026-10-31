import { getBackend } from "@/lib/backend";
import { asUser, body, route } from "@/lib/server";

export const POST = route(async (req) => {
  const b = await body<{ from: string; to: string }>(req);
  return getBackend().connect(asUser(b.from), asUser(b.to));
});
