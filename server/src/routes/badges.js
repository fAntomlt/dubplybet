// routes/badges.js
import { Router } from "express";
import pool from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();

/* ---------- Public: list a user's badges ---------- */
router.get("/users/:id/badges", async (req, res) => {
  const { id } = req.params;
  const [rows] = await pool.query(
    `SELECT b.id,b.slug,b.name,b.description,b.color,b.bg,b.icon,ub.assigned_at
       FROM user_badges ub
       JOIN badges b ON b.id = ub.badge_id
      WHERE ub.user_id = ?
      ORDER BY ub.assigned_at DESC`,
    [id]
  );
  res.json({ ok: true, badges: rows });
});

/* ---------- Admin: catalog CRUD ---------- */
router.get("/admin/badges", requireAuth, requireAdmin, async (_req, res) => {
  const [rows] = await pool.query(`SELECT * FROM badges ORDER BY name ASC`);
  res.json({ ok: true, badges: rows });
});

router.post("/admin/badges", requireAuth, requireAdmin, async (req, res) => {
  const { slug, name, description, color, bg, icon } = req.body;
  await pool.query(
    `INSERT INTO badges (slug,name,description,color,bg,icon) VALUES (?,?,?,?,?,?)`,
    [slug, name, description, color, bg, icon]
  );
  res.json({ ok: true });
});

router.patch("/admin/badges/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, description, color, bg, icon } = req.body;
  await pool.query(
    `UPDATE badges SET name=?, description=?, color=?, bg=?, icon=? WHERE id=?`,
    [name, description, color, bg, icon, id]
  );
  res.json({ ok: true });
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