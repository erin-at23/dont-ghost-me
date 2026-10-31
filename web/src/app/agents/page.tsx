"use client";

import { useEffect, useRef } from "react";
import type { StateView } from "@/lib/types";
import { usePoll } from "@/lib/usePoll";
import { NAMES } from "@/mocks";

// Big-screen view of the agents talking. One color per agent.
const ERIN_AGENT = `${NAMES.erin}'s agent`;
const color = (from: string) => (from === ERIN_AGENT ? "text-sky-300 border-sky-300/40" : "text-accent border-accent/40");
const side = (from: string) => (from === ERIN_AGENT ? "self-start" : "self-end text-right");

export default function Agents() {
  const { data: s, offline } = usePoll<StateView>("/api/state?as=partner");
  const end = useRef<HTMLDivElement>(null);
  const count = s?.relayLog.length ?? 0;
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [count, s?.relayTyping]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8">
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="text-4xl font-semibold md:text-5xl">Live agents</h1>
        <span className="text-lg text-muted">{offline ? "Reconnecting..." : "● live"}</span>
      </header>
      <div className="flex flex-1 flex-col gap-5">
        {count === 0 && !s?.relayTyping && <p className="text-2xl text-muted">Waiting for the agents...</p>}
        {s?.relayLog.map((l, i) => (
          <div key={`${l.at}-${i}`} className={`rise-in max-w-[80%] ${side(l.from)}`}>
            <div className={`mb-1 text-lg font-semibold ${color(l.from).split(" ")[0]}`}>{l.from}</div>
            <div className={`rounded-3xl border bg-card px-6 py-4 text-2xl leading-snug md:text-3xl ${color(l.from).split(" ")[1]}`}>
              {l.text}
            </div>
          </div>
        ))}
        {s?.relayTyping && (
          <div className={`rise-in ${side(s.relayTyping)}`}>
            <div className={`mb-1 text-lg font-semibold ${color(s.relayTyping).split(" ")[0]}`}>{s.relayTyping}</div>
            <div className="inline-flex gap-2 rounded-3xl border border-line bg-card px-6 py-5 text-3xl">
              <span className="dot">●</span><span className="dot">●</span><span className="dot">●</span>
            </div>
          </div>
        )}
        <div ref={end} />
      </div>
    </div>
  );
}
