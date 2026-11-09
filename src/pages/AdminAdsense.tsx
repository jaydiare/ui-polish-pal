import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Check = { id: string; ok: boolean; detail: string };
const PUB = "ca-pub-1118000382291516";
const SLOT = "3005539188";

const Row = ({ c }: { c: Check }) => (
  <li className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
    <span className={c.ok ? "text-primary" : "text-destructive"} aria-label={c.ok ? "pass" : "fail"}>
      {c.ok ? "✓" : "✗"}
    </span>
    <div>
      <p className="font-medium text-foreground">{c.id}</p>
      <p className="text-sm text-muted-foreground">{c.detail}</p>
    </div>
  </li>
);

function liveChecks(): Check[] {
  const w = window as any;
  const dl: any[] = Array.from(w.dataLayer || []);
  const consent = dl.filter((e) => e && e[0] === "consent");
  const res = performance.getEntriesByType("resource").map((r) => r.name);
  const ins = document.querySelector<HTMLElement>("#adsense-test ins");
  const status = ins?.getAttribute("data-ad-status") || ins?.getAttribute("data-adsbygoogle-status") || "none";
  return [
    { id: "scriptLoaded", ok: !!w.adsbygoogle && !Array.isArray(w.adsbygoogle) ? true : res.some((n) => n.includes("adsbygoogle.js")), detail: "adsbygoogle.js downloaded in this browser" },
    { id: "consentSignals", ok: consent.length > 0, detail: consent.map((c) => `${c[1]}: ad_storage=${c[2]?.ad_storage}`).join(" | ") || "No consent calls in dataLayer" },
    { id: "adRequest", ok: res.some((n) => n.includes("/pagead/ads") || n.includes("googleads.g.doubleclick.net")), detail: "Ad request sent to Google" },
    { id: `slot ${SLOT}`, ok: status === "filled" || status === "done", detail: `Test unit status: ${status}` },
  ];
}

export default function AdminAdsense() {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [server, setServer] = useState<Check[]>([]);
  const [live, setLive] = useState<Check[]>([]);
  const [busy, setBusy] = useState(false);
  const pushed = useRef(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setIsAdmin(null); return; }
    supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [session]);

  useEffect(() => {
    if (!isAdmin || pushed.current) return;
    pushed.current = true;
    try { ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({}); } catch { /* ignore */ }
  }, [isAdmin]);

  const run = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("adsense-status");
    setServer(error ? [{ id: "server", ok: false, detail: error.message }] : data.checks);
    setTimeout(() => { setLive(liveChecks()); setBusy(false); }, 4000);
  };

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setErr(error.message);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Helmet><title>AdSense status</title><meta name="robots" content="noindex,nofollow" /></Helmet>
      <h1 className="mb-6 text-2xl font-bold text-foreground">AdSense status</h1>
      {!session ? (
        <form onSubmit={signIn} className="space-y-3">
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <Button type="submit">Sign in</Button>
        </form>
      ) : isAdmin === false ? (
        <p className="text-muted-foreground">This account is not an admin.</p>
      ) : isAdmin ? (
        <div className="space-y-6">
          <Button onClick={run} disabled={busy}>{busy ? "Checking..." : "Run checks"}</Button>
          {server.length > 0 && (<section><h2 className="mb-2 font-semibold text-foreground">Published site</h2><ul className="space-y-2">{server.map((c) => <Row key={c.id} c={c} />)}</ul></section>)}
          {live.length > 0 && (<section><h2 className="mb-2 font-semibold text-foreground">This browser</h2><ul className="space-y-2">{live.map((c) => <Row key={c.id} c={c} />)}</ul></section>)}
          <div id="adsense-test" className="rounded-lg border border-border p-2">
            <p className="mb-2 text-xs text-muted-foreground">Test unit {SLOT}</p>
            <ins className="adsbygoogle" style={{ display: "block" }} data-ad-client={PUB} data-ad-slot={SLOT} data-ad-format="autorelaxed" />
          </div>
          <Button variant="outline" onClick={() => supabase.auth.signOut()}>Sign out</Button>
        </div>
      ) : null}
    </main>
  );
}
