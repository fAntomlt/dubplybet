import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET /api/games/:id/guesses
router.get("/:id/guesses", async (req, res) => {
  const gameId = Number(req.params.id || 0);
  if (!gameId) return res.status(400).json({ error: "Neteisingas rungtynių ID" });

  try {
    const [rows] = await pool.query(
      `SELECT g.user_id, u.username, g.guess_a, g.guess_b
         FROM guesses g
         JOIN users u ON u.id = g.user_id
        WHERE g.game_id = ?
        ORDER BY u.username ASC`,
      [gameId]
    );
    return res.json({ ok: true, guesses: rows });
  } catch (e) {
    console.error("public guesses error:", e);
    return res.status(500).json({ error: "Serverio klaida. Bandykite vėliau." });
  }
});

export default router;