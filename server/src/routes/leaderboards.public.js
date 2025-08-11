import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET /api/leaderboards/tournament/:tid
router.get("/tournament/:tid", async (req, res) => {
  const tid = Number(req.params.tid || 0);
  if (!tid) return res.status(400).json({ error: "Neteisingas turnyro ID" });

  const [rows] = await pool.query(
    `SELECT ts.user_id, u.username, ts.points, ts.correct_any
       FROM tournament_scores ts
       JOIN users u ON u.id = ts.user_id
      WHERE ts.tournament_id = ?
      ORDER BY ts.points DESC, u.username ASC
      LIMIT 200`,
    [tid]
  );

  return res.json({ ok: true, leaderboard: rows });
});

// GET /api/leaderboards/all-time
// Sum correct_any across all tournaments
router.get("/all-time", async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT u.id as user_id, u.username, SUM(ts.correct_any) as correct_any
       FROM tournament_scores ts
       JOIN users u ON u.id = ts.user_id
      GROUP BY u.id, u.username
      HAVING correct_any > 0
      ORDER BY correct_any DESC, u.username ASC
      LIMIT 500`
  );
  return res.json({ ok: true, leaderboard: rows });
});

export default router;