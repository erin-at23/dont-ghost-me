# 👻 Don't Ghost Me

**Your AI agent remembers everyone you meet, and quietly works with their agent to get you back together before you become strangers again.**

Most college friendships don't end. They just fade. You meet someone great in week one, you both mean to hang out, and a month later you're nodding at each other across the dining hall.

Don't Ghost Me gives each person a private agent that remembers the people you meet, notices when a friendship is going quiet, and quietly works out a time and place where you'll both already be. Neither of you has to send the awkward "we should hang out sometime" text, and neither of you ever sees the other say no.

Built in 5 hours at **Haunted Hacks: Real-Time AI Edition** (YC, Oct 31, 2026) by The Unghosted: Erin Dai and Charlotte.

## How it works

1. **Connect.** Two people scan each other's QR code. That creates a shared friendship record.
2. **Remember.** After you meet someone, you record a short voice note ("met Erin at the kickoff, she's from Austin, we both love boba..."). It's transcribed and turned into a private profile: facts, interests, things you have in common, memorable moments, and your impression. Only you can see it.
3. **Notice.** The friendship tracks how long it's been since you last met. On your home screen, cards fade as the days add up (each with a candle that burns down) and turn into small ghosts after three weeks. A hand-drawn night map of campus shows where you met everyone, with the friends you're losing floating away as ghosts. The friendship wakes itself up on a timer and posts a nudge when it's been too long.
4. **Negotiate.** Your agent and your friend's agent talk to each other. They share only *where and when* each person will be, never calendar titles, never private notes. When they find an overlap, each agent uses its owner's private notes to suggest something that fits. If your note says your friend is buried in midterms, the suggestion becomes a low-key boba break instead of a party. The invite shows a 🤫 "Used your private note" badge, but never says what the note was.
5. **Propose.** Both people get the same invite: "Your agents found a time." You can tap **Yes** or **Not now**. "Not now" just hides the invite. Nobody is ever told the other person passed.
6. **Brief.** When you both say yes, each of you gets a short, private brief written from your own notes: what you talked about last time and one good question to ask.

## Privacy model

Privacy rules were part of the design from the start:

- Private profiles (`Person` actors) are keyed by owner and are only ever read for their owner.
- Agents exchange free/busy *slots* (start, end, place). Event titles are stripped before anything leaves a user's actor.
- Each person's "want to stay close" setting and their answer to a proposal are filtered out server-side before state reaches the other person's browser.
- Declined proposals are never sent to the UI at all.
- The browser never talks to the actors directly. Every call goes through the Next.js API routes, which do the filtering.

## Architecture

```
 phone (Next.js UI)  ──poll /api/state every 1s──▶  Next.js API routes  ──▶  Terse actors
                                                         │                  (User, Person, Friendship)
                                                         │                        ▲
                                                         └── POST /find-time ──▶ agents ──┘
                                                                                   │
                                                                         Agent Relay (agent ↔ agent)
```

- **`actors/`**: durable actors on [Terse](https://useterse.ai).
  - `User`: one per person. Holds the calendar, friends list and private preferences, and exposes `getFreeSlots()`.
  - `Person`: one per (owner, person) pair, keyed `owner.person`. Holds the private profile and merges new voice-note extractions into it.
  - `Friendship`: one per pair. Holds days since you last met, the current proposal, past meetups and the agents' conversation log, and runs an alarm that decides when to nudge.
- **`agents/`**: two agents, one per user, that negotiate over Agent Relay (`@agent-relay/sdk`). They find same-place, overlapping-time slots, draft an idea from their owner's private notes, merge the two ideas into an invite that's safe to show both people, and write the proposal back to the `Friendship` actor. If Relay is unreachable they fall back to an in-process bus, so the demo can't stall on the network.
- **`web/`**: a Next.js 16 app (App Router, Tailwind v4) and its API routes.
  - All actor calls happen server side in `src/lib/backend.ts`, behind a small `Backend` interface with an in-memory mock and a live implementation. `BACKEND=mock|live` picks one.
  - The UI polls once a second instead of holding a socket open, so it recovers by itself when the actor server restarts.
- **`shared/types.ts`**: the contract both halves code against.

### AI

| Feature | Model | Notes |
| --- | --- | --- |
| Voice note transcription | `gpt-4o-mini-transcribe`, falling back to `whisper-1` | Records `audio/webm` or `audio/mp4` (iPhone Safari) with `MediaRecorder` |
| Profile extraction | `gpt-4o-mini`, Structured Outputs | Strict JSON schema matching `Extraction`; told not to invent anything |
| Pre-meetup brief | `gpt-4o-mini` | Generated once per accepted proposal, then cached |
| Agent ideas and invite text | `gpt-4o-mini` | Private notes go into the prompt but are never quoted in the output |

Each AI call has a non-AI fallback, so a failed request degrades the result instead of breaking the flow.

## Running it locally

You need Node 22+, [Bun](https://bun.sh) 1.4.2+, the Terse CLI, and an OpenAI API key. Phones need HTTPS to use the mic and camera, so we use a Cloudflare tunnel.

**1. Actors**

```bash
cd actors
bun install
terse actor dev            # local server on http://127.0.0.1:7100
```

**2. Agents** (in a second terminal)

```bash
cd agents
bun install
terse actor generate       # generates the typed actor client
bun seed.ts                # demo users, calendars, friends and one private note
OPENAI_API_KEY=... bun agent.ts   # agents + HTTP on :8787
```

**3. Web app** (in a third terminal)

```bash
cd web
npm install
cat > .env.local <<'EOF'
OPENAI_API_KEY=sk-...
BACKEND=live               # or "mock" to run the UI with no actors at all
AGENT_URL=http://localhost:8787
# Only needed for deployed actors (local dev needs neither):
# TERSE_ACTOR_URL=https://api.useterse.ai/<project>/actors
# TERSE_API_KEY=...
EOF
npm run dev
```

**4. HTTPS for phones**

```bash
cloudflared tunnel --url http://localhost:3000
```

Open the printed `https://*.trycloudflare.com` URL on two phones, one with `?as=erin` and one with `?as=partner`.

## Pages

| Path | What it is |
| --- | --- |
| `/` | Your people: friend cards that fade over time, the campus map, the invite popup, the brief |
| `/voice` | Record (or type) a note about someone you just met |
| `/person?id=…` | Your private profile of someone, with a timeline of your meetings |
| `/connect` | Show your QR code or scan theirs |
| `/agents` | Big-screen view of the two agents talking over the campus map, for the projector |
| `/demo` | Demo controls: reset, simulate 21 days, find a time |

## What we'd do next

- Real calendar sync (Google/Outlook) instead of seeded calendars.
- Real accounts instead of two hard-coded demo users.
- Group friendships, not just pairs.
- Push notifications instead of polling.

## Team

- **Erin Dai**: actors, agents, shared contract, seed data, product, design
- **Charlotte**: web app, API routes, OpenAI prompts, UI
