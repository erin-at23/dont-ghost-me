# Don't Ghost · web/ (partner's half)

## Who and when

- Team The Unghosted (Erin + partner) at Haunted Hacks, Oct 31 2026. Hacking 11:00 to 16:00 PT.
- Feature freeze 14:30. Submit on Builderbase by 15:40 (hard deadline 16:00). Top 8 give a 2-minute live demo.
- I am the partner. I own `web/` only: the Next.js app, its API routes, and the OpenAI prompts.
- Erin owns `../actors`, `../agents`, `../shared`, `../seed`.
- All code must be written today.

## Rules for Claude

- Edit files inside `web/` only. Never edit `../shared`, `../actors`, `../agents` or `../seed`. If something there must change, stop and tell me, so I can ask Erin.
- Always choose the simplest version that demos reliably. No auth, no real calendar, no production hardening.
- Work one block at a time. Finish each block by running its "Done when" check, then stop and report what passed and what I must do by hand.
- Commit after each block from `web/`: `git add -A . && git commit -m "web: <block name>"`. Never commit `.env.local`.
- Ask before adding any dependency not named in this file.
- Mobile-first, dark theme, one accent color, big readable text (it goes on a projector).

## Architecture decisions (these override the original plan)

1. **HTTPS for phones.** Browsers only allow the mic and camera on HTTPS pages (localhost is the exception). Phones open the app through an HTTPS tunnel (`cloudflared tunnel --url http://localhost:3000`, or ngrok). If Next.js blocks dev assets from the tunnel host, add it to `allowedDevOrigins` in `next.config`.
2. **The browser never calls actors.** Only API routes (server side) call Erin's generated Terse client. The browser polls `GET /api/state` every 1000 ms. No WebSockets in the browser.
3. **One data layer, two implementations.** `src/lib/backend.ts` exports a `Backend` interface, a `mockBackend` (in-memory, seeded from `src/mocks`), and a `liveBackend` (calls the generated client). `BACKEND=mock|live` in `.env.local` picks one through `getBackend()`. The UI only ever calls `/api/*`, so going live means changing one env var.
4. **Two hard-coded users.** Every page takes `?as=erin` or `?as=partner` (default `partner`), kept in a small React context and passed to every API call.
5. **No rejection anywhere in the UI.** "Not now" just hides the proposal. Never show "declined" or the other person's answer. The other person's "want to stay close" value is never sent to the browser.
6. **Audio format.** Record with `MediaRecorder` using the first supported of `audio/webm` and `audio/mp4` (iPhone Safari often only supports mp4). Send the file with the matching extension.
7. **Types.** Until `../shared/types.ts` exists, mirror the shared contract in `src/lib/types.ts`. Once it exists, import from it (enable importing outside the app folder in `next.config` if needed). Never change the contract.

**Pending (Erin confirms at 12:25):** matching becomes "same place at overlapping times," so `getFreeSlots` may be renamed `getPresence`. The UI only displays proposals, so it doesn't depend on this.

## Shared contract (Erin's, mirror only)

```ts
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
```

Actor calls (server side only, through the generated client): `User.get(id).setWantsClose(other, bool)`, `Person.get(\`${owner}:${person}\`).get()` / `.applyExtraction(x, {at, place})`, `Friendship.get("erin__partner").connect(a, b)` / `.get()` / `.respond(user, "yes"|"no")` / `.simulateDaysPassed(n)`.

## API routes (all JSON)

| Route | Method | Input | Returns |
| --- | --- | --- | --- |
| `/api/state` | GET | `?as=` | `{ me, other, friendship: {id, createdAt, lastSeenAt, daysSince, proposal, meetups}, relayLog, myProfileOfOther, ghosts, nudge? }` |
| `/api/connect` | POST | `{from, to}` | friendship |
| `/api/wants-close` | POST | `{as, other, value}` | `{ok}` |
| `/api/respond` | POST | `{as, answer}` | `{ok}` |
| `/api/transcribe` | POST | multipart audio file | `{text}` |
| `/api/extract` | POST | `{as, other, transcript, place}` | `Extraction` (also saved via `applyExtraction`) |
| `/api/brief` | POST | `{as, other}` | `{brief}` |
| `/api/demo/reset` | POST | none | `{ok}` |
| `/api/demo/simulate` | POST | `{days}` | `{ok}` |
| `/api/demo/find-time` | POST | `{as}` | `{ok}` (live mode calls Erin's agent at `AGENT_URL`) |

`/api/state` must strip anything private to the other user (their `wantsClose`, their profile of me).

## Screens, by priority

- **P0:** Home "Your people" (cards fade as days grow; past 21 days a card becomes a small ghost), Voice note, Live agents panel at `/agents` (big screen: each agent's messages in its own color, typing indicator), Proposal popup ("Your agents found a time..." with Yes / Not now), hidden Demo page at `/demo` (reset, simulate 21 days, Find time).
- **P1:** Person page (profile chips, impression, meeting timeline), Brief card on an accepted proposal.
- **P2:** Connect (show my QR for `/connect?from=<me>`, scan the other's), private "Want to stay close" toggle.

Build in priority order. If time runs short, cut from P2 upward.

## Blocks

### Block 1 · Setup and HTTPS check (12:00 to 12:20)

- Install `qrcode.react`, `html5-qrcode`, `openai`.
- Make sure `.env.local` has `OPENAI_API_KEY` (I add the value myself), `BACKEND=mock`, and an empty `AGENT_URL=`.
- Add a `/mic-test` page: one button records 3 seconds, then plays it back.
- Give me the exact commands to start the dev server and the HTTPS tunnel.
- **Done when:** on my phone, through the HTTPS tunnel URL, `/mic-test` records and plays back.

### Block 2 · Screens with mock data (12:20 to 13:00)

- `src/lib/types.ts`, `src/mocks` (8 ghost friends with `lastSeenAt` from 2 to 60 days ago, both users' profiles of each other, a sample `relayLog`, one pending proposal), the `Backend` interface, `mockBackend`, every API route in mock mode, a `usePoll` hook, and the `?as=` user switcher.
- Build the screens in P0, then P1, then P2 order.
- **Done when:** every screen is clickable on my phone with mock data, and with two phones (`?as=erin`, `?as=partner`), tapping Yes on one updates the other within 2 seconds.

### Block 3 · First live read (13:00 to 13:20, during lunch sync)

- Implement `liveBackend` for `GET /api/state` only, using Erin's generated client.
- **Done when:** with `BACKEND=live`, one real value from Erin's Friendship actor shows on screen.

### Block 4 · AI features (13:20 to 14:00)

- `/api/transcribe`: OpenAI transcription with `gpt-4o-mini-transcribe`, falling back to `whisper-1`. Test the model with one tiny request first; if it errors, use the current recommended transcription model.
- `/api/extract`: Structured Outputs with a JSON schema matching `Extraction`, on `gpt-4o-mini`. Prompt: "You help a college student remember people they meet. From this voice note, extract the other person's name, where they met, facts about them, interests, things they have in common with the speaker, memorable moments, and the speaker's impression. Use short phrases. Do not invent anything not said." Then save it with `applyExtraction`.
- `/api/brief`: prompt: "Write a warm 2-3 sentence brief before a student meets this friend. Remind them of the last thing they talked about and suggest one specific question to ask. Casual tone." Generate it once when a proposal is accepted, and cache it.
- Voice screen: progress states ("Listening...", "Remembering..."), chips animating in, and a "type it instead" fallback that uses the same extract endpoint.
- **Done when:** a real 10-second voice note on my phone becomes a saved profile that still shows after reloading.

### Block 5 · Thin end-to-end slice (14:00 to 14:30)

- Switch every route to `BACKEND=live`. Find time calls Erin's agent, the relay log appears on `/agents`, the proposal appears on both phones, both say yes, and the brief appears.
- **Done when:** the full flow works live once. 14:30 is the feature freeze: after that, polish and fixes only.

### Block 6 · Polish (14:30 to 15:15)

- Dark theme with one accent, a subtle ghost theme (not cheesy), fade-to-ghost and rise-back animations, a projector-readable `/agents` page, and the demo page tested.
- Test the full flow on two phones, twice.

### Block 7 · Backup and submission (15:15 to 15:40)

- I record the backup video. Help me write the submission: name, one-line pitch, problem, how it works, screenshots, repo link. Erin adds the Terse and Relay paragraph.

## Demo plan (context for design decisions)

- One QR scan and one live voice note on stage; the other profile is pre-seeded.
- A one-tap "I'm going" card or the demo page triggers Find time; nobody types on stage.
- The partner's seeded private note about Erin says she's stressed about midterms, so the agent suggests a study-break boba instead of a party. Only the partner's phone shows a small "used your private note" badge.
- Restart the actor server on stage; the UI keeps polling and recovers by itself.
