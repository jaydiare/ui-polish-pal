import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/i18n/LanguageProvider";

type Details = { client?: { name?: string; client_name?: string }; redirect_uri?: string; scope?: string; scopes?: string[]; redirect_url?: string; redirect_to?: string };
type Reply = { data: Details | null; error: { message: string } | null };
type OAuth = {
  getAuthorizationDetails: (id: string) => Promise<Reply>;
  approveAuthorization: (id: string) => Promise<Reply>;
  denyAuthorization: (id: string) => Promise<Reply>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuth }).oauth;

export default function OAuthConsent() {
  const { t } = useLanguage();
  const authorizationId = new URLSearchParams(window.location.search).get("authorization_id") ?? "";
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [details, setDetails] = useState<Details | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    let active = true;
    const { data } = supabase.auth.onAuthStateChange((_event, next) => { if (active) { setSession(next); setReady(true); } });
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setError(t("oauth.failed"));
      setSession(data.session); setReady(true);
    }).catch(() => { if (active) { setError(t("oauth.failed")); setReady(true); } });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, [t]);

  useEffect(() => {
    let active = true;
    if (!authorizationId || !session) return;
    setDetails(null); setError("");
    (async () => {
      try {
        const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error || !data) { setError(t("oauth.invalid")); return; }
        const target = data.redirect_url ?? data.redirect_to;
        if (target && !data.client) { window.location.assign(target); return; }
        setDetails(data);
      } catch { if (active) setError(t("oauth.failed")); }
    })();
    return () => { active = false; };
  }, [authorizationId, session, t]);

  async function login(register: boolean) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      // This form stays on the original consent URL on password sign-in.
      const result = register
        ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin + window.location.pathname + window.location.search } })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) setError(t("oauth.loginFailed"));
      else if (register && !result.data.session) setNotice(t("oauth.confirm"));
    } catch { setError(t("oauth.loginFailed")); }
    finally { setBusy(false); }
  }

  async function decide(approve: boolean) {
    if (busy || !details || !session) return;
    setBusy(true); setError("");
    try {
      const { data, error } = approve ? await oauth.approveAuthorization(authorizationId) : await oauth.denyAuthorization(authorizationId);
      const target = data?.redirect_url ?? data?.redirect_to;
      if (error || !target) { setError(t("oauth.failed")); return; }
      window.location.assign(target);
    } catch { setError(t("oauth.failed")); }
    finally { setBusy(false); }
  }

  const client = details?.client?.name ?? details?.client?.client_name ?? t("oauth.client");
  const scopes = details?.scopes ?? (details?.scope ?? "").split(" ").filter(Boolean);
  return <main className="mx-auto max-w-xl px-4 py-12 text-foreground">
    <Helmet><title>{t("oauth.heading")} | VZLA Sports Elite</title><meta name="robots" content="noindex,nofollow" /></Helmet>
    <h1 className="mb-6 text-2xl font-bold">{details ? `${t("oauth.connect")} ${client} ${t("oauth.toApp")}` : t("oauth.heading")}</h1>
    {!authorizationId ? <p role="alert">{t("oauth.invalid")}</p> : <>
      {error && <p role="alert" className="mb-4 text-destructive">{error}</p>}
      {!ready ? <p>{t("oauth.loading")}</p> : !session ? <form className="space-y-4" onSubmit={event => { event.preventDefault(); void login(false); }}>
        <label className="block">{t("oauth.email")}<Input type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} /></label>
        <label className="block">{t("oauth.password")}<Input type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></label>
        {notice && <p role="status">{notice}</p>}
        <div className="flex flex-wrap gap-3"><Button disabled={busy} type="submit">{t("oauth.signIn")}</Button><Button disabled={busy} variant="outline" type="button" onClick={event => { if (event.currentTarget.form?.reportValidity()) void login(true); }}>{t("oauth.register")}</Button></div>
      </form> : <div className="space-y-4">
        <p>{session.user.email}</p>
        {details ? <>
          <p>{client} {t("oauth.summary")}</p>
          {details.redirect_uri && <p className="break-all text-sm text-muted-foreground">{details.redirect_uri}</p>}
          <ul className="list-disc pl-5">{scopes.map(scope => <li key={scope}>{scope === "openid" || scope === "profile" ? t("oauth.profile") : scope === "email" ? t("oauth.emailScope") : `${t("oauth.extra")} ${scope}`}</li>)}</ul>
          <p>{t("oauth.capabilities")}</p><p className="text-sm text-muted-foreground">{t("oauth.boundary")}</p>
          <div className="flex flex-wrap gap-3"><Button disabled={busy} onClick={() => void decide(true)}>{t("oauth.approve")}</Button><Button disabled={busy} variant="outline" onClick={() => void decide(false)}>{t("oauth.deny")}</Button></div>
        </> : !error && <p>{t("oauth.loading")}</p>}
        <Button disabled={busy} variant="ghost" onClick={async () => { const { error } = await supabase.auth.signOut(); if (error) setError(t("oauth.failed")); }}>{t("oauth.switch")}</Button>
      </div>}
    </>}
  </main>;
}