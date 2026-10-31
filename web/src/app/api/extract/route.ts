import { extract } from "@/lib/ai";
import { getBackend } from "@/lib/backend";
import { asUser, body, route } from "@/lib/server";
import { NAMES } from "@/mocks";

export const POST = route(async (req) => {
  const b = await body<{ as: string; other: string; transcript: string; place: string }>(req);
  const as = asUser(b.as);
  const other = asUser(b.other);
  const transcript = (b.transcript ?? "").trim();
  if (!transcript) throw new Error("Empty transcript");
  const x = await extract(transcript, NAMES[other], b.place ?? "");
  await getBackend().applyExtraction(as, other, x, {
    at: new Date().toISOString(),
    place: x.place || b.place || "Somewhere",
  });
  return x;
});
