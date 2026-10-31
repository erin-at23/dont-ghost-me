"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Shell } from "@/components/ui";
import { WantsClose } from "@/components/WantsClose";
import type { StateView } from "@/lib/types";
import { post, usePoll } from "@/lib/usePoll";
import { useMe } from "@/lib/user";
import { NAMES } from "@/mocks";

const otherOf = (u: string) => (u === "erin" ? "partner" : "erin");

export default function Connect() {
  const { me } = useMe();
  const params = useSearchParams();
  const router = useRouter();
  const from = params.get("from");

  // Opened from a phone camera scan: the scanner is whoever is NOT `from`.
  useEffect(() => {
    if (from && (from === me || !params.get("as"))) router.replace(`/connect?from=${from}&as=${otherOf(from)}`);
  }, [from, me, params, router]);

  return (
    <Shell title="Connect">
      {from && from !== me ? <Accept from={from} /> : <ShowAndScan />}
    </Shell>
  );
}

function ShowAndScan() {
  const { me } = useMe();
  const router = useRouter();
  const origin = useSyncExternalStore(() => () => {}, () => window.location.origin, () => "");
  const [scanning, setScanning] = useState(false);
  const [err, setErr] = useState("");

  const onScan = (text: string) => {
    try {
      const f = new URL(text).searchParams.get("from");
      if (!f) throw new Error("Not a Don't Ghost code");
      setScanning(false);
      router.push(`/connect?from=${f}&as=${me}`);
    } catch (e) { setErr((e as Error).message); }
  };

  return (
    <>
      <p className="text-lg text-muted">Let them scan this, or scan theirs.</p>
      <div className="flex justify-center rounded-3xl bg-white p-6">
        {origin && <QRCodeSVG value={`${origin}/connect?from=${me}`} size={240} />}
      </div>
      <p className="text-center text-xl">{NAMES[me]}</p>
      {scanning ? <Scanner onScan={onScan} onError={setErr} /> : (
        <button onClick={() => { setErr(""); setScanning(true); }}
          className="rounded-2xl bg-accent py-4 text-xl font-semibold text-black">Scan their code</button>
      )}
      {scanning && <button onClick={() => setScanning(false)} className="text-base text-muted underline">Cancel</button>}
      {err && <p className="text-lg text-red-400">{err}</p>}
    </>
  );
}

function Scanner({ onScan, onError }: { onScan: (t: string) => void; onError: (m: string) => void }) {
  const cb = useRef(onScan);
  useEffect(() => { cb.current = onScan; });
  useEffect(() => {
    let stopped = false;
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    import("html5-qrcode").then(({ Html5Qrcode }) => {
      if (stopped) return;
      scanner = new Html5Qrcode("qr-reader");
      scanner
        .start({ facingMode: "environment" }, { fps: 10, qrbox: 220 }, (t) => cb.current(t), () => {})
        .catch((e) => onError(`Camera: ${e}`));
    });
    return () => {
      stopped = true;
      scanner?.stop().catch(() => {});
    };
  }, [onError]);
  return <div id="qr-reader" className="overflow-hidden rounded-3xl" />;
}

function Accept({ from }: { from: string }) {
  const { me } = useMe();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const { data: s, refresh } = usePoll<StateView>(`/api/state?as=${me}`, 2000);
  const connect = async () => {
    setBusy(true);
    try { await post("/api/connect", { from, to: me }); setDone(true); } finally { setBusy(false); }
  };
  if (!done) {
    return (
      <div className="flex flex-col gap-4 py-6 text-center">
        <p className="text-2xl">Connect with <span className="text-accent">{NAMES[from] ?? from}</span>?</p>
        <button onClick={connect} disabled={busy}
          className="rounded-2xl bg-accent py-5 text-2xl font-semibold text-black">Connect</button>
      </div>
    );
  }
  return (
    <div className="rise-in flex flex-col gap-4">
      <p className="text-2xl">You and <span className="text-accent">{NAMES[from]}</span> are connected.</p>
      <p className="text-lg text-muted">Your agents will quietly look for times you&apos;re both around.</p>
      {s && <WantsClose state={s} onChange={refresh} />}
    </div>
  );
}
