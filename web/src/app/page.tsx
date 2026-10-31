"use client";

import { BriefCard, GHOST_DAYS, PersonCard, ProposalPopup, Shell, daysLabel } from "@/components/ui";
import { CampusMap } from "@/components/CampusMap";
import type { StateView } from "@/lib/types";
import { usePoll } from "@/lib/usePoll";
import { useMe } from "@/lib/user";

export default function Home() {
  const { me } = useMe();
  const { data: s, offline, refresh } = usePoll<StateView>(`/api/state?as=${me}`);

  if (!s) return <Shell title="Your people" offline={offline}><p className="text-muted">Summoning your people…</p></Shell>;

  const p = s.friendship.proposal;
  const fading = s.ghosts.filter((g) => g.daysSince <= GHOST_DAYS);
  const ghosts = s.ghosts.filter((g) => g.daysSince > GHOST_DAYS);

  return (
    <Shell title="Your people" offline={offline}>
      {p?.status === "accepted" && <BriefCard state={s} proposal={p} />}
      {p?.status === "pending" && p.myResponse === "yes" && (
        <div className="rise-in rounded-3xl border border-line bg-card p-4 text-lg">
          You&apos;re in for <span className="text-accent-ink">{p.place}</span>. We&apos;ll confirm once it&apos;s set.
        </div>
      )}
      {s.nudge && !p && (
        <div className="rise-in rounded-3xl border border-accent/30 bg-accent/10 p-4 text-lg text-accent-ink">{s.nudge}</div>
      )}


      <PersonCard
        name={s.other.name}
        days={s.friendship.daysSince}
        link={`/person?id=${s.other.id}`}
        subtitle={p?.status === "accepted" ? "Meeting up soon" : daysLabel(s.friendship.daysSince)}
      />
      {fading.map((g) => (
        <PersonCard key={g.id} name={g.name} days={g.daysSince} link={`/person?id=${g.id}`} />
      ))}

      <h2 className="mt-4 font-spooky text-2xl text-accent spooky-text">Your map</h2>
      <CampusMap
        meName={s.me.name}
        meetAt={p ? p.place : undefined}
        people={[
          { id: s.other.id, name: s.other.name, days: s.friendship.daysSince, place: s.myProfileOfOther?.firstMetPlace, link: `/person?id=${s.other.id}`, main: true },
          ...s.ghosts.map((g) => ({ id: g.id, name: g.name, days: g.daysSince, place: g.metPlace ?? g.profile?.firstMetPlace, link: `/person?id=${g.id}` })),
        ]}
      />

      {ghosts.length > 0 && (
        <section className="mt-4 rounded-3xl border border-line bg-[radial-gradient(circle_at_50%_0%,rgba(243,233,255,0.08),transparent_70%)] p-5">
          <h2 className="font-spooky text-2xl text-pumpkin spooky-text">Fading away <span className="text-muted font-normal">· {ghosts.length}</span></h2>
          <p className="mb-3 text-sm text-muted">Not seen in over three weeks</p>
          <div className="grid grid-cols-4 gap-2">
            {ghosts.map((g) => (
              <PersonCard key={g.id} name={g.name} days={g.daysSince} link={`/person?id=${g.id}`} />
            ))}
          </div>
        </section>
      )}

      <ProposalPopup state={s} onDone={refresh} />
    </Shell>
  );
}
