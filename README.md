# 👻 Don't Ghost Me

**Your AI agent remembers everyone you meet, and quietly works with their agent to get you back together before you become strangers again.**

Built in 5 hours at **Haunted Hacks: Real-Time AI Edition** (YC, Oct 31 2026) by Erin Dai & Charlotte, team *The Unghosted*.

---

## The problem
Freshmen meet hundreds of people in the first month, and most become strangers again within weeks. We forget the details, asking someone to hang out feels awkward, and we miss the moments when we're both at the same place.

## What it does
1. **Meet.** Scan each other's QR code. That's mutual consent, and it creates a shared Friendship.
2. **Voice note.** Say 10 seconds about them. AI turns it into a *private* profile: facts, interests, what you have in common, your impression.
3. **Your agents negotiate.** Each person has an AI agent. Over **Agent Relay**, the agents compare *only times and places* (never calendars, never notes) and notice when you'll both be somewhere.
4. **Private context, never revealed.** Charlotte's agent knows (privately) that Erin is stressed about midterms, so it suggests a *low-key boba break* without saying why. The UI shows a 🤫 "Used your private note" badge.
5. **Both say yes** and you get a **pre-meeting brief**: "Last time you talked about her climbing comp. Ask how it went."
6. **Friendships that wake themselves up.** Every friendship is a durable actor with its own alarm. If too many days pass, it decides whether to nudge you or wait (max one nudge a day).
7. **See it.** Friends you're losing fade, and after 3 weeks they literally float away as ghosts on your map. Each card has a candle that burns down with time.

## How it works

```
 Phone (Next.js)  ── voice ──▶ OpenAI (transcribe + extract) ──▶ Person actor (private notes)
       │
       ├── QR scan ─────────────────────────────────────────────▶ Friendship actor (shared state + alarm)
       │
       └── live UI ◀── emitted state ── Terse durable actors: User · Person · Friendship
                                              ▲
             Erin's agent ◀── Agent Relay #unghosted ──▶ Charlotte's agent
             (reads only Erin's actors)                 (reads only Charlotte's actors)
```

| Piece | Tech | What it does |
|---|---|---|
| `actors/` | **Terse durable actors** | `User` (calendar, people, private stay-close choices), `Person` (your private notebook about someone, keyed `owner.person`), `Friendship` (proposal, agent chat log, days-since, nudge **alarm**). State persists across restarts. |
| `agents/` | **Agent Relay SDK** + OpenAI | Two registered agents negotiate in a Relay channel: share where/when (titles stripped) → find overlap → each privately reads its owner's notes → agree on one invite that's safe for both → `Friendship.propose()`. Auto-triggers when both calendars share a place and time; also `POST /find-time`. |
| `web/` | Next.js, Tailwind, OpenAI | Voice note → transcription → structured extraction, live agent chat screen, proposal popup, pre-meeting brief, QR connect, hand-drawn night map, demo controls. |
| `shared/` | TypeScript | The contract both halves build against. |

## Privacy by design
- Your notes and impressions are **private forever**; the other person never sees them.
- Agents exchange **only times and places**, never calendar titles or notes.
- Reconnecting needs **both** people to want it, so nobody gets rejected.

## Run it
```bash
# 1. Actors (or `terse deploy` and put TERSE_ACTOR_URL / TERSE_API_KEY in agents/.env)
cd actors && bun install && terse actor dev

# 2. Agents  (agents/.env: OPENAI_API_KEY, optional RELAY_WORKSPACE_KEY)
cd agents && bun install && terse actor generate && bun seed.ts && bun agent.ts

# 3. Web
cd web && npm install && npm run dev        # http://localhost:3000
#    /?as=erin  /?as=partner  /agents (big screen)  /demo (controls)
```

## Team
- **Erin Dai**: Terse actors, Agent Relay agents, product, design
- **Charlotte**: web app, voice → memory pipeline, live UI
