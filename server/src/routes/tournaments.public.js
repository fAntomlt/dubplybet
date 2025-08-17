import { Router } from "express";
import pool from "../db.js";

const router = Router();

// GET /api/tournaments
// Public list for the website (no auth). Frontend will sort/slice per-section.
router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, name, start_date, end_date, status, winner_team /* cover_url optional */ FROM tournaments ORDER BY created_at DESC"
    );
    return res.json({ ok: true, tournaments: rows });
  } catch (e) {
    console.error("public tournaments list error:", e);
    return res.status(500).json({ error: "Serverio klaida" });
  }
});

// GET /api/tournaments/:id
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ error: "Neteisingas ID" });
  try {
    const [rows] = await pool.query(
      "SELECT id, name, start_date, end_date, status, winner_team FROM tournaments WHERE id = ? LIMIT 1",
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: "Nerasta" });
    return res.json({ ok: true, tournament: rows[0] });
  } catch (e) {
    return res.status(500).json({ error: "Serverio klaida" });
  }
});

export default router;