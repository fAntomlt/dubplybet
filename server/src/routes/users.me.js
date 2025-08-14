// routes/users.me.js
import { Router } from "express";
import pool from "../db.js";
import bcrypt from "bcryptjs";
import { requireAuth } from "../middleware/auth.js"; // must set req.user.id

const router = Router();

// GET /api/users/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, email, username, discord_username AS discordUsername, role, email_verified FROM users WHERE id = ? LIMIT 1",
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: "Vartotojas nerastas" });
    return res.json({ ok: true, user: rows[0] });
  } catch (e) {
    console.error("GET /users/me", e);
    return res.status(500).json({ ok: false, error: "Serverio klaida" });
  }
});

// PATCH /api/users/me   { username?, discordUsername?, password }
router.patch("/me", requireAuth, async (req, res) => {
  try {
    const { username, discordUsername, password } = req.body || {};
    if (!password) return res.status(400).json({ ok: false, error: "Reikalingas slaptažodis" });
    if (!username && !discordUsername)
      return res.status(400).json({ ok: false, error: "Nėra ką atnaujinti" });

    // verify password
    const [rows] = await pool.query(
      "SELECT password_hash FROM users WHERE id = ? LIMIT 1",
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: "Vartotojas nerastas" });
    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) return res.status(400).json({ ok: false, error: "Neteisingas slaptažodis" });

    // simple validations (backend remains source of truth)
    const updates = [];
    const params = [];
    if (typeof username === "string") {
      const u = username.trim();
      if (u.length < 3 || u.length > 50) return res.status(400).json({ ok: false, error: "Slapyvardis 3–50" });
      updates.push("username = ?");
      params.push(u);
    }
    if (typeof discordUsername === "string") {
      const d = discordUsername.trim();
      // same regex you used during registration
      if (!/^(?!.*[._]{2})(?![._])[a-zA-Z0-9._]{2,32}(?<![._])$/.test(d))
        return res.status(400).json({ ok: false, error: "Neteisingas Discord vardas" });
      updates.push("discord_username = ?");
      params.push(d);
    }

    if (!updates.length) return res.status(400).json({ ok: false, error: "Nėra laukų atnaujinimui" });

    params.push(req.user.id);
    await pool.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);

    return res.json({ ok: true });
  } catch (e) {
    console.error("PATCH /users/me", e);
    return res.status(500).json({ ok: false, error: "Serverio klaida" });
  }
});

// POST /api/users/change-password  { oldPassword, newPassword, confirmPassword }
router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body || {};
    if (!oldPassword || !newPassword || !confirmPassword)
      return res.status(400).json({ ok: false, error: "Užpildykite visus laukus" });

    if (newPassword !== confirmPassword)
      return res.status(400).json({ ok: false, error: "Slaptažodžiai nesutampa" });

    if (newPassword.length < 8 || newPassword.length > 100)
      return res.status(400).json({ ok: false, error: "Slaptažodis 8–100" });

    const [rows] = await pool.query(
      "SELECT password_hash FROM users WHERE id = ? LIMIT 1",
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ ok: false, error: "Vartotojas nerastas" });

    const ok = await bcrypt.compare(oldPassword, rows[0].password_hash);
    if (!ok) return res.status(400).json({ ok: false, error: "Neteisingas senas slaptažodis" });

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, req.user.id]);

    return res.json({ ok: true, message: "Slaptažodis atnaujintas" });
  } catch (e) {
    console.error("POST /users/change-password", e);
    return res.status(500).json({ ok: false, error: "Serverio klaida" });
  }
});

export default router;