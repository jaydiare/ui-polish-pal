import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const SITE = "https://vzlasportselite.com";
const PUB = "ca-pub-1118000382291516";
const SLOTS = ["3005539188"];

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const auth = req.headers.get("Authorization") ?? "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return json({ error: "Not signed in" }, 401);
  const { data: isAdmin } = await sb.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
  if (!isAdmin) return json({ error: "Admins only" }, 403);

  const checks: { id: string; ok: boolean; detail: string }[] = [];
  try {
    const r = await fetch(SITE + "/?_adcheck=" + Date.now(), { headers: { "User-Agent": "Mozilla/5.0 AdSenseStatusCheck" } });
    const html = await r.text();
    checks.push({ id: "site", ok: r.ok, detail: `HTTP ${r.status}` });
    checks.push({ id: "adsenseTag", ok: html.includes("adsbygoogle.js?client=" + PUB), detail: "adsbygoogle.js with your publisher ID" });
    checks.push({ id: "accountMeta", ok: html.includes(`google-adsense-account" content="${PUB}`), detail: "google-adsense-account meta tag" });
    checks.push({ id: "consentDefault", ok: /gtag\('consent',\s*'default'/.test(html), detail: "Consent Mode default set before tags" });
    checks.push({ id: "consentOrder", ok: html.indexOf("'consent','default'") > -1 && html.indexOf("'consent','default'") < html.indexOf("adsbygoogle.js"), detail: "Consent default runs before AdSense loads" });
  } catch (e) {
    checks.push({ id: "site", ok: false, detail: String(e) });
  }
  try {
    const r = await fetch(SITE + "/ads.txt");
    const t = await r.text();
    checks.push({ id: "adsTxt", ok: r.ok && t.includes("pub-1118000382291516"), detail: `ads.txt HTTP ${r.status}` });
  } catch (e) {
    checks.push({ id: "adsTxt", ok: false, detail: String(e) });
  }
  return json({ site: SITE, slots: SLOTS, checkedAt: new Date().toISOString(), checks });
});
