// Quick end-to-end test: befriend, voice-note extraction, demo event on both calendars.
import { actors } from "./generated"
import users from "../seed/users.json"
const f = actors.Friendship.get("erin__partner")
await f.befriend("erin", "partner")
await actors.Person.get("erin.partner").applyExtraction({ name: "Maya", facts: ["from Austin"], interests: ["rock climbing", "boba"], commonalities: ["hate 8am classes", "love boba"], memories: ["talked about her climbing comp"], impression: "funny, a bit stressed about midterms" }, { place: "CS106B section" })
await actors.Person.get("partner.erin").applyExtraction({ name: "Erin", facts: ["foodie"], interests: ["boba", "hackathons"], commonalities: ["love boba"], memories: ["building Don't Ghost at YC"] }, { place: "CS106B section" })
for (const u of ["erin", "partner"]) await actors.User.get(u).addEvent({ id: "demo-lunch", ...users.demoEvent })
console.log("Added demo event to both calendars. Watch the agent terminal…")
