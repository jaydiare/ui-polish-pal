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

// Restrict CORS to production frontend origin
const FRONTEND_URL = process.env.FRONTEND_URL || "https://www.vzlasportselite.com";
app.use(
  cors({
    origin: FRONTEND_URL,
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

// Rate-limit feedback: max 5 per minute per IP
const feedbackLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many feedback submissions. Please try again later." },
});

app.post("/api/feedback", feedbackLimiter, async (req, res) => {
  try {
    const { name, category, message } = req.body;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required." });
    }
    if (message.length > 2000) {
      return res.status(400).json({ error: "Message must be under 2000 characters." });
    }
    if (name && name.length > 100) {
      return res.status(400).json({ error: "Name must be under 100 characters." });
    }

    const GITHUB_TOKEN = process.env.GITHUB_FEEDBACK_TOKEN;
    if (!GITHUB_TOKEN) {
      console.error("GITHUB_FEEDBACK_TOKEN not configured");
      return res.status(500).json({ error: "Feedback service is not configured." });
    }

    const validCategories = ["general", "bug", "feature", "data"];
    const cat = validCategories.includes(category) ? category : "general";
    const labels = [`feedback`, cat !== "general" ? cat : null].filter(Boolean);

    const title = `[Feedback${cat !== "general" ? ` - ${cat}` : ""}] ${message.trim().slice(0, 80)}`;
    const body = [
      `**From:** ${name?.trim() || "Anonymous"}`,
      `**Category:** ${cat}`,
      "",
      "---",
      "",
      message.trim(),
    ].join("\n");

    const ghRes = await fetch("https://api.github.com/repos/jaydiare/ui-polish-pal/issues", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, body, labels }),
    });

    if (!ghRes.ok) {
      const errBody = await ghRes.text();
      console.error(`GitHub API error [${ghRes.status}]: ${errBody}`);
      return res.status(502).json({ error: "Failed to submit feedback." });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Feedback endpoint error:", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
