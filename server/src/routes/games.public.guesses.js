import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET /api/games/:id/guesses
// GET /api/games/:id/guesses?order=points|team
router.get("/:id/guesses", async (req, res) => {
  const gameId = Number(req.params.id || 0);
  if (!gameId) return res.status(400).json({ error: "Neteisingas rungtynių ID" });

  const order = String(req.query.order || "team"); // default alpha by username
  let orderSql = "u.username ASC";
  if (order === "points") orderSql = "g.awarded_points DESC, u.username ASC";

  try {
    const [rows] = await pool.query(
      `SELECT g.user_id,
              u.username,
              g.guess_a,
              g.guess_b,
              g.cond_ok,
              g.diff_ok,
              g.exact_ok,
              g.awarded_points,
              g.created_at
         FROM guesses g
         JOIN users u ON u.id = g.user_id
        WHERE g.game_id = ?
        ORDER BY ${orderSql}`,
      [gameId]
    );
    return res.json({ ok: true, guesses: rows });
  } catch (e) {
    console.error("public guesses error:", e);
    return res.status(500).json({ error: "Serverio klaida" });
  }
});

export default router;