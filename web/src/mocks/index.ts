import type { PersonProfile, Proposal, RelayLogLine, UserId } from "@/lib/types";

// Display names. Change here if the partner's name should differ.
export const NAMES: Record<UserId, string> = { erin: "Erin", partner: "Charlotte" };

const DAY = 86_400_000;
export const daysAgo = (d: number, from = Date.now()) => new Date(from - d * DAY).toISOString();
export const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

/** Tomorrow at 15:30 server-local time. */
export function tomorrowAt(hour = 15, minute = 30) {
  const d = new Date(Date.now() + DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export interface MockGhost {
  id: string; name: string; lastSeenAt: string; profile: PersonProfile;
}

export interface MockWorld {
  wantsClose: Record<UserId, Record<UserId, boolean>>;
  friendship: {
    id: string; createdAt: string; lastSeenAt: string; connected: boolean;
    proposal: Proposal | null;
    /** Whose private note the agents used for this proposal (only that user sees the badge). */
    proposalUsedNoteOf: UserId | null;
    meetups: { at: string; place: string }[];
  };
  profiles: Record<string, PersonProfile>; // key `${owner}:${person}`
  relayLog: RelayLogLine[];
  relayTyping: string | null;
  ghosts: Record<UserId, MockGhost[]>;
  briefs: Record<string, string>; // key `${proposalId}:${as}`
}

function ghost(owner: UserId, id: string, name: string, days: number, place: string,
  facts: string[], interests: string[], impression: string): MockGhost {
  const at = daysAgo(days);
  return {
    id, name, lastSeenAt: at,
    profile: {
      ownerId: owner, personId: id, name,
      firstMetAt: daysAgo(days + 30), firstMetPlace: place,
      facts, interests, commonalities: [], impression,
      meetings: [{ id: `${id}-m1`, at, place, memories: [facts[0]], commonalities: [] }],
    },
  };
}

function ghostsFor(owner: UserId): MockGhost[] {
  return [
    ghost(owner, `${owner}-maya`, "Maya", 2, "CS 106B section", ["TA for 106B", "From Seattle"], ["climbing", "jazz"], "Funny, very direct"),
    ghost(owner, `${owner}-jordan`, "Jordan", 5, "Dorm floor", ["Pre-med", "Has a corgi at home"], ["running", "cooking"], "Always up early"),
    ghost(owner, `${owner}-priya`, "Priya", 9, "Hackathon last spring", ["Builds synth plugins", "Junior in EE"], ["music production", "robotics"], "Thinks out loud, great to build with"),
    ghost(owner, `${owner}-sam`, "Sam", 14, "Intro to Film", ["Wants to direct", "Works at the library"], ["film", "photography"], "Quiet until you get them talking"),
    ghost(owner, `${owner}-leo`, "Leo", 20, "Ultimate frisbee", ["Team captain", "From Lisbon"], ["frisbee", "surfing"], "Big energy"),
    ghost(owner, `${owner}-ava`, "Ava", 27, "Coffee line at CoHo", ["Econ major", "Plays cello"], ["cello", "board games"], "Warm, remembers everything"),
    ghost(owner, `${owner}-diego`, "Diego", 40, "Orientation week", ["From Mexico City", "Studying symbolic systems"], ["chess", "tacos"], "Easy to talk to"),
    ghost(owner, `${owner}-noor`, "Noor", 60, "Summer research program", ["Studies marine biology", "Dives"], ["ocean", "poetry"], "Thoughtful, a little shy"),
  ];
}

export function seedWorld(): MockWorld {
  const erinAgent = `${NAMES.erin}'s agent`;
  const partnerAgent = `${NAMES.partner}'s agent`;
  const lastSeenAt = daysAgo(6);
  const proposal: Proposal = {
    id: "p-seed",
    at: tomorrowAt(15, 30),
    place: "Boba Guys near Tresidder",
    reason: "You're both near Tresidder tomorrow afternoon. A quick study-break boba fits a busy week.",
    status: "pending",
    responses: { erin: null, partner: null },
  };
  return {
    wantsClose: { erin: { partner: true }, partner: { erin: true } },
    friendship: {
      id: "erin__partner",
      createdAt: daysAgo(35),
      lastSeenAt,
      connected: true,
      proposal,
      proposalUsedNoteOf: "partner",
      meetups: [{ at: daysAgo(35), place: "Haunted Hacks kickoff" }, { at: lastSeenAt, place: "Green Library" }],
    },
    profiles: {
      "partner:erin": {
        ownerId: "partner", personId: "erin", name: NAMES.erin,
        firstMetAt: daysAgo(35), firstMetPlace: "Haunted Hacks kickoff",
        facts: ["CS major", "Grew up in Austin", "Runs a Terse actor server"],
        interests: ["distributed systems", "boba", "horror movies"],
        commonalities: ["both love boba", "both in CS 161"],
        impression: "Stressed about midterms lately, could use a low-key break", // private note
        meetings: [
          { id: "m1", at: daysAgo(35), place: "Haunted Hacks kickoff", memories: ["Teamed up in five minutes", "Argued about tabs vs spaces"], commonalities: ["both love boba"] },
          { id: "m2", at: lastSeenAt, place: "Green Library", memories: ["Studied for the CS 161 midterm", "She recommended a horror podcast"], commonalities: ["both in CS 161"] },
        ],
      },
      "erin:partner": {
        ownerId: "erin", personId: "partner", name: NAMES.partner,
        firstMetAt: daysAgo(35), firstMetPlace: "Haunted Hacks kickoff",
        facts: ["Design + CS", "Has a film camera", "From the Bay Area"],
        interests: ["photography", "UI design", "hiking"],
        commonalities: ["both love boba", "both in CS 161"],
        impression: "Great taste, calm under pressure",
        meetings: [
          { id: "m1", at: daysAgo(35), place: "Haunted Hacks kickoff", memories: ["Sketched the whole UI on a napkin"], commonalities: ["both love boba"] },
          { id: "m2", at: lastSeenAt, place: "Green Library", memories: ["Shared notes for the CS 161 midterm"], commonalities: ["both in CS 161"] },
        ],
      },
    },
    relayLog: sampleRelay(erinAgent, partnerAgent, daysAgo(0.02)),
    relayTyping: null,
    ghosts: { erin: ghostsFor("erin"), partner: ghostsFor("partner") },
    briefs: {},
  };
}

/** The scripted agent conversation (used for the seed and for mock Find time). */
export function relayScript(a: string, b: string): Omit<RelayLogLine, "at">[] {
  return [
    { from: a, to: b, text: `${NAMES.erin} and ${NAMES.partner} haven't met up in a while. Any overlap in the next two days?` },
    { from: b, to: a, text: `${NAMES.partner} will be around Tresidder tomorrow, 3 to 5 pm.` },
    { from: a, to: b, text: `${NAMES.erin} is near Tresidder too, 3:30 to 4:30. That overlaps.` },
    { from: b, to: a, text: "Let's keep it short and low-key this week. Nothing loud." },
    { from: a, to: b, text: "Study-break boba at Boba Guys, 3:30 pm?" },
    { from: b, to: a, text: "Perfect. Sending the proposal to both of them." },
  ];
}

function sampleRelay(a: string, b: string, startIso: string): RelayLogLine[] {
  const start = new Date(startIso).getTime();
  return relayScript(a, b).map((l, i) => ({ ...l, at: new Date(start + i * 4000).toISOString() }));
}
