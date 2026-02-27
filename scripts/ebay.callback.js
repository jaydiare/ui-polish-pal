import fetch from "node-fetch";
import { EBAY_TOKEN_URL } from "./ebay.config.js";

const FRONTEND_URL = process.env.FRONTEND_URL || "https://www.vzlasportselite.com";

export const ebayCallback = async (req, res) => {
  const { code, state } = req.query;
  const expectedState = req.cookies?.ebay_oauth_state;

  if (!code) return res.redirect(`${FRONTEND_URL}/ebay/denied`);
  if (!state || state !== expectedState)
    return res.redirect(`${FRONTEND_URL}/ebay/denied`);

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
    if (!response.ok) return res.redirect(`${FRONTEND_URL}/ebay/denied`);

    // 🔴 IMPORTANT:
    // Store data.refresh_token in your database here

    res.clearCookie("ebay_oauth_state");
    res.redirect(`${FRONTEND_URL}/ebay/success`);
  } catch (err) {
    console.error("eBay callback error:", err);
    res.redirect(`${FRONTEND_URL}/ebay/denied`);
  }
};
