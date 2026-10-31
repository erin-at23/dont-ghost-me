// Typed client for Erin's actors (../actors/src/actors.ts), server side only.
// Hand-written equivalent of `terse actor generate`: same terse-sdk runtime, just the method
// list written out. If Erin changes an actor's public methods, update the list here.
// Server address: TERSE_ACTOR_URL (default http://127.0.0.1:7100/v1/projects/local/actors).
import { createActorStub } from "terse-sdk/actors";
import type { CalendarEvent, Extraction, FreeSlot, Nudge, PersonProfile, PersonSummary, Proposal, RelayLogLine } from "./types";

type M = { name: string; result: "void" | "value" };
const v = (...names: string[]): M[] => names.map((name) => ({ name, result: "value" }));

export interface UserStub {
  getProfile(): Promise<{ id: string; displayName: string }>;
  setDisplayName(name: string): Promise<void>;
  getCalendar(): Promise<CalendarEvent[]>;
  getFreeSlots(): Promise<FreeSlot[]>;
  setWantsClose(otherId: string, value: boolean): Promise<boolean>;
  getWantsClose(otherId: string): Promise<boolean>;
  getPeople(): Promise<PersonSummary[]>;
  touchPerson(personId: string, at: string): Promise<void>;
}

export interface PersonStub {
  get(): Promise<PersonProfile | null>;
  applyExtraction(x: Extraction, ctx?: { at?: string; place?: string }): Promise<PersonProfile>;
  reset(): Promise<void>;
}

export interface FriendshipView {
  id: string; members: string[]; createdAt: string; lastSeenAt: string; daysSince: number;
  proposal: Proposal | null; meetups: { at: string; place: string }[]; nudge: Nudge | null;
}

export interface FriendshipStub {
  befriend(a: string, b: string): Promise<FriendshipView>;
  get(): Promise<FriendshipView>;
  respond(userId: string, answer: "yes" | "no"): Promise<Proposal | null>;
  recordMeetup(at: string, place: string): Promise<FriendshipView>;
  getRelayLog(): Promise<RelayLogLine[]>;
  clearRelayLog(): Promise<void>;
  simulateDaysPassed(n: number): Promise<number>;
  reset(): Promise<void>;
}

const USER = v("getProfile", "setDisplayName", "getCalendar", "getFreeSlots", "setWantsClose", "getWantsClose", "getPeople", "touchPerson");
const PERSON = v("get", "applyExtraction", "reset");
const FRIENDSHIP = v("befriend", "get", "respond", "recordMeetup", "getRelayLog", "clearRelayLog", "simulateDaysPassed", "reset");

export const actors = {
  User: { get: (id: string) => createActorStub<UserStub>("User", id, USER) },
  /** Key is "owner.person", e.g. "partner.erin". */
  Person: { get: (key: string) => createActorStub<PersonStub>("Person", key, PERSON) },
  /** Key is the sorted ids joined by "__", e.g. "erin__partner". */
  Friendship: { get: (id: string) => createActorStub<FriendshipStub>("Friendship", id, FRIENDSHIP) },
};
