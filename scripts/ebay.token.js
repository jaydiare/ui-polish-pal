import fetch from "node-fetch";
import { EBAY_TOKEN_URL } from "../utils/ebay.config.js";

export const refreshAccessToken = async (refreshToken) => {
  const basic = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
  ).toString("base64");

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: process.env.EBAY_SCOPES,
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
  if (!response.ok) throw new Error(JSON.stringify(data));

  return data.access_token;
};
