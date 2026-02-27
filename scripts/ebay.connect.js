import crypto from "crypto";
import { EBAY_AUTH_URL } from "./ebay.config.js";

export const ebayConnect = (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");

  res.cookie("ebay_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
  });

  const url =
    `${EBAY_AUTH_URL}?client_id=${encodeURIComponent(process.env.EBAY_CLIENT_ID)}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(process.env.EBAY_REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(process.env.EBAY_SCOPES)}` +
    `&state=${encodeURIComponent(state)}`;

  res.redirect(url);
};
