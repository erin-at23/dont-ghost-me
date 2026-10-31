import { getBackend } from "@/lib/backend";
import { asUser, body, route } from "@/lib/server";

export const POST = route(async (req) => {
  const b = await body<{ as: string; answer: string }>(req);
  await getBackend().respond(asUser(b.as), b.answer === "yes" ? "yes" : "no");
  return { ok: true };
});
