import type { Extraction, PersonProfile, StateView, UserId, ProposalView, Meeting } from "./types";
import { NAMES, relayScript, seedWorld, tomorrowAt, type MockWorld } from "@/mocks";

export interface Backend {
  getState(as: UserId): Promise<StateView>;
  connect(from: UserId, to: UserId): Promise<StateView["friendship"]>;
  setWantsClose(as: UserId, other: UserId, value: boolean): Promise<void>;
  respond(as: UserId, answer: "yes" | "no"): Promise<void>;
  getProfile(as: UserId, other: UserId): Promise<PersonProfile | null>;
  applyExtraction(as: UserId, other: UserId, x: Extraction, meta: { at: string; place: string }): Promise<void>;
  /** Cached brief for the current accepted proposal, or null. */
  getBrief(as: UserId): Promise<{ proposalId: string; brief: string | null } | null>;
  saveBrief(as: UserId, proposalId: string, brief: string): Promise<void>;
  reset(): Promise<void>;
  simulateDaysPassed(days: number): Promise<void>;
  findTime(as: UserId): Promise<void>;
}

export const otherOf = (u: UserId): UserId => (u === "erin" ? "partner" : "erin");
const DAY = 86_400_000;
const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY));
const shift = (iso: string, days: number) => new Date(new Date(iso).getTime() - days * DAY).toISOString();
const uniq = (a: string[], b: string[]) => [...new Set([...a, ...b.map((s) => s.trim()).filter(Boolean)])];

// ---------------- mock ----------------

// Kept on globalThis so every route module and hot reload share one world.
const g = globalThis as unknown as { __ghostWorld?: MockWorld; __ghostTimers?: ReturnType<typeof setTimeout>[] };
const world = () => (g.__ghostWorld ??= seedWorld());
const timers = () => (g.__ghostTimers ??= []);

function friendshipView(w: MockWorld, as: UserId): StateView["friendship"] {
  const f = w.friendship;
  const p = f.proposal;
  let proposal: ProposalView | null = null;
  // No rejection in the UI: a declined proposal, or one I said "not now" to, is simply not sent.
  if (p && p.status !== "declined" && p.responses[as] !== "no") {
    proposal = {
      id: p.id, at: p.at, place: p.place, reason: p.reason,
      status: p.status === "accepted" ? "accepted" : "pending",
      myResponse: p.responses[as] ?? null,
      usedMyPrivateNote: f.proposalUsedNoteOf === as,
    };
  }
  return { id: f.id, createdAt: f.createdAt, lastSeenAt: f.lastSeenAt, daysSince: daysSince(f.lastSeenAt), proposal, meetups: f.meetups };
}

export const mockBackend: Backend = {
  async getState(as) {
    const w = world();
    const other = otherOf(as);
    const friendship = friendshipView(w, as);
    const ghosts = w.ghosts[as]
      .map((x) => ({ ...x, daysSince: daysSince(x.lastSeenAt) }))
      .sort((a, b) => a.daysSince - b.daysSince);
    const nudge = !friendship.proposal && friendship.daysSince >= 14
      ? `It's been ${friendship.daysSince} days since you saw ${NAMES[other]}.`
      : undefined;
    return {
      me: { id: as, name: NAMES[as], wantsClose: !!w.wantsClose[as]?.[other] },
      other: { id: other, name: NAMES[other] },
      friendship,
      relayLog: w.relayLog,
      relayTyping: w.relayTyping,
      myProfileOfOther: w.profiles[`${as}:${other}`] ?? null,
      ghosts,
      nudge,
    };
  },

  async connect(from, to) {
    const w = world();
    w.friendship.connected = true;
    return friendshipView(w, to);
  },

  async setWantsClose(as, other, value) {
    const w = world();
    (w.wantsClose[as] ??= {})[other] = value;
  },

  async respond(as, answer) {
    const w = world();
    const p = w.friendship.proposal;
    if (!p || p.status !== "pending") return;
    p.responses[as] = answer;
    if (answer === "no") p.status = "declined";
    else if (Object.values(p.responses).every((r) => r === "yes")) {
      p.status = "accepted";
      w.friendship.meetups.push({ at: p.at, place: p.place });
      w.friendship.lastSeenAt = new Date().toISOString(); // card rises back
    }
  },

  async getProfile(as, other) {
    return world().profiles[`${as}:${other}`] ?? null;
  },

  async applyExtraction(as, other, x, meta) {
    const w = world();
    const key = `${as}:${other}`;
    const prev: PersonProfile = w.profiles[key] ?? {
      ownerId: as, personId: other, name: x.name ?? NAMES[other] ?? other,
      firstMetAt: meta.at, firstMetPlace: meta.place,
      facts: [], interests: [], commonalities: [], meetings: [],
    };
    const meeting: Meeting = {
      id: `m-${Date.now()}`, at: meta.at, place: meta.place,
      memories: x.memories, impression: x.impression, commonalities: x.commonalities,
    };
    w.profiles[key] = {
      ...prev,
      facts: uniq(prev.facts, x.facts),
      interests: uniq(prev.interests, x.interests),
      commonalities: uniq(prev.commonalities, x.commonalities),
      impression: x.impression || prev.impression,
      meetings: [...prev.meetings, meeting],
    };
  },

  async getBrief(as) {
    const w = world();
    const p = w.friendship.proposal;
    if (!p || p.status !== "accepted") return null;
    return { proposalId: p.id, brief: w.briefs[`${p.id}:${as}`] ?? null };
  },

  async saveBrief(as, proposalId, brief) {
    world().briefs[`${proposalId}:${as}`] = brief;
  },

  async reset() {
    timers().forEach(clearTimeout);
    g.__ghostTimers = [];
    g.__ghostWorld = seedWorld();
  },

  async simulateDaysPassed(days) {
    const w = world();
    w.friendship.lastSeenAt = shift(w.friendship.lastSeenAt, days);
    for (const list of Object.values(w.ghosts)) for (const x of list) x.lastSeenAt = shift(x.lastSeenAt, days);
    // An old proposal no longer makes sense after weeks pass.
    if (w.friendship.proposal?.status === "pending") w.friendship.proposal = null;
  },

  async findTime() {
    const w = world();
    timers().forEach(clearTimeout);
    g.__ghostTimers = [];
    w.friendship.proposal = null;
    w.relayLog = [];
    const a = `${NAMES.erin}'s agent`;
    const b = `${NAMES.partner}'s agent`;
    const script = relayScript(a, b);
    const STEP = 1800;
    script.forEach((line, i) => {
      timers().push(setTimeout(() => { world().relayTyping = line.from; }, i * STEP));
      timers().push(setTimeout(() => {
        const cw = world();
        cw.relayLog = [...cw.relayLog, { ...line, at: new Date().toISOString() }];
        cw.relayTyping = null;
      }, i * STEP + 1200));
    });
    timers().push(setTimeout(() => {
      const cw = world();
      cw.friendship.proposal = {
        id: `p-${Date.now()}`, at: tomorrowAt(15, 30), place: "Boba Guys near Tresidder",
        reason: "You're both near Tresidder tomorrow afternoon. A quick study-break boba fits a busy week.",
        status: "pending", responses: { erin: null, partner: null },
      };
      cw.friendship.proposalUsedNoteOf = "partner";
    }, script.length * STEP + 300));
  },
};

// ---------------- live (Block 3+) ----------------

const notYet = (name: string) => async (): Promise<never> => {
  throw new Error(`liveBackend.${name} is not implemented yet (Block 3/5). Use BACKEND=mock.`);
};

export const liveBackend: Backend = {
  getState: notYet("getState"),
  connect: notYet("connect"),
  setWantsClose: notYet("setWantsClose"),
  respond: notYet("respond"),
  getProfile: notYet("getProfile"),
  applyExtraction: notYet("applyExtraction"),
  getBrief: notYet("getBrief"),
  saveBrief: notYet("saveBrief"),
  reset: notYet("reset"),
  simulateDaysPassed: notYet("simulateDaysPassed"),
  findTime: notYet("findTime"),
};

export function getBackend(): Backend {
  return process.env.BACKEND === "live" ? liveBackend : mockBackend;
}
