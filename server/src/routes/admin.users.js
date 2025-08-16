import { Router } from "express";
import pool from "../db.js";
import { z } from "zod";

const router = Router();

/**
 * GET /api/admin/users?search=&limit=50&offset=0
 * Returns email, username, discord_username, role, email_verified, created_at
 */
router.get("/users", async (req, res) => {
  const search = String(req.query.search || "").trim();
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 200);
  const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

  const q = `%${search}%`;

  try {
    const [rows] = await pool.query(
      `SELECT id, email, username, discord_username, role, email_verified, created_at
         FROM users
        WHERE (? = '' OR email LIKE ? OR username LIKE ? OR discord_username LIKE ?)
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?`,
      [search, q, q, q, limit, offset]
    );

    return res.json({ ok: true, users: rows });
  } catch (e) {
    console.error("admin users error:", e);
    return res.status(500).json({ error: "Serverio klaida. Bandykite vėliau." });
  }
});

const DISCORD_RE = /^(?!.*\.\.)[a-z0-9._]{2,32}$/;

const UpdateUserSchema = z.object({
  email: z.string().email("Neteisingas el. pašto formatas").max(191).optional(),
  username: z.string().min(3, "Vardas per trumpas").max(50, "Vardas per ilgas").optional(),
  discord_username: z.string()
    .transform(s => String(s).trim().toLowerCase())
    .refine(s => DISCORD_RE.test(s), "Neteisingas Discord vardas")
    .optional(),
}).refine(d => Object.keys(d).length > 0, { message: "Nėra ką atnaujinti" });

router.patch("/users/:id", async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ error: "Neteisingas ID" });

  try {
    const payload = UpdateUserSchema.parse(req.body);

    // Uniqueness checks only for provided fields
    if (payload.email) {
      const [r] = await pool.query(
        "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
        [payload.email, id]
      );
      if (r.length) return res.status(400).json({ error: "El. paštas jau naudojamas" });
    }
    if (payload.username) {
      const [r] = await pool.query(
        "SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1",
        [payload.username, id]
      );
      if (r.length) return res.status(400).json({ error: "Vartotojo vardas jau naudojamas" });
    }
    if (payload.discord_username) {
      const [r] = await pool.query(
        "SELECT id FROM users WHERE discord_username = ? AND id <> ? LIMIT 1",
        [payload.discord_username, id]
      );
      if (r.length) return res.status(400).json({ error: "Discord vardas jau naudojamas" });
    }

    const fields = [];
    const values = [];
    for (const k of ["email", "username", "discord_username"]) {
      if (payload[k] != null) { fields.push(`${k} = ?`); values.push(payload[k]); }
    }
    if (!fields.length) return res.status(400).json({ error: "Nėra ką atnaujinti" });

    values.push(id);
    await pool.query(
      `UPDATE users SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`,
      values
    );

    return res.json({ ok: true, message: "Vartotojas atnaujintas" });
  } catch (e) {
    if (e?.issues) return res.status(400).json({ error: "Neteisingi duomenys", issues: e.issues });
    console.error("admin users PATCH error:", e);
    return res.status(500).json({ error: "Serverio klaida. Bandykite vėliau." });
  }
});

/* ======================= NEW: DELETE USER ======================= */
router.delete("/users/:id", async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ error: "Neteisingas ID" });

  try {
    // optional safeguard: avoid deleting yourself
    if (req.user?.uid && Number(req.user.uid) === id) {
      return res.status(400).json({ error: "Negalite ištrinti savo paskyros" });
    }

    const [r] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
    if (!r.affectedRows) return res.status(404).json({ error: "Vartotojas nerastas" });

    return res.json({ ok: true, message: "Paskyra ištrinta" });
  } catch (e) {
    console.error("admin users DELETE error:", e);
    return res.status(500).json({ error: "Serverio klaida. Bandykite vėliau." });
  }
});

export default router;