import { Router } from "express";
import { z } from "zod";
import pool from "../db.js";

const router = Router();

const TournamentSchema = z.object({
  name: z.string().min(3, "Pavadinimas per trumpas").max(120, "Pavadinimas per ilgas"),
  start_date: z.string(), // "YYYY-MM-DD"
  end_date: z.string(),   // "YYYY-MM-DD"
});

// GET list
router.get("/tournaments", async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM tournaments ORDER BY created_at DESC");
  return res.json({ ok: true, tournaments: rows });
});

// POST create
router.post("/tournaments", async (req, res) => {
  try {
    const { name, start_date, end_date } = TournamentSchema.parse(req.body);
    const [r] = await pool.query(
      "INSERT INTO tournaments (name, start_date, end_date, status) VALUES (?,?,?,'draft')",
      [name, start_date, end_date]
    );
    return res.json({ ok: true, id: r.insertId, message: "Turnyras sukurtas" });
  } catch (e) {
    return res.status(400).json({ error: e?.issues ? "Neteisingi duomenys" : "Serverio klaida" });
  }
});

// PATCH update (name/dates/status)
router.patch("/tournaments/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Neteisingas ID" });

  const fields = [];
  const values = [];
  const allowed = ["name", "start_date", "end_date", "status"];
  for (const k of allowed) {
    if (k in req.body) { fields.push(`${k} = ?`); values.push(req.body[k]); }
  }
  if (!fields.length) return res.status(400).json({ error: "Nėra ką atnaujinti" });

  values.push(id);
  await pool.query(`UPDATE tournaments SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`, values);
  return res.json({ ok: true, message: "Turnyras atnaujintas" });
});

// POST finish tournament (sets winner + archive)
router.post("/tournaments/:id/finish", async (req, res) => {
  const id = Number(req.params.id);
  const { winner_team } = req.body || {};
  if (!id || !winner_team) return res.status(400).json({ error: "Trūksta pavadinimo" });

  await pool.query(
    "UPDATE tournaments SET status='archived', winner_team = ?, updated_at = NOW() WHERE id = ?",
    [winner_team, id]
  );
  return res.json({ ok: true, message: "Turnyras užbaigtas" });
});

// DELETE
router.delete("/tournaments/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Neteisingas ID" });
  await pool.query("DELETE FROM tournaments WHERE id = ?", [id]);
  return res.json({ ok: true, message: "Turnyras ištrintas" });
});

export default router;