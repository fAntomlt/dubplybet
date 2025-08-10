import { Router } from "express";
import { z } from "zod";
import pool from "../db.js";

const router = Router();

const GameSchema = z.object({
  tournament_id: z.number().int().positive(),
  team_a: z.string().min(1, "Reikalinga komanda A").max(120),
  team_b: z.string().min(1, "Reikalinga komanda B").max(120),
  tipoff_at: z.string(), // ISO or "YYYY-MM-DD HH:mm:ss"
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

// Edit game (names/time)
router.patch("/games/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Neteisingas ID" });

  const fields = [];
  const values = [];
  for (const k of ["team_a", "team_b", "tipoff_at", "status"]) {
    if (k in req.body) { fields.push(`${k} = ?`); values.push(req.body[k]); }
  }
  if (!fields.length) return res.status(400).json({ error: "Nėra ką atnaujinti" });

  values.push(id);
  await pool.query(`UPDATE games SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`, values);
  return res.json({ ok: true, message: "Rungtynės atnaujintos" });
});

// Delete game (only before finished)
router.delete("/games/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Neteisingas ID" });
  await pool.query("DELETE FROM games WHERE id = ?", [id]);
  return res.json({ ok: true, message: "Rungtynės ištrintos" });
});

// Finish game (sets final score + status=finished)
router.post("/games/:id/finish", async (req, res) => {
  const id = Number(req.params.id);
  const { score_a, score_b } = req.body || {};
  if (!id || score_a == null || score_b == null) {
    return res.status(400).json({ error: "Trūksta rezultatų" });
  }
  await pool.query(
    "UPDATE games SET score_a=?, score_b=?, status='finished', updated_at = NOW() WHERE id = ?",
    [Number(score_a), Number(score_b), id]
  );
  return res.json({ ok: true, message: "Rungtynės užbaigtos" });
});

export default router;