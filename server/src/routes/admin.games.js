import { Router } from "express";
import { z } from "zod";
import pool from "../db.js";
import { scoreGuess } from "../utils/scoring.js";

const router = Router();

const GameSchema = z.object({
  tournament_id: z.number().int().positive(),
  team_a: z.string().min(1, "Reikalinga komanda A").max(120),
  team_b: z.string().min(1, "Reikalinga komanda B").max(120),
  tipoff_at: z.string(), // ISO or "YYYY-MM-DD HH:mm:ss"
  stage: z.enum(["group", "playoff"]).optional().default("group"),
});

// List games by tournament
router.get("/tournaments/:tid/games", async (req, res) => {
  const tid = Number(req.params.tid);
  if (!tid) return res.status(400).json({ error: "Neteisingas turnyro ID" });
  const [rows] = await pool.query(
    "SELECT * FROM games WHERE tournament_id = ? ORDER BY tipoff_at ASC",
    [tid]
  );
  return res.json({ ok: true, games: rows });
});

// Create game
router.post("/games", async (req, res) => {
  try {
    const { tournament_id, team_a, team_b, tipoff_at } = GameSchema.parse(req.body);
    const [r] = await pool.query(
      "INSERT INTO games (tournament_id, team_a, team_b, tipoff_at, status) VALUES (?,?,?,?, 'scheduled')",
      [tournament_id, team_a, team_b, tipoff_at]
    );
    return res.json({ ok: true, id: r.insertId, message: "Rungtynės sukurtos" });
  } catch (e) {
    return res.status(400).json({ error: e?.issues ? "Neteisingi duomenys" : "Serverio klaida" });
  }
});

// Edit game (names/time/status/stage)
router.patch("/games/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Neteisingas ID" });

  const fields = [];
  const values = [];
  // Allow stage updates (UI already calls this)
  for (const k of ["team_a", "team_b", "tipoff_at", "status", "stage"]) {
    if (k in req.body) { fields.push(`${k} = ?`); values.push(req.body[k]); }
  }
  if (!fields.length) return res.status(400).json({ error: "Nėra ką atnaujinti" });

  values.push(id);
  await pool.query(`UPDATE games SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`, values);
  return res.json({ ok: true, message: "Rungtynės atnaujintos" });
});

// Delete game
router.delete("/games/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Neteisingas ID" });
  await pool.query("DELETE FROM games WHERE id = ?", [id]);
  return res.json({ ok: true, message: "Rungtynės ištrintos" });
});

// ===== NEW: Admin guesses list for a game =====
// GET /api/admin/games/:id/guesses
router.get("/games/:id/guesses", async (req, res) => {
  const gameId = Number(req.params.id || 0);
  if (!gameId) return res.status(400).json({ error: "Neteisingas rungtynių ID" });

  try {
    const [rows] = await pool.query(
      `SELECT
         g.id,
         g.user_id,
         u.username AS user_name,
         u.email,
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
       ORDER BY g.created_at ASC`,
      [gameId]
    );
    return res.json({ ok: true, guesses: rows });
  } catch (e) {
    console.error("admin list guesses error:", e);
    return res.status(500).json({ error: "Serverio klaida" });
  }
});

// ===== NEW: Admin delete a guess (only if game not finished) =====
// DELETE /api/admin/guesses/:id
router.delete("/guesses/:id", async (req, res) => {
  const guessId = Number(req.params.id || 0);
  if (!guessId) return res.status(400).json({ error: "Neteisingas spėjimo ID" });

  try {
    // Find guess + its game
    const [[guess]] = await pool.query(
      `SELECT g.id, g.game_id, gm.status
         FROM guesses g
         JOIN games gm ON gm.id = g.game_id
        WHERE g.id = ?
        LIMIT 1`,
      [guessId]
    );
    if (!guess) return res.status(404).json({ error: "Spėjimas nerastas" });
    if (guess.status === "finished") {
      return res.status(400).json({ error: "Negalima trinti: rungtynės jau užbaigtos" });
    }

    await pool.query("DELETE FROM guesses WHERE id = ?", [guessId]);
    return res.json({ ok: true, message: "Spėjimas ištrintas" });
  } catch (e) {
    console.error("admin delete guess error:", e);
    return res.status(500).json({ error: "Serverio klaida" });
  }
});

// Finish game (sets final score + status=finished)
router.post("/games/:id/finish", async (req, res) => {
  const id = Number(req.params.id);
  const { score_a, score_b } = req.body || {};
  if (!id || score_a == null || score_b == null) {
    return res.status(400).json({ error: "Trūksta rezultatų" });
  }

  // 1) Update game result
  await pool.query(
    "UPDATE games SET score_a=?, score_b=?, status='finished', updated_at = NOW() WHERE id = ?",
    [Number(score_a), Number(score_b), id]
  );

  // 2) Load game with stage + tournament
  const [[game]] = await pool.query(
    `SELECT id, tournament_id, stage, score_a, score_b FROM games WHERE id = ? LIMIT 1`,
    [id]
  );

  // 3) Score each guess for this game
  const [gs] = await pool.query(
    `SELECT id, user_id, guess_a, guess_b FROM guesses WHERE game_id = ?`,
    [id]
  );

  for (const g of gs) {
    const { cond_ok, diff_ok, exact_ok, points } = scoreGuess({
      stage: game.stage,
      guess_a: g.guess_a,
      guess_b: g.guess_b,
      score_a: game.score_a,
      score_b: game.score_b,
    });

    // update guess row
    await pool.query(
      `UPDATE guesses
          SET cond_ok=?, diff_ok=?, exact_ok=?, awarded_points=?, updated_at=NOW()
        WHERE id = ?`,
      [cond_ok, diff_ok, exact_ok, points, g.id]
    );

    // upsert tournament_scores
    await pool.query(
      `INSERT INTO tournament_scores (tournament_id, user_id, points, correct_any, updated_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         points = points + VALUES(points),
         correct_any = correct_any + VALUES(correct_any),
         updated_at = NOW()`,
      [game.tournament_id, g.user_id, points, cond_ok ? 1 : 0]
    );
  }

  return res.json({ ok: true, message: "Rungtynės užbaigtos ir įvertintos" });
});

export default router;