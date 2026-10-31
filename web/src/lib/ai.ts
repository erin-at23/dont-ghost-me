// AI features (server side only). Each call has a fallback so the demo never dead-ends.
import OpenAI, { toFile } from "openai";
import type { Extraction, PersonProfile } from "./types";

let client: OpenAI | null = null;
const openai = () => (client ??= new OpenAI()); // reads OPENAI_API_KEY

// ---------- transcription ----------

const TRANSCRIBE_MODELS = ["gpt-4o-mini-transcribe", "whisper-1"] as const;

/** Whisper is picky about names: iPhone's audio/mp4 must be sent as .m4a. */
function fileName(type: string) {
  if (type.includes("mp4") || type.includes("m4a") || type.includes("aac")) return "note.m4a";
  if (type.includes("ogg")) return "note.ogg";
  if (type.includes("wav")) return "note.wav";
  return "note.webm";
}

export async function transcribe(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = file.type || "audio/webm";
  let lastErr: unknown;
  for (const model of TRANSCRIBE_MODELS) {
    try {
      const upload = await toFile(bytes, fileName(type), { type });
      const r = await openai().audio.transcriptions.create({ file: upload, model });
      return r.text.trim();
    } catch (e) {
      console.warn(`[transcribe] ${model} failed:`, (e as Error).message);
      lastErr = e;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("Transcription failed");
}

// ---------- extraction ----------

const EXTRACT_PROMPT =
  "You help a college student remember people they meet. From this voice note, extract the other person's name, where they met, facts about them, interests, things they have in common with the speaker, memorable moments, and the speaker's impression. Use short phrases. Do not invent anything not said.";

const list = { type: "array", items: { type: "string" } } as const;
const nullableString = { type: ["string", "null"] } as const;
const EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: nullableString,
    place: nullableString,
    facts: list,
    interests: list,
    commonalities: list,
    memories: list,
    impression: nullableString,
  },
  required: ["name", "place", "facts", "interests", "commonalities", "memories", "impression"],
};

type RawExtraction = Omit<Extraction, "name" | "place" | "impression"> & {
  name: string | null; place: string | null; impression: string | null;
};

export async function extract(transcript: string, fallbackName: string, place: string): Promise<Extraction> {
  try {
    const r = await openai().responses.create({
      model: "gpt-4o-mini",
      instructions: EXTRACT_PROMPT,
      input: `${place ? `(The app says they are at: ${place})\n` : ""}Voice note:\n${transcript}`,
      text: { format: { type: "json_schema", name: "extraction", schema: EXTRACTION_SCHEMA, strict: true } },
    });
    const x = JSON.parse(r.output_text) as RawExtraction;
    return {
      name: x.name || fallbackName,
      place: x.place || place || undefined,
      facts: x.facts, interests: x.interests, commonalities: x.commonalities, memories: x.memories,
      impression: x.impression || undefined,
    };
  } catch (e) {
    console.warn("[extract] OpenAI failed, using keyword fallback:", (e as Error).message);
    return fallbackExtract(transcript, fallbackName, place);
  }
}

function fallbackExtract(transcript: string, name: string, place: string): Extraction {
  const sentences = transcript.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  return { name, place: place || undefined, facts: sentences.slice(0, 2), interests: [], commonalities: [], memories: sentences.slice(2, 3) };
}

// ---------- brief ----------

const BRIEF_PROMPT =
  "Write a warm 2-3 sentence brief before a student meets this friend. Remind them of the last thing they talked about and suggest one specific question to ask. Casual tone.";

export async function brief(profile: PersonProfile | null, otherName: string): Promise<string> {
  const notes = profile
    ? JSON.stringify({
        name: profile.name, facts: profile.facts, interests: profile.interests,
        commonalities: profile.commonalities, impression: profile.impression,
        recentMeetings: profile.meetings.slice(-3),
      })
    : `No notes yet about ${otherName}.`;
  try {
    const r = await openai().responses.create({
      model: "gpt-4o-mini",
      instructions: BRIEF_PROMPT,
      input: `Friend: ${otherName}\nMy notes: ${notes}`,
    });
    return r.output_text.trim();
  } catch (e) {
    console.warn("[brief] OpenAI failed, using fallback:", (e as Error).message);
    const last = profile?.meetings.at(-1);
    const interest = profile?.interests[0];
    return `Last time you saw ${otherName}${last ? ` at ${last.place}` : ""}${last?.memories[0] ? `: ${last.memories[0]}` : ""}. ${interest ? `Ask how ${interest} has been going.` : "Ask what's been keeping them busy."}`;
  }
}
