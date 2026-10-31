"use client";

import { useEffect, useRef } from "react";
import type { StateView } from "@/lib/types";
import { usePoll } from "@/lib/usePoll";
import { NAMES } from "@/mocks";
import { CampusMap } from "@/components/CampusMap";
import { GhostIcon } from "@/components/ui";

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
    <>
    <div className="pointer-events-none fixed inset-0 opacity-75">
      <CampusMap big className="h-full rounded-none border-0"
        meetAt={s?.friendship.proposal?.place}
        meName={NAMES.erin} people={s ? [{ id: "partner", name: NAMES.partner, days: 0, place: s.friendship.proposal?.place ?? "around", link: "/", main: true }] : []} />
    </div>
    <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-8">
      <header className="mb-8 flex items-baseline justify-between">
        <div><p className="mb-1 text-base text-muted">👻 Don&apos;t Ghost Me</p><h1 className="font-serif text-5xl font-medium md:text-6xl"><span className="text-sandstone">{NAMES.erin}&apos;s agent</span> <span className="text-muted">&amp;</span> <span className="text-accent-ink">{NAMES.partner}&apos;s agent</span></h1><p className="mt-2 text-lg text-muted">Comparing only times &amp; places. Your private notes never leave your agent.</p></div>
        <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-4 py-2 text-base text-muted">{offline ? "Reconnecting…" : <><span className="live-dot h-2.5 w-2.5 rounded-full bg-sandstone" /> live</>}</span>
      </header>
      <div className="flex flex-1 flex-col gap-5">
        {count === 0 && !s?.relayTyping && <p className="text-2xl text-muted">Waiting for the agents...</p>}
        {s?.relayLog.map((l, i) => (
          <div key={`${l.at}-${i}`} className={`rise-in max-w-[80%] ${side(l.from)}`}>
            <div className={`mb-1 text-lg font-semibold ${color(l.from).split(" ")[0]}`}>{l.from}</div>
            <div className={`rounded-[28px] border bg-[rgba(29,16,22,0.82)] backdrop-blur-md px-6 py-4 text-left text-2xl leading-snug md:text-[28px] ${color(l.from).split(" ")[1]}`}>
              {l.text}
            </div>
          </div>
        ))}
        {s?.relayTyping && (
          <div className={`rise-in ${side(s.relayTyping)}`}>
            <div className={`mb-1 text-lg font-semibold ${color(s.relayTyping).split(" ")[0]}`}>{s.relayTyping}</div>
            <div className="inline-flex gap-2 rounded-[28px] border border-line bg-card px-6 py-5 text-2xl text-muted">
              <span className="hop inline-block"><GhostIcon className="h-6 w-6" /></span><span className="hop inline-block"><GhostIcon className="h-6 w-6" /></span><span className="hop inline-block"><GhostIcon className="h-6 w-6" /></span>
            </div>
          </div>
        )}
        <div ref={end} />
      </div>
      <footer className="sticky bottom-4 mt-8 flex flex-wrap items-center justify-center gap-2 text-sm">
        {[["Terse", "User · Person · Friendship actors"], ["Agent Relay", "#unghosted channel"], ["OpenAI", "voice → memory · invites"]].map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-2 rounded-full border border-line bg-[rgba(29,16,22,0.85)] px-3 py-1.5 backdrop-blur">
            <span className="live-dot h-2 w-2 rounded-full bg-sandstone" /><b className="font-semibold text-foreground">{k}</b><span className="text-muted">{v}</span>
          </span>
        ))}
      </footer>
    </div>
    </>
  );
}
