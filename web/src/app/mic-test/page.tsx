"use client";

import { useRef, useState } from "react";

// First supported of webm / mp4 (iPhone Safari usually only supports mp4).
function pickMimeType(): string {
  for (const t of ["audio/webm", "audio/mp4"]) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

type Phase = "idle" | "recording" | "done" | "error";

export default function MicTest() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [info, setInfo] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  async function record() {
    try {
      if (!window.isSecureContext) throw new Error("Not a secure (HTTPS) page, mic is blocked.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = rec.mimeType || mimeType || "audio/webm";
        const blob = new Blob(chunks, { type });
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setInfo(`${type} · ${(blob.size / 1024).toFixed(1)} KB`);
        setPhase("done");
        // Autoplay may be blocked; the Play button below is the fallback.
        setTimeout(() => audioRef.current?.play().catch(() => {}), 50);
      };
      setPhase("recording");
      setInfo("");
      rec.start();
      setTimeout(() => rec.state === "recording" && rec.stop(), 3000);
    } catch (err) {
      setPhase("error");
      setInfo(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <main className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-semibold">Mic test</h1>
      <button
        onClick={record}
        disabled={phase === "recording"}
        className="w-full max-w-xs rounded-2xl bg-violet-500 px-6 py-5 text-2xl font-semibold text-black disabled:opacity-50"
      >
        {phase === "recording" ? "Recording 3s..." : "Record 3 seconds"}
      </button>
      {audioUrl && <audio ref={audioRef} src={audioUrl} controls className="w-full max-w-xs" />}
      {info && (
        <p className={`text-lg ${phase === "error" ? "text-red-400" : "text-zinc-400"}`}>{info}</p>
      )}
    </main>
  );
}
