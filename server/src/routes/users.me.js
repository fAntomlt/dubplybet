// routes/users.me.js
import { Router } from "express";
import cors from "cors";
import pool from "../db.js";
import bcrypt from "bcryptjs";
import { requireAuth } from "../middleware/auth.js";

const router = Router();

// Local CORS just in case this file is hit directly in tests
const routerCors = cors({
  origin: (origin, cb) => cb(null, true), // allow (global app already restricts)
  credentials: true,
  methods: ["GET","POST","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
});

// Preflight for everything under /api/users/*
router.options("*", routerCors);

// ---------- GET /api/users/me ----------
router.get("/me", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, email, username, role, discord_username AS discordUsername FROM users WHERE id = ? LIMIT 1",
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: "Vartotojas nerastas" });
    res.json({ ok: true, user: rows[0] });
  } catch (e) {
    console.error("GET /users/me error:", e);
    res.status(500).json({ ok: false, error: "Serverio klaida" });
  }
});

// ---------- PATCH /api/users/me (username / discord) ----------
router.patch("/me", requireAuth, async (req, res) => {
  try {
    const { username, discordUsername, password } = req.body || {};
    if (!password) return res.status(400).json({ ok: false, error: "Reikalingas slaptažodis" });

    // verify password
    const [urows] = await pool.query("SELECT password_hash FROM users WHERE id = ? LIMIT 1", [req.user.id]);
    if (!urows.length) return res.status(404).json({ ok: false, error: "Vartotojas nerastas" });
    const ok = await bcrypt.compare(password, urows[0].password_hash);
    if (!ok) return res.status(401).json({ ok: false, error: "Neteisingas slaptažodis" });

    // build update
    const fields = [];
    const vals = [];
    if (typeof username === "string" && username.trim()) { fields.push("username = ?"); vals.push(username.trim()); }
    if (typeof discordUsername === "string" && discordUsername.trim()) { fields.push("discord_username = ?"); vals.push(discordUsername.trim()); }
    if (!fields.length) return res.status(400).json({ ok: false, error: "Nėra ką atnaujinti" });

    vals.push(req.user.id);
    await pool.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, vals);

    res.json({ ok: true, message: "Duomenys atnaujinti" });
  } catch (e) {
    console.error("PATCH /users/me error:", e);
    res.status(500).json({ ok: false, error: "Serverio klaida" });
  }
});

// ---------- POST /api/users/change-password ----------
router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body || {};
    if (!oldPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ ok: false, error: "Užpildykite visus laukus" });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ ok: false, error: "Slaptažodžiai nesutampa" });
    }
    if (newPassword.length < 8 || newPassword.length > 100) {
      return res.status(400).json({ ok: false, error: "Neteisingas slaptažodis (8–100)" });
    }

    const [rows] = await pool.query("SELECT password_hash FROM users WHERE id = ? LIMIT 1", [req.user.id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: "Vartotojas nerastas" });

    const ok = await bcrypt.compare(oldPassword, rows[0].password_hash);
    if (!ok) return res.status(401).json({ ok: false, error: "Neteisingas dabartinis slaptažodis" });

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, req.user.id]);

    res.json({ ok: true, message: "Slaptažodis atnaujintas" });
  } catch (e) {
    console.error("POST /users/change-password error:", e);
    res.status(500).json({ ok: false, error: "Serverio klaida" });
  }
});

export default router;