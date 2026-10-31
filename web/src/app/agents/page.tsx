"use client";

import { useEffect, useRef } from "react";
import { GhostIcon, fmtWhen } from "@/components/ui";
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
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-accent-ink">Don&apos;t Ghost Me</p>
          <h1 className="font-serif text-5xl font-semibold md:text-6xl">Live agents</h1>
          <p className="mt-2 text-xl text-muted">Two private agents. Only times and places are shared.</p>
        </div>
        <span className={`shrink-0 text-xl ${offline ? "text-muted" : "text-accent-ink"}`}>{offline ? "Reconnecting..." : "● live"}</span>
      </header>
      <div className="flex flex-1 flex-col gap-5">
        {count === 0 && !s?.relayTyping && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted">
            <span className="haunt ghost-glow text-foreground/80"><GhostIcon className="h-24 w-24" /></span>
            <p className="text-3xl">Waiting for the agents...</p>
          </div>
        )}
        {s?.relayLog.map((l, i) => (
          <div key={`${l.at}-${i}`} className={`rise-in max-w-[80%] ${side(l.from)}`}>
            <div className={`mb-1 text-lg font-semibold ${color(l.from).split(" ")[0]}`}>{l.from}</div>
            <div className={`rounded-3xl border bg-card px-6 py-4 text-left text-2xl leading-snug md:text-3xl ${color(l.from).split(" ")[1]}`}>
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
        {s?.friendship.proposal && (
          <div className="rise-in mt-4 self-center rounded-3xl border-2 border-accent bg-accent/15 px-8 py-6 text-center">
            <p className="text-lg font-semibold uppercase tracking-[0.25em] text-accent-ink">
              {s.friendship.proposal.status === "accepted" ? "It's on" : "Sent to both phones"}
            </p>
            <p className="mt-2 font-serif text-4xl font-semibold">{s.friendship.proposal.place} · {fmtWhen(s.friendship.proposal.at)}</p>
          </div>
        )}
        <div ref={end} />
      </div>
    </div>
  );
}
