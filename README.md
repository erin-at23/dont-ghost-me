# 👻 Don't Ghost Me

**Your AI agent remembers everyone you meet, and quietly works with their agent to get you back together before you become strangers again.**

Most college friendships don't end. They just fade. You meet someone great in week one, you both mean to hang out, and a month later you're nodding at each other across the dining hall.

It starts in college, but it doesn't stop there. The same thing happens to anyone who meets a lot of people at once: the people you meet **at a hackathon like this one**, at a conference, in your first week at a new job, in a new city, at a summer program. You trade names, have a great conversation, and never see each other again.

Don't Ghost Me gives each person a private agent that remembers the people you meet, notices when a friendship is going quiet, and quietly works out a time and place where you'll both already be. Neither of you has to send the awkward "we should hang out sometime" text, and neither of you ever sees the other say no.

Built in 5 hours at **Haunted Hacks: Real-Time AI Edition** (YC, Oct 31, 2026) by The Unghosted: Erin Dai and Charlotte.

## How it works

1. **Connect.** Two people scan each other's QR code. That creates a shared friendship record.
2. **Remember.** After you meet someone, you record a short voice note ("met Erin at the kickoff, she's from Austin, we both love boba..."). It's transcribed and turned into a private profile: facts, interests, things you have in common, memorable moments, and your impression. Only you can see it.
3. **Notice.** The friendship tracks how long it's been since you last met. On your home screen, cards fade as the days add up (each with a candle that burns down) and turn into small ghosts after three weeks. A hand-drawn night map of campus shows where you met everyone, with the friends you're losing floating away as ghosts. The friendship wakes itself up on a timer and posts a nudge when it's been too long.
4. **Negotiate.** Your agent and your friend's agent talk to each other. They share only *where and when* each person will be, never calendar titles, never private notes. When they find an overlap, each agent uses its owner's private notes to suggest something that fits. If your note says your friend is buried in midterms, the suggestion becomes a low-key boba break instead of a party. The invite shows a 🤫 "Used your private note" badge, but never says what the note was.
5. **Propose.** Both people get the same invite: "Your agents found a time." You can tap **Yes** or **Not now**. "Not now" just hides the invite. Nobody is ever told the other person passed.
6. **Brief.** When you both say yes, each of you gets a short, private brief written from your own notes: what you talked about last time and one good question to ask.

## 🏆 How we use Terse Durable Actors

Every person, every private notebook and every friendship is its own long-lived actor. It remembers for months, wakes itself up, and pushes updates to the UI. Code: [`actors/src/actors.ts`](actors/src/actors.ts).

| Actor | Key | Why it's an actor |
| --- | --- | --- |
| `User` | `erin`, `partner` | Your calendar, your people list, and your *private* "want to stay close" choices. `getFreeSlots()` returns only where and when, with titles stripped. That's all an agent ever sees. |
| `Person` | `owner.person` (e.g. `erin.partner`) | Your **private notebook** about one person. `applyExtraction()` merges each voice note and appends a meeting. There's one actor per *direction*, so Erin's notes about Charlotte and Charlotte's notes about Erin are separate and private. |
| `Friendship` | `erin__partner` | Shared state for a pair: the proposal (`propose` / `respond`), the agents' conversation log, days since you last met, and a **self-scheduled alarm** (`onAlarm`). The friendship decides on its own whether to nudge (14+ days, at most once a day) or stay quiet. |

What we rely on:

- **`@Persisted` state:** profiles, diaries and proposals survive server restarts. We show this live in the demo by restarting the server.
- **Alarms:** friendships wake themselves up. No cron job, no scanning a database for stale rows.
- **One actor per entity:** each friendship has its own memory and timer, so millions of independent friendships scale without a central scheduler.

## 🏆 How we use Agent Relay

Two agents, one per person, **negotiate directly with each other** over Agent Relay. No human relays messages between them. Code: [`agents/agent.ts`](agents/agent.ts).

- Both agents register in a Relay workspace (`relay.workspace.register`) and talk in a shared `#unghosted` channel.
- **The negotiation** (4 messages, shown live on the `/agents` screen):
  1. **Erin's agent → Charlotte's agent:** where and when Erin will be (times and places only).
  2. **Charlotte's agent:** checks that Charlotte privately wants to stay close, finds the overlap, privately reads *Charlotte's* notes, and suggests an idea.
  3. **Erin's agent:** reads *Erin's* private notes, merges both ideas into one invite that's safe for both people to see, and calls `Friendship.propose()`.
  4. **Charlotte's agent:** confirms.
- **The information boundary is the point.** Each agent can only read its own owner's actors, so private context shapes the plan without ever crossing to the other side. That's why this is two agents talking, not one query over a shared database.
- Negotiations start **automatically** when both calendars put two friends at the same place and time, or on demand with `POST /find-time`.

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
| Agent ideas and invite text | `gpt-4o-mini` | Private notes shape the idea; the prompt tells the model not to reveal them in the shared invite |

Each AI call has a non-AI fallback, so a failed request degrades the result instead of breaking the flow.

## Running it locally

You need Node 22+, [Bun](https://bun.sh) 1.4.2+, the Terse CLI, and an OpenAI API key. Phones need HTTPS to use the mic and camera, so we use a Cloudflare tunnel.

**1. Actors**

```bash
cd actors
bun install
terse actor dev            # local server on http://127.0.0.1:7100
```

To use deployed actors instead, run `terse deploy` and set `TERSE_ACTOR_URL` and `TERSE_API_KEY` for both the agents (`agents/.env`) and the web app (`web/.env.local`).

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

Open the printed `https://*.trycloudflare.com` URL on two phones, one with `?as=erin` and one with `?as=charlotte`. (Internally Charlotte's user id is `partner`; old `?as=partner` links still work.)

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
- Event mode for hackathons and conferences: everyone you met that weekend, with agents that keep finding times afterward.
- Push notifications instead of polling.

## Team

- **Erin Dai**: actors, agents, shared contract, seed data, product, design
- **Charlotte**: web app, API routes, OpenAI prompts, UI
