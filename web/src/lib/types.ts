// Erin's shared contract lives in ../shared/types.ts. Never change it from here.
export type {
  UserId, CalendarEvent, FreeSlot, Extraction, Meeting, PersonProfile,
  PersonSummary, Proposal, RelayLogLine, Nudge, FriendshipState,
} from "../../../shared/types";
import type { UserId, PersonProfile, RelayLogLine } from "../../../shared/types";

// ---- web-only view types (what /api/state sends to the browser) ----

export const USERS = ["erin", "partner"] as const;

// URLs say ?as=charlotte; inside the app and in Erin's actors the id stays "partner".
const SLUGS: Record<string, string> = { erin: "erin", partner: "charlotte" };
/** Internal id -> what appears in page URLs. */
export const toSlug = (id: string) => SLUGS[id] ?? id;
/** URL value -> internal id ("charlotte" and the old "partner" both work), or null. */
export function fromSlug(v: string | null | undefined): UserId | null {
  if (!v) return null;
  const s = v.toLowerCase();
  if (s === "charlotte" || s === "partner") return "partner";
  if (s === "erin") return "erin";
  return null;
}

/** Proposal as one user may see it: never the other person's answer. */
export interface ProposalView {
  id: string; at: string; place: string; reason: string;
  status: "pending" | "accepted"; // "declined" is never sent
  myResponse: "yes" | "no" | null;
  usedMyPrivateNote: boolean;
}

export interface Ghost {
  id: string; name: string; lastSeenAt: string; daysSince: number;
  oneLiner?: string;
  metPlace?: string;
  profile: PersonProfile | null; // live mode only has a summary, no full profile
}

export interface StateView {
  me: { id: UserId; name: string; wantsClose: boolean };
  other: { id: UserId; name: string };
  friendship: {
    id: string; createdAt: string; lastSeenAt: string; daysSince: number;
    proposal: ProposalView | null;
    meetups: { at: string; place: string }[];
  };
  relayLog: RelayLogLine[];
  relayTyping: string | null; // name of the agent currently "typing", for /agents
  myProfileOfOther: PersonProfile | null;
  ghosts: Ghost[];
  nudge?: string;
}
