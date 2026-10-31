"use client";

import { useRef, useState } from "react";
import { Chip, Shell } from "@/components/ui";
import type { Extraction } from "@/lib/types";
import { post } from "@/lib/usePoll";
import { useMe } from "@/lib/user";
import { NAMES } from "@/mocks";

type Phase = "idle" | "listening" | "transcribing" | "remembering" | "done" | "error";

// First supported of webm / mp4 (iPhone Safari usually only supports mp4).
function pickMime() {
  for (const t of ["audio/webm", "audio/mp4"]) if (MediaRecorder.isTypeSupported(t)) return t;
  return "";
}

export default function Voice() {
  const { me } = useMe();
  const other = me === "erin" ? "partner" : "erin";
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [typed, setTyped] = useState("");
  const [typing, setTyping] = useState(false);
  const [place, setPlace] = useState("Haunted Hacks");
  const [x, setX] = useState<Extraction | null>(null);
  const rec = useRef<MediaRecorder | null>(null);

  async function remember(text: string) {
    setTranscript(text);
    setPhase("remembering");
    const result = await post<Extraction>("/api/extract", { as: me, other, transcript: text, place });
    setX(result);
    setPhase("done");
  }

  function fail(e: unknown) {
    setError(e instanceof Error ? e.message : String(e));
    setPhase("error");
  }

  async function start() {
    try {
      setX(null); setError(""); setTranscript("");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      r.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = r.mimeType || mime || "audio/webm";
        const ext = type.includes("mp4") ? "mp4" : "webm";
        const form = new FormData();
        form.append("file", new Blob(chunks, { type }), `note.${ext}`);
        try {
          setPhase("transcribing");
          const res = await fetch("/api/transcribe", { method: "POST", body: form });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "Transcription failed");
          await remember(json.text);
        } catch (e) { fail(e); }
      };
      rec.current = r;
      r.start();
      setPhase("listening");
      setTimeout(() => r.state === "recording" && r.stop(), 60_000);
    } catch (e) { fail(e); }
  }

  const stop = () => rec.current?.state === "recording" && rec.current.stop();
  const busy = phase === "transcribing" || phase === "remembering";
  const status = { idle: "Tap and tell me about them", listening: "Listening...", transcribing: "Remembering...", remembering: "Remembering...", done: "Saved", error: "Something went wrong" }[phase];

  return (
    <Shell title="Voice note">
      <p className="text-lg text-muted">About <span className="text-foreground">{NAMES[other]}</span></p>
      <label className="flex items-center gap-3 text-lg text-muted">
        Where
        <input value={place} onChange={(e) => setPlace(e.target.value)}
          className="flex-1 rounded-xl border border-line bg-card px-3 py-2 text-foreground" />
      </label>

      {!typing ? (
        <div className="flex flex-col items-center gap-4 py-4">
          <button onClick={phase === "listening" ? stop : start} disabled={busy}
            className={`h-40 w-40 rounded-full text-2xl font-semibold transition-all ${phase === "listening" ? "scale-105 bg-accent text-black animate-pulse" : "border-2 border-accent text-accent"} disabled:opacity-40`}>
            {phase === "listening" ? "Stop" : "Record"}
          </button>
          <p className="text-xl">{status}</p>
          <button onClick={() => setTyping(true)} className="text-base text-muted underline">Type it instead</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <textarea value={typed} onChange={(e) => setTyped(e.target.value)} rows={5}
            placeholder="We met at... they're into..."
            className="rounded-2xl border border-line bg-card p-4 text-lg" />
          <button disabled={busy || !typed.trim()} onClick={() => remember(typed).catch(fail)}
            className="rounded-2xl bg-accent py-4 text-xl font-semibold text-black disabled:opacity-40">
            {busy ? "Remembering..." : "Remember this"}
          </button>
          <button onClick={() => setTyping(false)} className="text-base text-muted underline">Use voice instead</button>
        </div>
      )}

      {error && <p className="text-lg text-red-400">{error}</p>}
      {transcript && phase !== "listening" && <p className="text-base italic text-muted">&ldquo;{transcript}&rdquo;</p>}

      {x && (
        <section className="flex flex-col gap-3">
          {[["Facts", x.facts], ["Interests", x.interests], ["In common", x.commonalities], ["Moments", x.memories]].map(
            ([label, items]) => (items as string[]).length > 0 && (
              <div key={label as string}>
                <h3 className="mb-1 text-base text-muted">{label as string}</h3>
                <div className="flex flex-wrap gap-2">
                  {(items as string[]).map((t, i) => <Chip key={t} i={i}>{t}</Chip>)}
                </div>
              </div>
            ),
          )}
          {x.impression && <p className="rise-in text-lg">Impression: {x.impression}</p>}
        </section>
      )}
    </Shell>
  );
}
