import { Router } from "express";
import pool from "../db.js";

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

export default router;