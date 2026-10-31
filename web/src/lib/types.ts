// Mirror of Erin's shared contract (../shared/types.ts). Do not change these.
// Once ../shared/types.ts exists, re-export from there instead.

export type UserId = string; // "erin" | "partner"
export interface CalendarEvent { id: string; title: string; place: string; start: string; end: string }
export interface FreeSlot { start: string; end: string; place: string } // no titles, ever
export interface Extraction {
  name?: string; place?: string;
  facts: string[]; interests: string[]; commonalities: string[];
  memories: string[]; impression?: string;
}
export interface Meeting { id: string; at: string; place: string; memories: string[]; impression?: string; commonalities: string[] }
export interface PersonProfile {
  ownerId: UserId; personId: UserId; name: string;
  firstMetAt: string; firstMetPlace: string;
  facts: string[]; interests: string[]; commonalities: string[];
  impression?: string; meetings: Meeting[];
}
export interface Proposal {
  id: string; at: string; place: string; reason: string;
  status: "pending" | "accepted" | "declined";
  responses: Record<UserId, "yes" | "no" | null>;
}
export interface RelayLogLine { at: string; from: string; to: string; text: string }

// ---- web-only view types (what /api/state sends to the browser) ----

export const USERS = ["erin", "partner"] as const;

/** Proposal as one user may see it: never the other person's answer. */
export interface ProposalView {
  id: string; at: string; place: string; reason: string;
  status: "pending" | "accepted"; // "declined" is never sent
  myResponse: "yes" | "no" | null;
  usedMyPrivateNote: boolean;
}

export interface Ghost {
  id: string; name: string; lastSeenAt: string; daysSince: number;
  profile: PersonProfile;
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
