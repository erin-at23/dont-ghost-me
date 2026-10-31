"use client";

import { BriefCard, FriendCard, GHOST_DAYS, NudgeCard, PersonCard, ProposalPopup, Shell, daysLabel } from "@/components/ui";
import type { StateView } from "@/lib/types";
import { usePoll } from "@/lib/usePoll";
import { useMe } from "@/lib/user";

export default function Home() {
  const { me } = useMe();
  const { data: s, offline, refresh } = usePoll<StateView>(`/api/state?as=${me}`);

  if (!s) return <Shell title="Your people" offline={offline}><p className="text-muted">Loading...</p></Shell>;

  const p = s.friendship.proposal;
  const fading = s.ghosts.filter((g) => g.daysSince <= GHOST_DAYS);
  const ghosts = s.ghosts.filter((g) => g.daysSince > GHOST_DAYS);

  return (
    <Shell title="Your people" offline={offline}>
      {p?.status === "accepted" && <BriefCard state={s} proposal={p} />}
      {p?.status === "pending" && p.myResponse === "yes" && (
        <div className="rise-in rounded-2xl border border-line bg-card p-4 text-lg">
          You&apos;re in for <span className="text-accent-ink">{p.place}</span>. We&apos;ll confirm once it&apos;s set.
        </div>
      )}
      {s.nudge && !p && <NudgeCard text={s.nudge} />}

      <FriendCard
        name={s.other.name}
        days={s.friendship.daysSince}
        link={`/person?id=${s.other.id}`}
        subtitle={p?.status === "accepted" ? "Meeting up soon" : daysLabel(s.friendship.daysSince)}
      />
      {fading.map((g) => (
        <PersonCard key={g.id} name={g.name} days={g.daysSince} link={`/person?id=${g.id}`} />
      ))}

      {ghosts.length > 0 && (
        <section className="mt-4 rounded-3xl border border-pumpkin/20 bg-[radial-gradient(circle_at_50%_0%,rgba(242,140,40,0.12),transparent_70%)] p-4">
          <h2 className="spooky-text font-spooky text-3xl tracking-wide text-pumpkin">Fading away</h2>
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
