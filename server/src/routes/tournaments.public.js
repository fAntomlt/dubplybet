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

export default router;