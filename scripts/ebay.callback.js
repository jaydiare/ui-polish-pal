import fetch from "node-fetch";
import { EBAY_TOKEN_URL } from "../utils/ebay.config.js";

export const ebayCallback = async (req, res) => {
  const { code, state } = req.query;
  const expectedState = req.cookies?.ebay_oauth_state;

  if (!code) return res.status(400).send("Missing code");
  if (!state || state !== expectedState)
    return res.status(400).send("Invalid state");

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
  if (!response.ok) return res.status(response.status).json(data);

  // 🔴 IMPORTANT:
  // Store data.refresh_token in your database here

  res.json({
    connected: true,
    refresh_token_received: !!data.refresh_token,
  });
};
