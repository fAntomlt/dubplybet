// server/src/routes/tournaments.winner-picks.js
import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { z } from "zod";

const router = Router();

// sanity: Lithuanian team name (you can relax later if needed)
const TeamSchema = z.string().min(2).max(120);

// GET /api/tournaments/:tid/winner-pick
// Returns { ok:true, team } if user already picked for this tournament.
// 404 if not found (no pick yet).
router.get("/:tid/winner-pick", requireAuth, async (req, res) => {
  try {
    const tid = Number(req.params.tid || 0);
    if (!tid) return res.status(400).json({ error: "Neteisingas turnyro ID" });

    const [rows] = await pool.query(
      "SELECT team FROM tournament_winner_picks WHERE tournament_id = ? AND user_id = ? LIMIT 1",
      [tid, req.user.uid]
    );
    if (!rows.length) return res.status(404).json({ error: "Dar nepasirinkote nugalėtojo" });
    return res.json({ ok: true, team: rows[0].team });
  } catch (e) {
    console.error("GET winner-pick error:", e);
    return res.status(500).json({ error: "Serverio klaida" });
  }
});

// POST /api/tournaments/:tid/winner-pick  { team }
// One-shot: reject if already exists. (Admin could add a PUT later if you want edits.)
router.post("/:tid/winner-pick", requireAuth, async (req, res) => {
  try {
    const tid = Number(req.params.tid || 0);
    if (!tid) return res.status(400).json({ error: "Neteisingas turnyro ID" });

    // Check tournament exists and is not archived
    const [trows] = await pool.query(
      "SELECT id, status FROM tournaments WHERE id = ? LIMIT 1",
      [tid]
    );
    if (!trows.length) return res.status(404).json({ error: "Turnyras nerastas" });
    if (trows[0].status === "archived") {
      return res.status(400).json({ error: "Turnyras archyvuotas — pasirinkimo keisti negalima" });
    }

    // must be email-verified like your guesses
    const [uRows] = await pool.query(
      "SELECT email_verified FROM users WHERE id = ? LIMIT 1",
      [req.user.uid]
    );
    if (!uRows.length || !uRows[0].email_verified) {
      return res.status(403).json({ error: "Paskyra nepatvirtinta el. paštu" });
    }

    const team = TeamSchema.parse((req.body?.team || "").trim());

    // prevent duplicates
    const [exists] = await pool.query(
      "SELECT id FROM tournament_winner_picks WHERE tournament_id = ? AND user_id = ? LIMIT 1",
      [tid, req.user.uid]
    );
    if (exists.length) {
      return res.status(409).json({ error: "Jau pasirinkote šio turnyro nugalėtoją" });
    }

    await pool.query(
      "INSERT INTO tournament_winner_picks (tournament_id, user_id, team) VALUES (?,?,?)",
      [tid, req.user.uid, team]
    );

    return res.json({ ok: true, team });
  } catch (e) {
    if (e?.issues) return res.status(400).json({ error: "Neteisingi duomenys" });
    console.error("POST winner-pick error:", e);
    return res.status(500).json({ error: "Serverio klaida" });
  }
});

export default router;