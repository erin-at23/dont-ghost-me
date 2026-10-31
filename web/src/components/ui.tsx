"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { post } from "@/lib/usePoll";
import { useMe } from "@/lib/user";
import type { ProposalView, StateView } from "@/lib/types";
import { NAMES } from "@/mocks";

export const GHOST_DAYS = 21;

const PASTELS = ["#ffd6c2", "#e3d7ff", "#c9f0de", "#fff0b8", "#ffd0dc", "#cfe4ff"];
/** A soft pastel per person, stable across renders. */
export const pastel = (name: string) => PASTELS[[...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % PASTELS.length];

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
        <div className="min-w-0">
          <p className="mb-1 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted">
            <GhostIcon className="h-3.5 w-3.5 text-accent" /> Don&apos;t Ghost Me
          </p>
          <h1 className="font-serif text-[34px] font-semibold leading-tight">{title}</h1>
        </div>
        <div className="flex shrink-0 rounded-full border border-line bg-card p-1 text-sm">
          {(["erin", "partner"] as const).map((u) => (
            <Link key={u} href={swap(u)} replace
              className={`rounded-full px-3 py-1.5 transition-colors ${me === u ? "bg-accent font-semibold" : "text-muted hover:text-foreground"}`}>
              {NAMES[u]}
            </Link>
          ))}
        </div>
      </header>
      {offline && (
        <div className="mb-3 rounded-2xl border border-line bg-card px-4 py-2 text-sm text-muted">Reconnecting…</div>
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
    <nav className="fixed inset-x-0 bottom-5 z-40 px-4">
      <div className="mx-auto flex max-w-sm gap-1 rounded-full border border-line bg-[rgba(29,16,22,0.8)] p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        {items.map((it) => (
          <Link key={it.path} href={href(it.path)}
            className={`flex-1 rounded-full py-3 text-center text-[15px] font-medium transition-colors ${path === it.path ? "bg-accent/15 text-accent" : "text-muted hover:text-foreground"}`}>
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
        <span className="haunt ghost-glow text-pumpkin/90" style={{ animationDelay: `${(name.length % 5) * 0.4}s` }}>
          <GhostIcon className="h-10 w-10" />
        </span>
        <span className="font-spooky text-sm text-pumpkin/90">{name.split(" ")[0]}</span>
        <span className="text-xs text-muted">{days}d</span>
      </Link>
    );
  }
  const fade = 1 - (days / GHOST_DAYS) * 0.55;
  return (
    <Link href={href(link)} style={{ opacity: fade, filter: `grayscale(${Math.min(1, days / GHOST_DAYS)})` }}
      className="rise-in relative flex items-center gap-4 rounded-3xl border border-line bg-card p-4 transition-all duration-700 hover:border-white/20">
      {days >= 12 && (
        <span className="peek pointer-events-none absolute -right-1 -top-3 text-pumpkin ghost-glow" style={{ animationDelay: `${(name.length % 4) * 1.3}s` }}>
          <GhostIcon className="h-6 w-6" />
        </span>
      )}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ffe7b8] font-spooky text-xl text-[#2a1406] ring-2 ring-[#ffcf6b]/30 shadow-[0_0_18px_rgba(255,207,107,0.35)]">
        {name[0]}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-serif text-xl font-semibold">{name}</div>
        <div className="truncate text-[15px] text-muted">{subtitle ?? daysLabel(days)}</div>
      </div>
      <Candle days={days} />
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-sm sm:items-center">
      <div className="rise-in w-full max-w-md rounded-[28px] border border-white/10 bg-raised p-6 shadow-[0_30px_80px_rgba(0,0,0,0.6),0_0_40px_rgba(255,207,107,0.15)]">
        <p className="inline-flex items-center gap-2 text-sm font-medium text-accent-ink"><span className="live-dot h-2 w-2 rounded-full bg-sandstone" />Your agents found a time</p>
        <h2 className="mt-2 font-serif text-3xl font-medium leading-snug">
          {p.place} <span className="text-accent">with {state.other.name}</span>
        </h2>
        <p className="mt-1 text-xl">{fmtWhen(p.at)}</p>
        <p className="mt-3 text-lg text-muted">{p.reason}</p>
        {p.usedMyPrivateNote && <PrivateNoteBadge />}
        <div className="mt-6 flex gap-3">
          <button disabled={busy} onClick={() => answer("no")}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-4 text-lg font-medium text-foreground/80">Not now</button>
          <button disabled={busy} onClick={() => answer("yes")}
            className="flex-1 rounded-2xl bg-accent py-4 text-lg font-semibold text-white">Yes, let&apos;s go</button>
        </div>
      </div>
    </div>
  );
}

export function PrivateNoteBadge() {
  return (
    <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm text-accent-ink">
      <span aria-hidden>🤫</span> Used your private note
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
    <div className="rise-in rounded-3xl border border-white/10 bg-gradient-to-br from-accent/30 via-accent/10 to-sandstone/10 p-5 shadow-[0_20px_60px_rgba(255,191,77,0.18)]">
      <p className="text-sm font-medium text-sandstone">It&apos;s on ✓</p>
      <h2 className="mt-1 font-serif text-3xl font-semibold">{state.other.name} · {proposal.place}</h2>
      <p className="text-xl">{fmtWhen(proposal.at)}</p>
      {proposal.usedMyPrivateNote && <PrivateNoteBadge />}
      <p className="mt-4 text-lg leading-relaxed">{brief ?? "Writing your brief..."}</p>
    </div>
  );
}

/** Days since you met, as a candle that burns down. Fresh = tall flame; 3 weeks = a stub. */
export function Candle({ days }: { days: number }) {
  const h = Math.max(4, 22 - (days / GHOST_DAYS) * 18);
  return (
    <div className="flex w-10 shrink-0 flex-col items-center" title={`${days} days`}>
      <svg viewBox="0 0 20 36" className="h-9 w-5" aria-hidden>
        <g className="flame" style={{ transformBox: "fill-box" }}>
          <path d={`M10 ${34 - h - 9} C 6 ${34 - h - 4}, 7 ${34 - h}, 10 ${34 - h} C 13 ${34 - h}, 14 ${34 - h - 4}, 10 ${34 - h - 9} Z`} fill="#ffcf6b" />
          <path d={`M10 ${34 - h - 5} C 8.5 ${34 - h - 2}, 9 ${34 - h}, 10 ${34 - h} C 11 ${34 - h}, 11.5 ${34 - h - 2}, 10 ${34 - h - 5} Z`} fill="#fff4e2" />
        </g>
        <rect x="7" y={34 - h} width="6" height={h} rx="1.5" fill="#ffe7b8" />
        <rect x="5" y="33" width="10" height="2.5" rx="1.2" fill="#b9a596" opacity="0.6" />
      </svg>
      <span className="text-[11px] tabular-nums text-muted">{days}d</span>
    </div>
  );
}

export function Chip({ children, i = 0 }: { children: ReactNode; i?: number }) {
  return (
    <span className="rise-in inline-block rounded-full border border-line bg-white/5 px-3 py-1.5 text-[15px]"
      style={{ animationDelay: `${i * 80}ms` }}>
      {children}
    </span>
  );
}
