import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User.js";

const router = Router();

console.log("🔗 auth router loaded");

// Local logger inside auth router
router.use((req, _res, next) => {
  console.log(`   ↪️ [auth router] ${req.method} ${req.url}`);
  next();
});

// Test route to confirm this file loads
router.get("/ping", (_req, res) => res.send("auth ok"));

// Allowed roles
const RoleEnum = z.enum([
  "ADMIN", "DT_OPS_MANAGER", "FIELD_ENGINEER", "ANALYST", "CONSUMER"
]);

// Signup validation schema
const SignupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  role: RoleEnum
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

// ---------------- SIGNUP ----------------
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = SignupSchema.parse(req.body);

    const normalized = email.toLowerCase().trim();

    const existing = await User.findOne({ email: normalized });
    if (existing) return res.status(409).json({ error: "Email already exists" });

    const passwordHash = await bcrypt.hash(password, 12);

    const isConsumer = role === "CONSUMER";

    const user = await User.create({
      name,
      email: normalized,
      passwordHash,
      status: isConsumer ? "ACTIVE" : "PENDING",
      role: isConsumer ? "CONSUMER" : null,
      requestedRole: isConsumer ? null : role
    });

    res.status(201).json({
      message: isConsumer
        ? "Signup successful. You can log in now."
        : "Signup received. Your account is pending approval.",
      user
    });

  } catch (err) {
    if (err?.issues) {
      return res.status(400).json({ error: "Validation failed", details: err.issues });
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------- LOGIN ----------------
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const normalized = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalized });
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    if (user.status !== "ACTIVE") {
      return res.status(403).json({ error: "Account pending approval" });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    return res.json({
      message: "Login successful",
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      },
      token: "dummy-token" // we will replace later with real JWT
    });

  } catch (err) {
    if (err?.issues) {
      return res.status(400).json({ error: "Validation failed", details: err.issues });
    }
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;