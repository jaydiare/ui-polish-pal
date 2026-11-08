# AdSense compliance fixes (no new visible text)

Audit against Google Publisher Policies. Content policies look fine (sports card market data, no prohibited content). ads.txt is live and correct, and the AdSense script and site-verification tag are in place. The problems are technical and privacy-related.

## Findings
1. **Same ad unit used three ways.** All three ad spots (left banner, right banner, in-article) use one ad slot ID, but with two different formats ("multiplex" and "in-article"). Google only serves a unit in the format it was created as, so some spots stay blank, and mismatched units can be flagged as invalid implementation.
2. **No Google consent signals.** Your cookie banner saves "accepted" locally but never tells Google. Since 2024 Google requires consent signals (Consent Mode / a Google-certified consent message) for visitors from Europe, the UK and Switzerland. Missing this is a common reason ads stop or the account is flagged.
3. **Ads load before the visitor chooses.** The AdSense script loads right away, even before the cookie choice.
4. **Privacy policy is thin on Google wording.** It needs Google's required disclosure (Google uses cookies to serve ads based on prior visits, with an opt-out link to Ads Settings). This changes existing wording rather than adding a new section.

## Changes
- Set Google Consent Mode defaults to "denied" in the page header. Your existing cookie banner's Accept/Decline buttons then update them to "granted" or keep "denied" (non-personalized ads). The banner looks the same.
- Keep ads on the same pages and spots as today. Each spot gets the format that matches its unit. Spots with no matching unit stay hidden instead of showing a broken box.
- Rewrite the existing advertising paragraph in the Privacy Policy to include Google's required wording and opt-out link (EN and ES), with about the same length.
- Make sure no ads show on empty or thin pages (404, eBay connect/denied/success pages).

## What you need to do in AdSense (I can't do this)
- In AdSense > Privacy & messaging, turn on the **European regulations (GDPR) message**. It's free and Google certifies it. Because Google provides the popup, it isn't your text.
- In AdSense > Ads > By ad unit, tell me the slot IDs for your Multiplex and In-article units (or create them). Until then, I'll keep the one unit only where its format matches.
- In AdSense > Policy center, check the exact violation listed and send it to me. That's what confirms why your account is at risk.

## Technical details
- `index.html`: add the `gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500})` stub before the adsbygoogle script.
- Cookie banner component: call `gtag('consent','update',...)` on accept, decline and when the page loads with a saved choice.
- `AdSenseInArticle.tsx` / `VzlaSideBanner*.tsx`: per-format slot constants; render nothing when no slot is set.
- `privacy.tsx` + `translations.ts`: replace the existing ad paragraph with Google's required disclosure.
- I can't promise reinstatement. The reason Google gives in the Policy center decides that.
