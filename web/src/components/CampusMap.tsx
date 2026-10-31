"use client";

import Link from "next/link";
import { useMe } from "@/lib/user";
import { GhostIcon } from "@/components/ui";

/** A cozy, hand-drawn campus-at-night map. Friends live where you met them;
 *  the ones you've lost touch with drift away as ghosts; when the agents find
 *  a time, a golden thread runs from you to the meeting spot and it lights up like a lantern. */

type Spot = { x: number; y: number; label: string; keys: string[] };
const SPOTS: Spot[] = [
  { x: 22, y: 22, label: "Lake Lag", keys: ["lake lag", "lag", "lake"] },
  { x: 72, y: 18, label: "Branner", keys: ["branner", "dorm"] },
  { x: 86, y: 34, label: "Arrillaga", keys: ["arrillaga", "gym", "rec", "climb", "frisbee", "ultimate"] },
  { x: 36, y: 40, label: "Hoover Tower", keys: ["hoover", "tower"] },
  { x: 52, y: 52, label: "Main Quad", keys: ["quad", "pwr", "hume", "class", "lecture", "nvidia", "film"] },
  { x: 74, y: 56, label: "Gates", keys: ["gates", "cs", "section", "hackathon", "haunted", "research"] },
  { x: 40, y: 68, label: "Green Library", keys: ["green", "library", "lathrop", "study"] },
  { x: 62, y: 74, label: "Tresidder", keys: ["tresidder", "white plaza", "activities", "fair", "boba"] },
  { x: 22, y: 80, label: "Coupa", keys: ["coupa", "cafe", "café", "coffee", "coho"] },
  { x: 84, y: 82, label: "Wilbur", keys: ["wilbur", "frosoco", "dining", "movie", "orientation", "nso"] },
];
const YOU = { x: 52, y: 93 };

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
export function spotFor(place?: string, seed = ""): Spot {
  const p = (place || "").toLowerCase();
  const hit = p && SPOTS.find((s) => s.keys.some((k) => p.includes(k)));
  return hit || SPOTS[hash(seed || p) % SPOTS.length];
}

export type MapPerson = { id: string; name: string; days: number; place?: string; link: string; main?: boolean };

export function CampusMap({ people, meetAt, className = "", big = false, meName = "you" }:
  { people: MapPerson[]; meetAt?: string; className?: string; big?: boolean; meName?: string }) {
  const { href } = useMe();
  const meet = meetAt ? spotFor(meetAt) : null;
  const used: Record<string, number> = {};
  const placed = people.map((p) => {
    const s = p.main && meet ? meet : spotFor(p.place, p.id);
    const n = (used[s.label] = (used[s.label] ?? -1) + 1);
    const a = n * 2.1 + (hash(p.id) % 10) / 10;
    const r = n === 0 ? 0 : 5 + n * 1.2;
    const drift = Math.min(1, Math.max(0, (p.days - 14) / 40)); // ghosts float outward/up
    return { ...p, x: s.x + Math.cos(a) * r * 0.8, y: s.y + Math.sin(a) * r - drift * 8 };
  });

  return (
    <div className={`relative w-full overflow-hidden rounded-[28px] border border-line ${big ? "" : "aspect-[4/3]"} ${className}`}
      style={{ background: "radial-gradient(120% 90% at 50% 10%, #2a1626 0%, #160b12 55%, #0d0709 100%)" }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <radialGradient id="lantern" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffcf6b" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffcf6b" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Lake Lag */}
        <path d="M8 18 C 10 8, 30 8, 34 18 S 26 34, 16 30 S 6 26, 8 18 Z" fill="#1d2b3a" opacity="0.9" />
        <path d="M12 19 q 6 -3 12 0" stroke="#ffcf6b" strokeOpacity="0.25" strokeWidth="0.4" fill="none" />
        {/* paths (dotted golden lamplight) */}
        <g stroke="#ffcf6b" strokeOpacity="0.28" strokeWidth="0.6" fill="none" strokeDasharray="0.6 1.6" strokeLinecap="round">
          <path d="M52 100 L 52 58" />
          <path d="M22 80 C 34 70, 44 66, 52 60 C 62 56, 70 56, 84 82" />
          <path d="M36 40 C 44 46, 48 50, 52 52 C 60 52, 68 54, 74 56" />
          <path d="M22 22 C 30 32, 32 36, 36 40" />
          <path d="M72 18 C 78 24, 82 28, 86 34 C 80 44, 76 50, 74 56" />
          <path d="M40 68 C 48 72, 54 74, 62 74" />
        </g>
        {/* Main Quad */}
        <rect x="44" y="45" width="16" height="12" rx="1.5" fill="#2b1a22" stroke="#ffcf6b" strokeOpacity="0.35" strokeWidth="0.35" />
        <rect x="48" y="48.5" width="8" height="5" rx="0.8" fill="#3a2430" />
        {/* Hoover Tower */}
        <rect x="35" y="30" width="2.4" height="9" fill="#33202a" stroke="#ffcf6b" strokeOpacity="0.4" strokeWidth="0.25" />
        <path d="M34.6 30 L 36.2 26.5 L 37.8 30 Z" fill="#ffcf6b" opacity="0.8" />
        <circle cx="36.2" cy="32" r="0.45" fill="#ffcf6b" />
        {/* little buildings with lit windows */}
        {[[70, 14], [84, 30], [72, 52], [38, 64], [60, 70], [20, 76], [82, 78]].map(([x, y], i) => (
          <g key={i}>
            <rect x={x - 3} y={y} width="6" height="4" rx="0.6" fill="#24151d" stroke="#ffcf6b" strokeOpacity="0.18" strokeWidth="0.25" />
            <rect x={x - 1.8} y={y + 1.2} width="1" height="1" fill="#ffcf6b" opacity={0.5 + (i % 3) * 0.15} />
            <rect x={x + 0.8} y={y + 1.2} width="1" height="1" fill="#ffcf6b" opacity={0.35 + (i % 2) * 0.3} />
          </g>
        ))}
        {/* trees */}
        {[[10, 44], [16, 50], [28, 56], [8, 62], [92, 50], [94, 62], [88, 12], [46, 26], [58, 30], [30, 92], [70, 92], [96, 92], [4, 92]].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={1.8 + (i % 3) * 0.5} fill="#1c2a1f" opacity="0.9" />
        ))}
        {/* meeting lantern + golden thread from you */}
        {meet && <circle cx={meet.x} cy={meet.y} r="16" fill="url(#lantern)" className="lantern-pulse" />}
        {meet && (
          <path d={`M ${YOU.x} ${YOU.y} Q ${(YOU.x + meet.x) / 2 + 10} ${(YOU.y + meet.y) / 2 + 4}, ${meet.x} ${meet.y}`}
            fill="none" stroke="#ffcf6b" strokeWidth="0.7" strokeDasharray="1.2 1.2" strokeLinecap="round" className="thread" />
        )}
      </svg>

      {/* labels */}
      {SPOTS.map((s) => (
        <span key={s.label} className={`pointer-events-none absolute -translate-x-1/2 font-spooky text-[10px] tracking-wide ${meet?.label === s.label ? "text-accent" : "text-[#ffcf6b]/35"}`}
          style={{ left: `${s.x}%`, top: `${s.y + 6}%` }}>{s.label}</span>
      ))}

      {/* you are here */}
      <span className="pointer-events-none absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full border border-[#ffcf6b]/40 bg-[#1d1016]/85 px-2 py-0.5 font-spooky text-[10px] text-accent"
        style={{ left: `${YOU.x}%`, top: `${YOU.y}%` }}>
        <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_#ffcf6b]" />{meName}
      </span>

      {meet && (
        <span className="rise-in absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-accent px-3 py-1 font-spooky text-xs text-[#2a1406] shadow-[0_0_24px_rgba(255,207,107,0.6)]"
          style={{ left: `${meet.x}%`, top: `${meet.y - 9}%` }}>✨ you&apos;ll both be here</span>
      )}

      {placed.map((p, i) => {
        const ghost = p.days > 21;
        return (
          <Link key={p.id} href={href(p.link)} title={`${p.name} · ${p.days}d`}
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-700"
            style={{ left: `${p.x}%`, top: `${p.y}%`, opacity: ghost ? Math.max(0.35, 0.9 - (p.days - 21) / 60) : 1, zIndex: p.main ? 3 : 2 }}>
            {ghost ? (
              <span className="haunt ghost-glow block text-[#f3e9ff]" style={{ animationDelay: `${(i % 6) * 0.5}s` }}>
                <GhostIcon className="h-6 w-6" />
              </span>
            ) : (
              <span className={`bob flex items-center justify-center rounded-full font-spooky text-[#2a1406] ${p.main ? "h-10 w-10 text-base bg-accent ring-4 ring-[#ffcf6b]/25 shadow-[0_0_24px_rgba(255,207,107,0.7)]" : "h-7 w-7 text-xs bg-[#ffe7b8] ring-2 ring-[#ffcf6b]/20"}`}
                style={{ animationDelay: `${(i % 5) * 0.4}s`, filter: p.main ? undefined : `saturate(${1 - Math.min(0.8, p.days / 30)})` }}>
                {p.name[0]}
              </span>
            )}
          </Link>
        );
      })}

      <Fireflies />
    </div>
  );
}

export function Fireflies({ n = 14 }: { n?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="firefly absolute h-1 w-1 rounded-full bg-[#ffcf6b]"
          style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53 + 11) % 100}%`, animationDelay: `${(i % 7) * 0.7}s`, animationDuration: `${5 + (i % 4)}s` }} />
      ))}
    </div>
  );
}
