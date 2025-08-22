// routes/badges.js
import { Router } from "express";
import pool from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

/* ---------- Public: list a user's badges ---------- */
router.get("/users/:id/badges", async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT
         b.id,
         b.slug,
         b.name,
         b.description,
         b.color_hex  AS color,
         ''           AS bg,      -- or COALESCE(b.bg_hex,'') if you add a bg column
         b.icon_key   AS icon,
         ub.assigned_at
       FROM user_badges ub
       JOIN badges b ON b.id = ub.badge_id
      WHERE ub.user_id = ?
      ORDER BY ub.assigned_at DESC`,
      [id]
    );
    res.json({ ok: true, badges: rows });
  } catch (err) {
    console.error("GET /users/:id/badges failed:", err);
    res.status(500).json({ ok: false, error: "DB error" });
  }
});

/* ---------- Admin: catalog CRUD ---------- */
router.get("/admin/badges", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, slug, name, description,
              color_hex AS color,
              ''        AS bg,     -- or bg_hex AS bg if you add it
              icon_key  AS icon,
              created_at
         FROM badges
        ORDER BY name ASC`
   );
    res.json({ ok: true, badges: rows });
  } catch (err) {
    console.error("GET /admin/badges failed:", err);
    res.status(500).json({ ok: false, error: "DB error" });
  }
});

router.post("/admin/badges", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { slug, name, description, color, icon } = req.body;
    await pool.query(
      `INSERT INTO badges (slug,name,description,color_hex,icon_key) VALUES (?,?,?,?,?)`,
      [slug, name, description ?? null, color, icon]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("POST /admin/badges failed:", err);
    res.status(500).json({ ok: false, error: "DB error" });
  }
});

router.patch("/admin/badges/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, icon } = req.body;
    await pool.query(
      `UPDATE badges SET name=?, description=?, color_hex=?, icon_key=? WHERE id=?`,
      [name, description ?? null, color, icon, id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /admin/badges/:id failed:", err);
    res.status(500).json({ ok: false, error: "DB error" });
  }
});

router.delete("/admin/badges/:id", requireAuth, requireAdmin, async (req, res) => {
  await pool.query(`DELETE FROM badges WHERE id=?`, [req.params.id]);
  res.json({ ok: true });
});

/* ---------- Admin: assign / revoke to user ---------- */
router.post(
  "/admin/users/:userId/badges/:badgeId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { userId, badgeId } = req.params;
    const adminId = req.user.uid; // matches your other routes
    await pool.query(
      `INSERT IGNORE INTO user_badges (user_id,badge_id,assigned_by) VALUES (?,?,?)`,
      [userId, badgeId, adminId]
    );
    res.json({ ok: true });
  }
);

router.delete(
  "/admin/users/:userId/badges/:badgeId",
  requireAuth,
  requireAdmin,
  async (req, res) => {
    const { userId, badgeId } = req.params;
    await pool.query(
      `DELETE FROM user_badges WHERE user_id=? AND badge_id=?`,
      [userId, badgeId]
    );
    res.json({ ok: true });
  }
);

export default router;