import { Router } from "express";
import { z } from "zod";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { isLocked } from "../utils/gameLock.js";

const router = Router();

const GuessSchema = z.object({
  guess_a: z.number().int().min(0).max(300), // sane ranges
  guess_b: z.number().int().min(0).max(300),
});

// POST /api/games/:id/guess  { guess_a, guess_b }
router.post("/:id/guess", requireAuth, async (req, res) => {
  const gameId = Number(req.params.id || 0);
  if (!gameId) return res.status(400).json({ error: "Neteisingas rungtynių ID" });

  try {
    const [gRows] = await pool.query(`SELECT * FROM games WHERE id = ? LIMIT 1`, [gameId]);
    if (!gRows.length) return res.status(404).json({ error: "Rungtynės nerastos" });
    const game = gRows[0];
    if (isLocked(game)) return res.status(400).json({ error: "Spėjimai užrakinti prieš 10 min. iki rungtynių" });

    // must be verified
    const [uRows] = await pool.query(`SELECT email_verified FROM users WHERE id = ?`, [req.user.uid]);
    if (!uRows.length || !uRows[0].email_verified) {
      return res.status(403).json({ error: "Paskyra nepatvirtinta el. paštu" });
    }

    const body = GuessSchema.parse(req.body);
    const [ins] = await pool.query(
      `INSERT INTO guesses (tournament_id, game_id, user_id, guess_a, guess_b)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE guess_a = VALUES(guess_a), guess_b = VALUES(guess_b), updated_at = NOW()`,
      [game.tournament_id, game.id, req.user.uid, body.guess_a, body.guess_b]
    );

    return res.json({ ok: true, message: "Spėjimas išsaugotas" });
  } catch (e) {
    if (e?.issues) return res.status(400).json({ error: "Neteisingi duomenys" });
    console.error("save guess error:", e);
    return res.status(500).json({ error: "Serverio klaida. Bandykite vėliau." });
  }
});

export default router;