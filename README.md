# Don't Ghost — The Unghosted

- actors/  Terse durable actors: User, Person (key "owner.person"), Friendship (key "erin__partner")
- agents/  Two Agent Relay agents that negotiate meetups (agent.ts), seed.ts, smoke.ts
- shared/  types.ts contract
- seed/    users.json, ghosts.json
- web/     Next.js app (partner)

Run: (1) actors: `terse actor dev`  (2) agents: `terse actor generate && bun seed.ts && bun agent.ts`  (3) test: `bun smoke.ts`
Agent HTTP: POST http://localhost:8787/find-time {"from":"erin","to":"partner"}. Agents also auto-negotiate when both calendars share a place+time.
