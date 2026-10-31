"use client";

import { useSearchParams } from "next/navigation";
import { Chip, Shell, daysLabel, fmtWhen } from "@/components/ui";
import type { PersonProfile, StateView } from "@/lib/types";
import { usePoll } from "@/lib/usePoll";
import { WantsClose } from "@/components/WantsClose";
import { useMe } from "@/lib/user";

export default function Person() {
  const { me } = useMe();
  const id = useSearchParams().get("id");
  const { data: s, offline, refresh } = usePoll<StateView>(`/api/state?as=${me}`);
  if (!s) return <Shell title="..." offline={offline}><p className="text-muted">Loading...</p></Shell>;

  const isFriend = !id || id === s.other.id;
  const ghost = s.ghosts.find((g) => g.id === id);
  const profile: PersonProfile | null = isFriend ? s.myProfileOfOther : ghost?.profile ?? null;
  const name = isFriend ? s.other.name : ghost?.name ?? "Unknown";
  const days = isFriend ? s.friendship.daysSince : ghost?.daysSince ?? 0;

  return (
    <Shell title={name} offline={offline}>
      <p className="text-lg text-muted">{daysLabel(days)}{profile && ` · first met at ${profile.firstMetPlace}`}</p>
      {isFriend && <WantsClose state={s} onChange={refresh} />}
      {!profile ? (
        <>
          {ghost?.oneLiner && <p className="font-serif text-2xl">{ghost.oneLiner}</p>}
          <p className="text-lg text-muted">No notes yet. Record a voice note after you meet.</p>
        </>
      ) : (
        <>
          {profile.impression && (
            <div className="rounded-2xl border border-line bg-card p-4">
              <h3 className="text-base text-muted">Your impression (private)</h3>
              <p className="mt-1 text-xl">{profile.impression}</p>
            </div>
          )}
          {[["Facts", profile.facts], ["Interests", profile.interests], ["In common", profile.commonalities]].map(
            ([label, items]) => (items as string[]).length > 0 && (
              <div key={label as string}>
                <h3 className="mb-1 text-base text-muted">{label as string}</h3>
                <div className="flex flex-wrap gap-2">{(items as string[]).map((t, i) => <Chip key={t} i={i}>{t}</Chip>)}</div>
              </div>
            ),
          )}
          <section>
            <h3 className="mb-2 text-base text-muted">Times you met</h3>
            <ol className="flex flex-col gap-3 border-l border-line pl-4">
              {[...profile.meetings].reverse().map((m) => (
                <li key={m.id} className="relative">
                  <span className="absolute -left-[21px] top-2 h-2.5 w-2.5 rounded-full bg-accent" />
                  <div className="text-lg font-semibold">{m.place}</div>
                  <div className="text-sm text-muted">{fmtWhen(m.at)}</div>
                  {m.memories.map((t) => <p key={t} className="text-base">{t}</p>)}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </Shell>
  );
}
