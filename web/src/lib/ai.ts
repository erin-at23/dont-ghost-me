// AI features. Block 2: canned responses so the UI is clickable.
// Block 4 replaces these with OpenAI calls.
import type { Extraction, PersonProfile } from "./types";

export async function transcribe(file: File): Promise<string> {
  void file;
  await new Promise((r) => setTimeout(r, 800));
  return "Just met Erin at the Haunted Hacks kickoff. She's a CS major from Austin, totally into horror movies and boba like me. We joked about tabs versus spaces. She seemed really sharp but a bit stressed about midterms.";
}

export async function extract(transcript: string, fallbackName: string, place: string): Promise<Extraction> {
  await new Promise((r) => setTimeout(r, 900));
  const t = transcript.toLowerCase();
  const has = (w: string) => t.includes(w);
  return {
    name: fallbackName,
    place: place || "Haunted Hacks",
    facts: [has("austin") ? "From Austin" : "Met today", has("cs") ? "CS major" : "Student"].filter(Boolean),
    interests: [has("horror") && "horror movies", has("boba") && "boba"].filter(Boolean) as string[],
    commonalities: has("like me") ? ["both love boba"] : [],
    memories: [has("tabs") ? "Joked about tabs vs spaces" : transcript.slice(0, 60)],
    impression: has("stressed") ? "Sharp, a bit stressed about midterms" : undefined,
  };
}

export async function brief(profile: PersonProfile | null, otherName: string): Promise<string> {
  await new Promise((r) => setTimeout(r, 600));
  const last = profile?.meetings.at(-1);
  const memory = last?.memories[0] ?? "how things are going";
  const interest = profile?.interests[0] ?? "what they've been up to";
  return `Last time you saw ${otherName}${last ? ` at ${last.place}` : ""}: ${memory}. Ask how ${interest} has been going lately.`;
}
