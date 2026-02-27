import fetch from "node-fetch";
import { EBAY_TOKEN_URL } from "./ebay.config.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "https://www.vzlasportselite.com";

export const ebayCallback = async (req, res) => {
  const { code, state } = req.query;
  const expectedState = req.cookies?.ebay_oauth_state;

  console.log("[eBay callback] code:", code ? "present" : "MISSING");
  console.log("[eBay callback] state:", state);
  console.log("[eBay callback] expectedState:", expectedState || "MISSING (no cookie)");

  if (!code) {
    console.error("[eBay callback] DENIED: no authorization code received");
    return res.redirect(`${FRONTEND_URL}/ebay/denied`);
  }
  if (!state || state !== expectedState) {
    console.error("[eBay callback] DENIED: state mismatch");
    return res.redirect(`${FRONTEND_URL}/ebay/denied`);
  }

  try {
    const basic = Buffer.from(
      `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
    ).toString("base64");

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.EBAY_REDIRECT_URI,
    });

    const response = await fetch(EBAY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basic}`,
      },
      body,
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("[eBay callback] DENIED: token exchange failed:", JSON.stringify(data));
      return res.redirect(`${FRONTEND_URL}/ebay/denied`);
    }

    console.log("[eBay callback] ✅ SUCCESS!");
    console.log("[eBay callback] refresh_token:", data.refresh_token ? data.refresh_token.substring(0, 20) + "..." : "MISSING");

    res.clearCookie("ebay_oauth_state");
    res.redirect(`${FRONTEND_URL}/ebay/success`);
  } catch (err) {
    console.error("[eBay callback] error:", err);
    res.redirect(`${FRONTEND_URL}/ebay/denied`);
  }
};
