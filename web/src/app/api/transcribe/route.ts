import { transcribe } from "@/lib/ai";
import { route } from "@/lib/server";

export const POST = route(async (req) => {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("Expected a multipart 'file' field");
  return { text: await transcribe(file) };
});
