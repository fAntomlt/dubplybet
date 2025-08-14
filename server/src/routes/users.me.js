// server/src/routes/users.me.js
import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { z } from "zod";
import bcrypt from "bcryptjs";

const router = Router();

// shared validators
const UsernameSchema = z.string().min(3).max(50);
const DiscordSchema = z
  .string()
  .regex(/^(?!.*[._]{2})(?![._])[a-zA-Z0-9._]{2,32}(?<![._])$/);
const PasswordSchema = z.string().min(8).max(100);

// GET /api/users/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid ?? req.user.id ?? req.user.userId;
    const [rows] = await pool.query(
      "SELECT id, email, username, discord_username AS discordUsername, role FROM users WHERE id = ? LIMIT 1",
      [uid]
    );
    if (!rows.length) return res.status(404).json({ error: "Vartotojas nerastas" });

    return res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error("GET /users/me error:", err);
    return res.status(500).json({ error: "Serverio klaida. Bandykite vėliau." });
  }
});

// PATCH /api/users/me
// body: { username?, discordUsername?, currentPassword }
router.patch("/me", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid ?? req.user.id ?? req.user.userId;

    const Schema = z.object({
      username: z.optional(UsernameSchema),
      discordUsername: z.optional(DiscordSchema),
      currentPassword: PasswordSchema,
    });
    const { username, discordUsername, currentPassword } = Schema.parse(req.body || {});

    if (!username && !discordUsername) {
      return res.status(400).json({ error: "Nėra ką atnaujinti" });
    }

    // fetch hash to verify current password
    const [uRows] = await pool.query(
      "SELECT id, password_hash FROM users WHERE id = ? LIMIT 1",
      [uid]
    );
    if (!uRows.length) return res.status(404).json({ error: "Vartotojas nerastas" });

    const ok = await bcrypt.compare(currentPassword, uRows[0].password_hash);
    if (!ok) return res.status(400).json({ error: "Neteisingas slaptažodis" });

    // uniqueness checks if username/discord provided
    if (username) {
      const [dupe] = await pool.query(
        "SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1",
        [username, uid]
      );
      if (dupe.length) return res.status(400).json({ error: "Vartotojo vardas jau naudojamas" });
    }
    if (discordUsername) {
      const [dupe] = await pool.query(
        "SELECT id FROM users WHERE discord_username = ? AND id <> ? LIMIT 1",
        [discordUsername, uid]
      );
      if (dupe.length) return res.status(400).json({ error: "Discord vardas jau naudojamas" });
    }

    // build update
    const sets = [];
    const vals = [];
    if (username) { sets.push("username = ?"); vals.push(username); }
    if (discordUsername) { sets.push("discord_username = ?"); vals.push(discordUsername); }
    vals.push(uid);

    await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, vals);

    return res.json({ ok: true, message: "Pakeitimai išsaugoti" });
  } catch (err) {
    if (err?.issues) {
      return res.status(400).json({ error: "Neteisingai užpildyti laukeliai", issues: err.issues });
    }
    console.error("PATCH /users/me error:", err);
    return res.status(500).json({ error: "Serverio klaida. Bandykite vėliau." });
  }
});

// POST /api/users/change-password
// body: { oldPassword, password, confirmPassword }
router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid ?? req.user.id ?? req.user.userId;

    const Schema = z
      .object({
        oldPassword: PasswordSchema,
        password: PasswordSchema,
        confirmPassword: z.string(),
      })
      .refine(d => d.password === d.confirmPassword, {
        path: ["confirmPassword"],
        message: "Slaptažodžiai nesutampa",
      });

    const { oldPassword, password } = Schema.parse(req.body || {});

    const [uRows] = await pool.query(
      "SELECT id, password_hash FROM users WHERE id = ? LIMIT 1",
      [uid]
    );
    if (!uRows.length) return res.status(404).json({ error: "Vartotojas nerastas" });

    const ok = await bcrypt.compare(oldPassword, uRows[0].password_hash);
    if (!ok) return res.status(400).json({ error: "Neteisingas senas slaptažodis" });

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [password_hash, uid]);

    return res.json({ ok: true, message: "Slaptažodis atnaujintas" });
  } catch (err) {
    if (err?.issues) {
      return res.status(400).json({ error: "Neteisingai užpildyti laukeliai", issues: err.issues });
    }
    console.error("POST /users/change-password error:", err);
    return res.status(500).json({ error: "Serverio klaida. Bandykite vėliau." });
  }
});

export default router;