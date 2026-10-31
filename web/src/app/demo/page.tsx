"use client";

import Link from "next/link";
import { useState } from "react";
import type { StateView } from "@/lib/types";
import { post, usePoll } from "@/lib/usePoll";

// Hidden demo controls. Not linked from the app.
export default function Demo() {
  const { data: s } = usePoll<StateView>("/api/state?as=partner");
  const [msg, setMsg] = useState("");
  const run = (label: string, url: string, payload?: unknown) => async () => {
    setMsg(`${label}...`);
    try { await post(url, payload); setMsg(`${label}: done`); } catch (e) { setMsg(`${label} failed: ${(e as Error).message}`); }
  };
  const btn = "w-full rounded-3xl py-5 text-xl font-semibold";
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-4 px-4 py-8">
      <p className="text-sm text-muted">👻 Don&apos;t Ghost Me</p><h1 className="font-serif text-4xl font-medium">Demo <span className="text-accent">controls</span></h1>
      <button className={`${btn} border border-line bg-card`} onClick={run("Reset", "/api/demo/reset")}>Reset</button>
      <button className={`${btn} border border-line bg-card`} onClick={run("Simulate 21 days", "/api/demo/simulate", { days: 21 })}>Simulate 21 days</button>
      <button className={`${btn} bg-accent text-white`} onClick={run("Find time", "/api/demo/find-time", { as: "erin" }) /* Erin asks, so Charlotte's agent replies using her private note (badge on her phone) */}>Find time</button>
      <p className="min-h-7 text-lg text-muted">{msg}</p>
      {s && (
        <div className="rounded-3xl border border-line bg-card p-4 text-base text-muted">
          Days since: {s.friendship.daysSince} · Proposal: {s.friendship.proposal?.status ?? "none"} · Relay lines: {s.relayLog.length}
        </div>
      )}
      <div className="flex flex-wrap gap-4 text-lg text-accent-ink">
        <Link href="/?as=erin">Erin&apos;s home</Link>
        <Link href="/?as=partner">Partner&apos;s home</Link>
        <Link href="/agents">Agents screen</Link>
      </div>
    </div>
  );
}
