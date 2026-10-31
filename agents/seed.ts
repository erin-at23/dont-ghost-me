// Loads demo data into the actors. Run: bun seed.ts   (terse actor dev must be running)
import { actors } from "./generated"
import users from "../seed/users.json"
import ghosts from "../seed/ghosts.json"

for (const u of users.users) {
  const a = actors.User.get(u.id)
  await a.setDisplayName(u.displayName)
  await a.setCalendar(u.calendar)
}
await actors.User.get(ghosts.owner).setPeople(ghosts.people)
await actors.User.get("partner").setPeople([])
const f = actors.Friendship.get("erin__partner")
await f.reset()
for (const id of ["erin.partner", "partner.erin"]) await actors.Person.get(id).reset()
console.log("Seeded: 2 users, calendars,", ghosts.people.length, "ghost friends. Friendship erin__partner reset.")
