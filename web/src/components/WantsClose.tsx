"use client";

import { useState } from "react";
import type { StateView } from "@/lib/types";
import { post } from "@/lib/usePoll";

/** Private: the other person never sees this value. */
export function WantsClose({ state, onChange }: { state: StateView; onChange: () => void }) {
  const [busy, setBusy] = useState(false);
  const on = state.me.wantsClose;
  const toggle = async () => {
    setBusy(true);
    try { await post("/api/wants-close", { as: state.me.id, other: state.other.id, value: !on }); } finally { setBusy(false); onChange(); }
  };
  return (
    <button onClick={toggle} disabled={busy}
      className="flex items-center justify-between rounded-3xl border border-line bg-card p-4 text-left">
      <span>
        <span className="block text-lg">Want to stay close</span>
        <span className="block text-sm text-muted">Only you can see this</span>
      </span>
      <span className={`flex h-8 w-14 items-center rounded-full p-1 transition-colors ${on ? "bg-accent" : "bg-white/10"}`}>
        <span className={`h-6 w-6 rounded-full bg-white transition-transform ${on ? "translate-x-6" : ""}`} />
      </span>
    </button>
  );
}
