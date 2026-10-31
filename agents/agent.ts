// Two Agent Relay agents (one per user) that negotiate meetups using private context.
// Run: bun agent.ts      (needs terse actor dev running; optional env RELAY_WORKSPACE_KEY, OPENAI_API_KEY)
import { EventEmitter } from "node:events"
import OpenAI from "openai"
import { actors } from "./generated"

type Slot = { start: string; end: string; place: string }
type Payload = { conv: string; type: "hello" | "overlap" | "agree" | "decline" | "done"; slots?: Slot[]; slot?: Slot; idea?: string; reason?: string }
type Bus = { send(from: string, to: string, text: string, data: Payload): Promise<void>; on(handle: string, fn: (from: string, data: Payload) => void): void; mode: string }

const USERS = ["erin", "partner"]
const fid = (a: string, b: string) => [a, b].sort().join("__")
const key = process.env.OPENAI_API_KEY || ""
let openai: OpenAI | null = key.startsWith("sk-") && key.length > 20 ? new OpenAI() : null
if (!openai) console.warn("No valid OPENAI_API_KEY: using simple built-in suggestions.")
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
const fmt = (iso: string) => new Date(iso).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" })
const nameOf = async (u: string) => (await actors.User.get(u).getProfile()).displayName
const agentName = (u: string) => `${u}-agent`

// ---------- Transport: real Agent Relay, with a local fallback so the demo never dies ----------
async function makeBus(): Promise<Bus> {
  const DATA = "\n⁣"
  try {
    const { AgentRelay } = await import("@agent-relay/sdk")
    let relay: any
    if (process.env.RELAY_WORKSPACE_KEY) relay = new AgentRelay({ workspaceKey: process.env.RELAY_WORKSPACE_KEY })
    else {
      relay = await AgentRelay.createWorkspace({ name: "unghosted" })
      console.log(`\nCreated Relay workspace. Save this to reuse it:\n  export RELAY_WORKSPACE_KEY=${relay.workspaceKey}\n`)
    }
    const clients: Record<string, any> = {}
    for (const u of USERS) {
      clients[u] = await relay.workspace.register({ name: agentName(u), type: "agent" })
      try { await clients[u].channels.create({ name: "unghosted", topic: "Agents negotiating meetups" }) } catch {}
      try { await clients[u].channels.join("unghosted") } catch {}
    }
    const handlers: Record<string, (from: string, d: Payload) => void> = {}
    relay.addListener("message.created", ({ message, envelope }: any) => {
      if (envelope?.channel?.name !== "unghosted") return
      const text: string = message?.text || ""
      const i = text.indexOf(DATA); if (i < 0) return
      const from = (envelope?.from?.name || envelope?.from?.handle || "").replace(/^@/, "")
      const data = JSON.parse(text.slice(i + DATA.length)) as Payload & { to: string }
      const h = handlers[data.to]; if (h && from !== data.to) h(from, data)
    })
    return {
      mode: "Agent Relay",
      async send(from, to, text, data) { await clients[from.replace("-agent", "")].sendMessage({ to: "#unghosted", text: text + DATA + JSON.stringify({ ...data, to }) }) },
      on(handle, fn) { handlers[handle] = fn },
    }
  } catch (e: any) {
    console.warn("Agent Relay unavailable, using LOCAL bus:", e?.message || e)
    const em = new EventEmitter()
    return {
      mode: "local (fallback)",
      async send(from, to, _text, data) { setTimeout(() => em.emit(to, from, data), 50) },
      on(handle, fn) { em.on(handle, fn) },
    }
  }
}

// ---------- Helpers ----------
function overlaps(a: Slot[], b: Slot[]): Slot[] {
  const out: Slot[] = []
  for (const x of a) for (const y of b) {
    if (x.place.trim().toLowerCase() !== y.place.trim().toLowerCase()) continue
    const s = Math.max(Date.parse(x.start), Date.parse(y.start)), e = Math.min(Date.parse(x.end), Date.parse(y.end))
    if (s < e) out.push({ start: new Date(s).toISOString(), end: new Date(e).toISOString(), place: x.place })
  }
  return out.sort((p, q) => p.start.localeCompare(q.start))
}

async function privateIdeaRaw(owner: string, other: string, slot: Slot): Promise<string> {
  const p: any = await actors.Person.get(`${owner}.${other}`).get()
  const shared = [...(p?.commonalities || []), ...(p?.interests || [])].slice(0, 6)
  const fallback = shared.length ? `${shared[0]} near ${slot.place}` : `grab food at ${slot.place}`
  if (!openai) return fallback
  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a friendly scheduling agent for a college student. Suggest ONE short, specific activity (max 12 words) for two friends meeting at the given place and time. Use only shared interests. Never reveal private notes, impressions, or feelings." },
      { role: "user", content: `Place: ${slot.place}. Time: ${fmt(slot.start)}. Shared interests/commonalities: ${shared.join(", ") || "unknown"}. Private context (do NOT reveal): ${p?.impression || ""}; ${(p?.facts || []).join(", ")}` },
    ],
  })
  return r.choices[0].message.content?.trim() || fallback
}

async function safeReasonRaw(ideaA: string, ideaB: string, slot: Slot): Promise<string> {
  if (!openai) return `You'll both be at ${slot.place}. Idea: ${ideaB}.`
  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "Merge two activity ideas into one warm one-sentence meetup invite (max 22 words) shown to BOTH friends. Mention that they'll both be at the place. No private info." },
      { role: "user", content: `Place: ${slot.place}, time ${fmt(slot.start)}. Idea A: ${ideaA}. Idea B: ${ideaB}.` },
    ],
  })
  return r.choices[0].message.content?.trim() || `You'll both be at ${slot.place}. ${ideaB}`
}

async function privateIdea(owner: string, other: string, slot: Slot) {
  try { return await privateIdeaRaw(owner, other, slot) } catch (e: any) { console.warn("OpenAI failed, using fallback:", e?.message); openai = null; return privateIdeaRaw(owner, other, slot) }
}
async function safeReason(a: string, b: string, slot: Slot) {
  try { return await safeReasonRaw(a, b, slot) } catch (e: any) { console.warn("OpenAI failed, using fallback:", e?.message); openai = null; return safeReasonRaw(a, b, slot) }
}

// ---------- Agents ----------
const bus = await makeBus()
const busy = new Set<string>()

async function say(fromU: string, toU: string, text: string, data: Payload) {
  const f = actors.Friendship.get(fid(fromU, toU))
  await f.appendRelayLog({ at: new Date().toISOString(), from: `${await nameOf(fromU)}'s agent`, to: `${await nameOf(toU)}'s agent`, text })
  console.log(`[${bus.mode}] ${agentName(fromU)} → ${agentName(toU)}: ${text}`)
  await bus.send(agentName(fromU), agentName(toU), text, data)
  await sleep(1200)
}

export async function findTime(a: string, b: string) {
  const conv = `${fid(a, b)}-${Date.now()}`
  if (busy.has(fid(a, b))) return { ok: false, reason: "already negotiating" }
  busy.add(fid(a, b))
  setTimeout(() => busy.delete(fid(a, b)), 30_000)
  await actors.Friendship.get(fid(a, b)).clearRelayLog()
  const slots = await actors.User.get(a).getFreeSlots()
  const list = slots.slice(0, 4).map(s => `${fmt(s.start)} @ ${s.place}`).join(", ")
  await say(a, b, `👋 Hi! I'm ${await nameOf(a)}'s agent. ${await nameOf(a)} would love to catch up with ${await nameOf(b)}. Here's where she'll be (times + places only): ${list}`, { conv, type: "hello", slots })
  return { ok: true, conv }
}

for (const me of USERS) {
  bus.on(agentName(me), async (fromAgent, d) => {
    const other = fromAgent.replace("-agent", "")
    try {
      if (d.type === "hello") {
        if (!(await actors.User.get(me).getWantsClose(other))) {
          return say(me, other, `Thanks for reaching out! ${await nameOf(me)}'s week is packed — let's try another time. 🌙`, { conv: d.conv, type: "decline" })
        }
        const mine = await actors.User.get(me).getFreeSlots()
        const ov = overlaps(d.slots || [], mine)
        if (!ov.length) return say(me, other, `No shared place/time this week. I'll keep watching and ping you when your paths cross. 👀`, { conv: d.conv, type: "decline" })
        const slot = ov[0]
        const idea = await privateIdea(me, other, slot)
        return say(me, other, `Good news — they'll BOTH be at ${slot.place} ${fmt(slot.start)}! From my side (private notes stay private 🤫), idea: ${idea}`, { conv: d.conv, type: "overlap", slot, idea })
      }
      if (d.type === "overlap" && d.slot) {
        const ideaMine = await privateIdea(me, other, d.slot)
        const reason = await safeReason(ideaMine, d.idea || "", d.slot)
        await say(me, other, `Love it. Locking in ${fmt(d.slot.start)} at ${d.slot.place}: "${reason}" Sending to both humans now. 📲`, { conv: d.conv, type: "agree", slot: d.slot, reason })
        await actors.Friendship.get(fid(me, other)).propose({ at: d.slot.start, place: d.slot.place, reason })
        return
      }
      if (d.type === "agree") return say(me, other, `🤝 Done. Don't ghost!`, { conv: d.conv, type: "done" })
    } catch (e) { console.error("agent error", e) }
  })
}

// Auto-trigger: when both users' calendars put them at the same place & time, negotiate.
const seen = new Set<string>()
setInterval(async () => {
  try {
    const [a, b] = USERS
    const f: any = await actors.Friendship.get(fid(a, b)).get()
    if (!f.members?.length) return
    const ov = overlaps(await actors.User.get(a).getFreeSlots(), await actors.User.get(b).getFreeSlots())
    const key = ov[0] ? `${ov[0].place}|${ov[0].start}` : ""
    if (key && !seen.has(key) && f.proposal?.status !== "pending") { seen.add(key); await findTime(a, b) }
  } catch {}
}, 3000)

// HTTP: POST /find-time {"from":"erin","to":"partner"}  (CORS open for the web app)
const port = Number(process.env.AGENT_PORT || 8787)
Bun.serve({
  port,
  async fetch(req) {
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type", "Access-Control-Allow-Methods": "POST,GET,OPTIONS" }
    if (req.method === "OPTIONS") return new Response(null, { headers: cors })
    const url = new URL(req.url)
    if (url.pathname === "/find-time") {
      const body: any = req.method === "POST" ? await req.json().catch(() => ({})) : {}
      const r = await findTime(body.from || "erin", body.to || "partner")
      return Response.json(r, { headers: cors })
    }
    return Response.json({ ok: true, mode: bus.mode }, { headers: cors })
  },
})
console.log(`Agents online via ${bus.mode}. HTTP on :${port}  (POST /find-time)`)
