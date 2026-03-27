import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import { ebayConnect } from "./scripts/ebay.connect.js";
import { ebayCallback } from "./scripts/ebay.callback.js";

dotenv.config();

const app = express();
app.use(cookieParser());
app.use(express.json());

// Restrict CORS to production frontend origins
const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || "https://www.vzlasportselite.com")
  .split(",")
  .map((o) => o.trim());
ALLOWED_ORIGINS.push("https://quick-shine-ui.lovable.app");
app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  })
);

// Rate-limit OAuth routes: max 30 requests per minute per IP
const oauthLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/ebay", oauthLimiter);

app.get("/api/ebay/connect", ebayConnect);
app.get("/api/ebay/callback", ebayCallback);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
