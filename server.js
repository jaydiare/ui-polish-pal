import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

import { ebayConnect } from "./scripts/ebay.connect.js";
import { ebayCallback } from "./scripts/ebay.callback.js";

dotenv.config();

const app = express();
app.use(cookieParser());

app.get("/api/ebay/connect", ebayConnect);
app.get("/api/ebay/callback", ebayCallback);

app.listen(3000, () => console.log("Server running on port 3000"));
