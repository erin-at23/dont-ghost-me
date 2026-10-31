"use client";

import { useEffect, useRef } from "react";
import type { StateView } from "@/lib/types";
import { usePoll } from "@/lib/usePoll";
import { NAMES } from "@/mocks";

// Big-screen view of the agents talking. One color per agent.
const ERIN_AGENT = `${NAMES.erin}'s agent`;
const color = (from: string) => (from === ERIN_AGENT ? "text-sandstone border-sandstone/40" : "text-accent-ink border-accent/40");
const side = (from: string) => (from === ERIN_AGENT ? "self-start" : "self-end text-right");

export default function Agents() {
  const { data: s, offline } = usePoll<StateView>("/api/state?as=partner");
  const end = useRef<HTMLDivElement>(null);
  const count = s?.relayLog.length ?? 0;
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [count, s?.relayTyping]);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8">
      <header className="mb-8 flex items-baseline justify-between">
        <div><p className="mb-1 text-base text-muted">Don&apos;t Ghost Me · via Agent Relay</p><h1 className="font-serif text-5xl font-semibold md:text-6xl">Agents, live</h1></div>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-base text-muted">{offline ? "Reconnecting…" : <><span className="live-dot h-2.5 w-2.5 rounded-full bg-sandstone" /> live</>}</span>
      </header>
      <div className="flex flex-1 flex-col gap-5">
        {count === 0 && !s?.relayTyping && <p className="text-2xl text-muted">Waiting for the agents...</p>}
        {s?.relayLog.map((l, i) => (
          <div key={`${l.at}-${i}`} className={`rise-in max-w-[80%] ${side(l.from)}`}>
            <div className={`mb-1 text-lg font-semibold ${color(l.from).split(" ")[0]}`}>{l.from}</div>
            <div className={`rounded-[28px] border bg-card px-6 py-4 text-left text-2xl leading-snug md:text-[28px] ${color(l.from).split(" ")[1]}`}>
              {l.text}
            </div>
          </div>
        ))}
        {s?.relayTyping && (
          <div className={`rise-in ${side(s.relayTyping)}`}>
            <div className={`mb-1 text-lg font-semibold ${color(s.relayTyping).split(" ")[0]}`}>{s.relayTyping}</div>
            <div className="inline-flex gap-2 rounded-[28px] border border-line bg-card px-6 py-5 text-2xl text-muted">
              <span className="dot">●</span><span className="dot">●</span><span className="dot">●</span>
            </div>
          </div>
        )}
        <div ref={end} />
      </div>
    </div>
  );
}
