// Quick end-to-end test: befriend, Erin's voice note, demo event on both calendars.
// (Charlotte's private note about Erin is created by seed.ts.)
import { actors } from "./generated"
import users from "../seed/users.json"
await actors.Friendship.get("erin__partner").befriend("erin", "partner")
await actors.Person.get("erin.partner").applyExtraction(
  { name: "Charlotte", facts: ["from Austin"], interests: ["rock climbing", "boba"], commonalities: ["hate 8am classes", "love boba"], memories: ["talked about her climbing comp"] },
  { place: "CS106B section" },
)
for (const u of ["erin", "partner"]) await actors.User.get(u).addEvent({ id: "demo-lunch", ...users.demoEvent })
console.log("Added demo event to both calendars. Watch the agent terminal…")
