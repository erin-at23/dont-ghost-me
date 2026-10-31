// Shared contract for The Unghosted ("Don't Ghost"). Announce changes before pushing.
export type UserId = string // "erin" | "partner"

export interface CalendarEvent {
  id: string; title: string; place: string
  start: string; end: string // ISO
}
// Where/when someone will be. Never includes titles.
export interface FreeSlot { start: string; end: string; place: string }

export interface Extraction { // produced by the partner's /api/extract
  name?: string; place?: string
  facts: string[]; interests: string[]; commonalities: string[]
  memories: string[]; impression?: string
}

export interface Meeting {
  id: string; at: string; place: string
  memories: string[]; impression?: string; commonalities: string[]
}

export interface PersonProfile { // PRIVATE to ownerId
  ownerId: UserId; personId: UserId; name: string
  firstMetAt: string; firstMetPlace: string
  facts: string[]; interests: string[]; commonalities: string[]
  impression?: string; meetings: Meeting[]
}

// Lightweight index of everyone a user has met (for the Home list). ADDED to contract.
export interface PersonSummary {
  personId: UserId; name: string; metAt: string; metPlace: string
  lastSeenAt: string; oneLiner?: string
}

export interface Proposal {
  id: string; at: string; place: string
  reason: string // safe to show both people
  status: "pending" | "accepted" | "declined"
  responses: Record<UserId, "yes" | "no" | null>
  usedNoteOf?: UserId // whose private note shaped the idea (badge). Private note text is never included.
}

export interface RelayLogLine { at: string; from: string; to: string; text: string }

export interface Nudge { at: string; text: string }

export interface FriendshipState {
  id: string // sorted member ids joined by "__", e.g. "erin__partner"
  members: [UserId, UserId]
  createdAt: string; lastSeenAt: string
  wantsClose: Record<UserId, boolean> // never shown to the other member's UI
  proposal?: Proposal; meetups: { at: string; place: string }[]
  lastNudgeAt?: string
}

export const friendshipId = (a: UserId, b: UserId) => [a, b].sort().join("__")
