import { Actor, Emittable, Persisted } from "terse-sdk/actor"

// NOTE: types are duplicated from ../../shared/types.ts so the actor project stays self-contained.
type UserId = string
type CalendarEvent = { id: string; title: string; place: string; start: string; end: string }
type FreeSlot = { start: string; end: string; place: string }
type PersonSummary = { personId: string; name: string; metAt: string; metPlace: string; lastSeenAt: string; oneLiner?: string }
type Extraction = {
    name?: string; place?: string
    facts: string[]; interests: string[]; commonalities: string[]
    memories: string[]; impression?: string
}
type Meeting = { id: string; at: string; place: string; memories: string[]; impression?: string; commonalities: string[] }
type PersonProfile = {
    ownerId: string; personId: string; name: string
    firstMetAt: string; firstMetPlace: string
    facts: string[]; interests: string[]; commonalities: string[]
    impression?: string; meetings: Meeting[]
}
type Proposal = {
    id: string; at: string; place: string; reason: string
    status: "pending" | "accepted" | "declined"
    responses: Record<string, "yes" | "no" | null>
}
type RelayLogLine = { at: string; from: string; to: string; text: string }
type Nudge = { at: string; text: string }

const DAY = 24 * 60 * 60 * 1000
const daysBetween = (iso: string) => iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / DAY)) : 0
const uid = () => Math.random().toString(36).slice(2, 10)
const merge = (a: string[], b: string[] = []) => {
    const seen = new Set(a.map(s => s.toLowerCase()))
    return [...a, ...b.filter(s => s && !seen.has(s.toLowerCase()))]
}

/** One per human user. Key: "erin" | "partner". Holds calendar + private preferences. */
export class User extends Actor {
    @Persisted @Emittable calendar: CalendarEvent[] = []
    @Persisted @Emittable people: PersonSummary[] = []
    @Persisted wantsClose: Record<string, boolean> = {}
    @Persisted displayName = ""

    async getProfile() {
        return { id: this.id, displayName: this.displayName || this.id }
    }
    async setDisplayName(name: string) { this.displayName = name }

    async getCalendar() { return this.calendar }
    async setCalendar(events: CalendarEvent[]) {
        this.calendar = [...events].sort((a, b) => a.start.localeCompare(b.start))
        return this.calendar
    }
    async addEvent(e: CalendarEvent) {
        const ev = { ...e, id: e.id || uid() }
        this.calendar = [...this.calendar.filter(x => x.id !== ev.id), ev].sort((a, b) => a.start.localeCompare(b.start))
        return ev
    }
    async removeEvent(id: string) { this.calendar = this.calendar.filter(e => e.id !== id) }

    /** Where/when this user will be, future only, titles stripped. This is all an agent ever shares. */
    async getFreeSlots(): Promise<FreeSlot[]> {
        const now = Date.now() - 2 * 60 * 60 * 1000
        return this.calendar
            .filter(e => Date.parse(e.end) >= now)
            .map(e => ({ start: e.start, end: e.end, place: e.place }))
    }

    async setWantsClose(otherId: string, value: boolean) {
        this.wantsClose = { ...this.wantsClose, [otherId]: value }
        return value
    }
    async getWantsClose(otherId: string) { return this.wantsClose[otherId] ?? true } // default: open to reconnecting

    async getPeople() { return this.people }
    async upsertPerson(p: PersonSummary) {
        const existing = this.people.find(x => x.personId === p.personId)
        const next = existing ? { ...existing, ...p, metAt: existing.metAt, metPlace: existing.metPlace } : p
        this.people = [...this.people.filter(x => x.personId !== p.personId), next]
        return next
    }
    async touchPerson(personId: string, at: string) {
        this.people = this.people.map(x => x.personId === personId ? { ...x, lastSeenAt: at } : x)
    }
    async setPeople(people: PersonSummary[]) { this.people = people }
}

/** One per (owner, person). Key: "erin.partner". PRIVATE notebook about someone you met. */
export class Person extends Actor {
    @Persisted @Emittable profile: PersonProfile | null = null

    async get() { return this.profile }

    async applyExtraction(x: Extraction, ctx: { at?: string; place?: string } = {}) {
        const [ownerId, personId] = String(this.id).split(".")
        const at = ctx.at || new Date().toISOString()
        const place = ctx.place || x.place || "somewhere on campus"
        const p: PersonProfile = this.profile ?? {
            ownerId, personId, name: x.name || personId,
            firstMetAt: at, firstMetPlace: place,
            facts: [], interests: [], commonalities: [], meetings: [],
        }
        const meeting: Meeting = {
            id: uid(), at, place,
            memories: x.memories || [], impression: x.impression, commonalities: x.commonalities || [],
        }
        this.profile = {
            ...p,
            name: p.name && p.name !== personId ? p.name : (x.name || p.name),
            facts: merge(p.facts, x.facts),
            interests: merge(p.interests, x.interests),
            commonalities: merge(p.commonalities, x.commonalities),
            impression: x.impression || p.impression,
            meetings: [...p.meetings, meeting],
        }
        return this.profile
    }

    async reset() { this.profile = null }
}

/** One per friendship (created on mutual QR scan). Key: sorted ids joined by "__". */
export class Friendship extends Actor {
    @Persisted @Emittable members: string[] = []
    @Persisted @Emittable createdAt = ""
    @Persisted @Emittable lastSeenAt = ""
    @Persisted @Emittable daysSince = 0
    @Persisted @Emittable proposal: Proposal | null = null
    @Persisted @Emittable meetups: { at: string; place: string }[] = []
    @Persisted @Emittable relayLog: RelayLogLine[] = []
    @Persisted @Emittable nudge: Nudge | null = null
    @Persisted lastNudgeAt = ""


    async befriend(a: string, b: string) {
        if (!this.members.length) {
            const now = new Date().toISOString()
            this.members = [a, b].sort()
            this.createdAt = now
            this.lastSeenAt = now
        }
        this.daysSince = daysBetween(this.lastSeenAt || this.createdAt)
        this.alarm.set(Date.now() + 60_000)
        return this.get()
    }

    async get() {
        this.daysSince = daysBetween(this.lastSeenAt || this.createdAt)
        return {
            id: String(this.id), members: this.members, createdAt: this.createdAt,
            lastSeenAt: this.lastSeenAt, daysSince: this.daysSince,
            proposal: this.proposal, meetups: this.meetups, nudge: this.nudge,
        }
    }

    async propose(p: { at: string; place: string; reason: string }) {
        const responses: Record<string, null> = {}
        for (const m of this.members) responses[m] = null
        this.proposal = { id: uid(), at: p.at, place: p.place, reason: p.reason, status: "pending", responses }
        return this.proposal
    }

    async respond(userId: string, answer: "yes" | "no") {
        if (!this.proposal) return null
        const responses = { ...this.proposal.responses, [userId]: answer }
        const values = Object.values(responses)
        const status = values.includes("no") ? "declined" : values.every(v => v === "yes") ? "accepted" : "pending"
        this.proposal = { ...this.proposal, responses, status }
        return this.proposal
    }

    async recordMeetup(at: string, place: string) {
        this.meetups = [...this.meetups, { at, place }]
        this.lastSeenAt = at
        this.nudge = null
        this.daysSince = daysBetween(this.lastSeenAt || this.createdAt)
        return this.get()
    }

    async appendRelayLog(line: RelayLogLine) {
        this.relayLog = [...this.relayLog, { ...line, at: line.at || new Date().toISOString() }].slice(-50)
        return this.relayLog.length
    }
    async getRelayLog() { return this.relayLog }
    async clearRelayLog() { this.relayLog = [] }

    /** Demo helper: pretend n days passed since you last saw each other, then let the alarm decide. */
    async simulateDaysPassed(n: number) {
        this.lastSeenAt = new Date(Date.now() - n * DAY).toISOString()
        this.lastNudgeAt = ""
        this.daysSince = daysBetween(this.lastSeenAt || this.createdAt)
        this.alarm.set(Date.now() + 1500)
        return this.daysSince
    }

    /** The friendship wakes itself up and decides: nudge or hold. Max one nudge per day. */
    async onAlarm() {
        this.daysSince = daysBetween(this.lastSeenAt || this.createdAt)
        const recentlyNudged = this.lastNudgeAt && Date.now() - Date.parse(this.lastNudgeAt) < DAY
        if (this.daysSince >= 14 && !recentlyNudged) {
            const now = new Date().toISOString()
            this.nudge = { at: now, text: `It's been ${this.daysSince} days. Don't ghost — want your agents to find a time?` }
            this.lastNudgeAt = now
        }
        this.alarm.set(Date.now() + 6 * 60 * 60 * 1000)
    }

    async reset() {
        this.proposal = null; this.meetups = []; this.relayLog = []; this.nudge = null
        this.lastNudgeAt = ""; this.members = []; this.createdAt = ""; this.lastSeenAt = ""; this.daysSince = 0
    }
}
