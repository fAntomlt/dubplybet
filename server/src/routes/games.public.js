import { Router } from "express";
import pool from "../db.js";
import { isLocked } from "../utils/gameLock.js";
import jwt from "jsonwebtoken";

const router = Router();

// Optional auth to return user's own guess
function tryGetUserId(req) {
  const h = req.headers.authorization || "";
  if (!h.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(h.slice(7), process.env.JWT_SECRET);
    return payload?.uid ?? null;
  } catch { return null; }
}

// GET /api/games/upcoming?tournament_id=...
router.get("/upcoming", async (req, res) => {
  const tid = Number(req.query.tournament_id || 0);
  const uid = tryGetUserId(req);

  try {
    const params = [];
    let q = `SELECT g.*, t.name as tournament_name
             FROM games g
             JOIN tournaments t ON t.id = g.tournament_id
             WHERE g.status IN ('scheduled','locked')`;
    if (tid) { q += ` AND g.tournament_id = ?`; params.push(tid); }
    q += ` ORDER BY g.tipoff_at ASC LIMIT 200`;

    const [rows] = await pool.query(q, params);

    let guesses = [];
    if (uid) {
      const ids = rows.map(r => r.id);
      if (ids.length) {
        const [gs] = await pool.query(
          `SELECT game_id, guess_a, guess_b FROM guesses WHERE user_id = ? AND game_id IN (?)`,
          [uid, ids]
        );
        guesses = gs;
      }
    }

    const byGame = new Map(guesses.map(g => [g.game_id, g]));
    const data = rows.map(g => ({
      id: g.id,
      tournament_id: g.tournament_id,
      tournament_name: g.tournament_name,
      team_a: g.team_a,
      team_b: g.team_b,
      tipoff_at: g.tipoff_at,
      status: g.status,
      stage: g.stage,
      locked: isLocked(g),
      my_guess: uid ? byGame.get(g.id) || null : null,
    }));

    return res.json({ ok: true, games: data });
  } catch (e) {
    console.error("upcoming games error:", e);
    return res.status(500).json({ error: "Serverio klaida. Bandykite vėliau." });
  }
});

router.get("/finished", async (req, res) => {
  const tid = Number(req.query.tournament_id || 0);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "15", 10), 1), 100);
  const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);
  const uid = tryGetUserId(req);

  try {
    const params = [];
    let q = `SELECT g.*, t.name as tournament_name
               FROM games g
               JOIN tournaments t ON t.id = g.tournament_id
              WHERE g.status = 'finished'`;
    if (tid) { q += ` AND g.tournament_id = ?`; params.push(tid); }
    q += ` ORDER BY g.tipoff_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [rows] = await pool.query(q, params);

    let myGuesses = [];
    if (uid && rows.length) {
      const ids = rows.map(r => r.id);
      const [gs] = await pool.query(
        `SELECT game_id, guess_a, guess_b, cond_ok, diff_ok, exact_ok, awarded_points
           FROM guesses
          WHERE user_id = ? AND game_id IN (?)`,
        [uid, ids]
      );
      myGuesses = gs;
    }
    const byGame = new Map(myGuesses.map(g => [g.game_id, g]));

    const data = rows.map(g => ({
      id: g.id,
      tournament_id: g.tournament_id,
      tournament_name: g.tournament_name,
      team_a: g.team_a,
      team_b: g.team_b,
      tipoff_at: g.tipoff_at,
      stage: g.stage,
      status: g.status,
      score_a: g.score_a,
      score_b: g.score_b,
      my_guess: uid ? (byGame.get(g.id) || null) : null,
    }));

    return res.json({ ok: true, games: data });
  } catch (e) {
    console.error("finished games error:", e);
    return res.status(500).json({ error: "Serverio klaida" });
  }
});

export default router;