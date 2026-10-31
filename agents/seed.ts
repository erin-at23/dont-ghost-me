// Loads demo data into the actors. Run: bun seed.ts   (terse actor dev must be running)
import { actors } from "./generated"
import users from "../seed/users.json"
import ghosts from "../seed/ghosts.json"

for (const u of users.users) {
  const a = actors.User.get(u.id)
  await a.setDisplayName(u.displayName)
  await a.setCalendar(u.calendar)
}
await actors.User.get("erin").setPeople(ghosts.people)
await actors.User.get("partner").setPeople(ghosts.partnerPeople)

await actors.Friendship.get("erin__partner").reset()
for (const id of ["erin.partner", "partner.erin"]) await actors.Person.get(id).reset()

// Charlotte's PRIVATE note about Erin (from an earlier meeting). Her agent uses it; Erin never sees it.
await actors.Person.get("partner.erin").applyExtraction(
  {
    name: "Erin",
    facts: ["foodie", "building a hackathon project"],
    interests: ["boba", "trying new food spots"],
    commonalities: ["love boba", "both in CS106B"],
    memories: ["talked about favorite boba places after section"],
    impression: "stressed about midterms lately, could use a low-key break",
  },
  { at: "2026-10-20T16:00:00-07:00", place: "CS106B section" },
)
console.log(`Seeded: 2 users + calendars, ${ghosts.people.length} friends for erin, ${ghosts.partnerPeople.length} for partner, Charlotte's private note about Erin.`)
