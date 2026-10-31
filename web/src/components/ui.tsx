"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { post } from "@/lib/usePoll";
import { useMe } from "@/lib/user";
import type { ProposalView, StateView } from "@/lib/types";
import { NAMES } from "@/mocks";

export const GHOST_DAYS = 21;

export function fmtWhen(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date(Date.now() + 86_400_000);
  const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}, ${time}`;
}

export const daysLabel = (d: number) => (d === 0 ? "Seen today" : d === 1 ? "1 day ago" : `${d} days ago`);

export function GhostIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2a8 8 0 0 0-8 8v11.2c0 .6.7 1 1.2.6l1.9-1.5 1.9 1.5c.4.3.9.3 1.2 0L12 20.3l1.8 1.5c.4.3.9.3 1.2 0l1.9-1.5 1.9 1.5c.5.4 1.2 0 1.2-.6V10a8 8 0 0 0-8-8Zm-3 10a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Zm6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
    </svg>
  );
}

/** Page wrapper: user switcher on top, nav at the bottom. */
export function Shell({ title, children, offline }: { title: string; children: ReactNode; offline?: boolean }) {
  const { me } = useMe();
  const path = usePathname();
  const swap = (u: string) => `${path}?as=${u}`;
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-6">
      <header className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent-ink">Don&apos;t Ghost Me</p>
          <h1 className="font-serif text-4xl font-semibold tracking-tight">{title}</h1>
        </div>
        <div className="flex rounded-full border border-line p-1 text-sm">
          {(["erin", "partner"] as const).map((u) => (
            <Link key={u} href={swap(u)} replace
              className={`rounded-full px-3 py-1 ${me === u ? "bg-accent text-white font-semibold" : "text-muted"}`}>
              {NAMES[u]}
            </Link>
          ))}
        </div>
      </header>
      {offline && (
        <div className="mb-3 rounded-xl border border-line px-3 py-2 text-sm text-muted">Reconnecting...</div>
      )}
      <main className="flex flex-1 flex-col gap-4">{children}</main>
      <Nav />
    </div>
  );
}

function Nav() {
  const { href } = useMe();
  const path = usePathname();
  const items = [
    { path: "/", label: "People" },
    { path: "/voice", label: "Voice note" },
    { path: "/connect", label: "Connect" },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-md">
        {items.map((it) => (
          <Link key={it.path} href={href(it.path)}
            className={`flex-1 py-4 text-center text-lg ${path === it.path ? "text-accent-ink font-semibold" : "text-muted"}`}>
            {it.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

/** A friend card that fades as days grow; past 21 days it becomes a small ghost. */
export function PersonCard({ name, days, subtitle, link }: { name: string; days: number; subtitle?: string; link: string }) {
  const { href } = useMe();
  if (days > GHOST_DAYS) {
    return (
      <Link href={href(link)} className="rise-in flex flex-col items-center gap-1 rounded-2xl p-2"
        style={{ opacity: Math.max(0.45, 0.95 - (days - GHOST_DAYS) / 80) }}>
        <span className="haunt ghost-glow text-foreground/90" style={{ animationDelay: `${(name.length % 5) * 0.4}s` }}>
          <GhostIcon className="h-12 w-12" />
        </span>
        <span className="spooky-text font-spooky text-lg tracking-wide text-pumpkin">{name.split(" ")[0]}</span>
        <span className="text-xs text-muted">{days} days</span>
      </Link>
    );
  }
  const fade = 1 - (days / GHOST_DAYS) * 0.55;
  return (
    <Link href={href(link)}
      className="rise-in flex items-center gap-4 rounded-2xl border border-line bg-card p-4 transition-all duration-700"
      style={{ opacity: fade, filter: `grayscale(${Math.min(1, days / GHOST_DAYS)})` }}>
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/20 font-serif text-2xl font-semibold text-accent-ink ring-1 ring-accent/40">
        {name[0]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-serif text-2xl font-semibold">{name}</div>
        <div className="truncate text-base text-muted">{subtitle ?? daysLabel(days)}</div>
      </div>
      <div className="text-sm text-muted">{days}d</div>
    </Link>
  );
}

/** "Your agents found a time..." with Yes / Not now. Not now just hides it. */
export function ProposalPopup({ state, onDone }: { state: StateView; onDone: () => void }) {
  const { me } = useMe();
  const p = state.friendship.proposal;
  const [busy, setBusy] = useState(false);
  if (!p || p.status !== "pending" || p.myResponse !== null) return null;
  const answer = async (a: "yes" | "no") => {
    setBusy(true);
    try { await post("/api/respond", { as: me, answer: a }); } finally { setBusy(false); onDone(); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 p-4 sm:items-center">
      <div className="rise-in w-full max-w-md rounded-3xl border border-white/10 border-t-4 border-t-accent bg-raised p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-ink">Your agents found a time</p>
        <h2 className="mt-2 font-serif text-3xl font-semibold leading-snug">
          {p.place} with {state.other.name}
        </h2>
        <p className="mt-1 text-xl">{fmtWhen(p.at)}</p>
        <p className="mt-3 text-lg text-muted">{p.reason}</p>
        {p.usedMyPrivateNote && <PrivateNoteBadge />}
        <div className="mt-6 flex gap-3">
          <button disabled={busy} onClick={() => answer("no")}
            className="flex-1 rounded-2xl border border-white/15 py-4 text-xl text-foreground/80">Not now</button>
          <button disabled={busy} onClick={() => answer("yes")}
            className="flex-1 rounded-2xl bg-accent py-4 text-xl font-semibold text-white">Yes</button>
        </div>
      </div>
    </div>
  );
}

export function PrivateNoteBadge() {
  return (
    <span className="mt-3 inline-block rounded-full border border-accent/40 px-3 py-1 text-sm text-accent-ink">
      Used your private note
    </span>
  );
}

/** Shown on an accepted proposal. The brief is generated once server-side and cached. */
export function BriefCard({ state, proposal }: { state: StateView; proposal: ProposalView }) {
  const { me } = useMe();
  const [brief, setBrief] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    post<{ brief: string }>("/api/brief", { as: me, other: state.other.id })
      .then((r) => alive && setBrief(r.brief))
      .catch(() => alive && setBrief(null));
    return () => { alive = false; };
  }, [me, state.other.id, proposal.id]);
  return (
    <div className="rise-in rounded-3xl border border-accent/50 bg-gradient-to-br from-accent/25 to-card p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-accent-ink">It&apos;s on</p>
      <h2 className="mt-1 font-serif text-3xl font-semibold">{state.other.name} · {proposal.place}</h2>
      <p className="text-xl">{fmtWhen(proposal.at)}</p>
      {proposal.usedMyPrivateNote && <PrivateNoteBadge />}
      <p className="mt-4 text-lg leading-relaxed">{brief ?? "Writing your brief..."}</p>
    </div>
  );
}

export function Chip({ children, i = 0 }: { children: ReactNode; i?: number }) {
  return (
    <span className="rise-in inline-block rounded-full border border-line bg-card px-3 py-1.5 text-base"
      style={{ animationDelay: `${i * 80}ms` }}>
      {children}
    </span>
  );
}

/** The main friend. Remounts when crossing the ghost line, so each side plays its own entrance. */
export function FriendCard({ name, days, subtitle, link }: { name: string; days: number; subtitle: string; link: string }) {
  const { href } = useMe();
  const ghost = days > GHOST_DAYS;
  if (ghost) {
    return (
      <Link key="ghost" href={href(link)}
        className="fade-to-ghost flex items-center gap-4 rounded-2xl border border-pumpkin/30 bg-[radial-gradient(circle_at_15%_50%,rgba(242,140,40,0.14),transparent_60%)] bg-card p-4">
        <span className="haunt ghost-glow shrink-0 text-foreground/90"><GhostIcon className="h-14 w-14" /></span>
        <div className="min-w-0 flex-1">
          <div className="spooky-text font-spooky text-3xl tracking-wide text-pumpkin">{name}</div>
          <div className="text-base text-muted">{days} days. Don&apos;t ghost.</div>
        </div>
      </Link>
    );
  }
  const fade = 1 - (days / GHOST_DAYS) * 0.55;
  return (
    <Link key="alive" href={href(link)} className="rise-back block rounded-2xl">
      <div className="flex items-center gap-4 rounded-2xl border border-line bg-card p-4 transition-all duration-700"
        style={{ opacity: fade, filter: `grayscale(${Math.min(1, days / GHOST_DAYS)})` }}>
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent/20 font-serif text-2xl font-semibold text-accent-ink ring-1 ring-accent/40">
          {name[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-serif text-2xl font-semibold">{name}</div>
          <div className="truncate text-base text-muted">{subtitle}</div>
        </div>
        <div className="text-sm text-muted">{days}d</div>
      </div>
    </Link>
  );
}

/** One tap to let the agents look for a time. Nobody types on stage. */
export function NudgeCard({ text }: { text: string }) {
  const { me } = useMe();
  const [asked, setAsked] = useState(false);
  const [err, setErr] = useState("");
  const ask = async () => {
    setAsked(true); setErr("");
    try { await post("/api/demo/find-time", { as: me }); } catch (e) { setAsked(false); setErr((e as Error).message); }
  };
  return (
    <div className="rise-in rounded-3xl border border-accent/40 bg-accent/10 p-5">
      <p className="font-serif text-2xl leading-snug">{text}</p>
      <button onClick={ask} disabled={asked}
        className="mt-4 w-full rounded-2xl bg-accent py-4 text-xl font-semibold text-white disabled:opacity-60">
        {asked ? "Your agents are talking..." : "Find us a time"}
      </button>
      {err && <p className="mt-2 text-base text-red-400">{err}</p>}
    </div>
  );
}
