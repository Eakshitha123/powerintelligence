import express from "express";
import "dotenv/config";
import { connectDB } from "./lib/mongoose.js";
import authRouter from "./routes/auth.js";

console.log("🟩 server loaded");

const app = express();
app.use(express.json());

// Test route
app.get("/", (_req, res) => res.send("API running"));

// Direct ping for debugging
app.get("/auth/ping-direct", (_req, res) => res.send("auth direct ok"));

// Log all incoming /auth requests
app.use("/auth", (req, _res, next) => {
  console.log(`   🔎 [base /auth] ${req.method} ${req.url}`);
  next();
});

// Mount auth router
app.use("/auth", authRouter);

// Connect DB
await connectDB();

app.listen(4000, () => {
  console.log("API running at http://localhost:4000");
});