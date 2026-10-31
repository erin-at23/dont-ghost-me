import { getBackend } from "@/lib/backend";
import { asUser, route } from "@/lib/server";

export const GET = route(async (req) => {
  const as = asUser(new URL(req.url).searchParams.get("as"));
  return getBackend().getState(as);
});
