export const EBAY_ENV = process.env.EBAY_ENV;

export const EBAY_AUTH_URL =
  EBAY_ENV === "sandbox"
    ? "https://auth.sandbox.ebay.com/oauth2/authorize"
    : "https://auth.ebay.com/oauth2/authorize";

export const EBAY_TOKEN_URL =
  EBAY_ENV === "sandbox"
    ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
    : "https://api.ebay.com/identity/v1/oauth2/token";
