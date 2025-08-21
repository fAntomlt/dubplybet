import { Router } from "express";
import { z } from "zod";
import pool from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireAdmin);

// GET /api/admin/tickets?state=open|accepted|closed
router.get("/tickets", async (req, res) => {
  const state = String(req.query.state || "open");
  const params = [];
  let where = "1=1";
  if (["open", "accepted", "closed"].includes(state)) { where += " AND t.state = ?"; params.push(state); }

  const [rows] = await pool.query(
    `SELECT t.id, t.title, t.state, t.created_at,
            u.username AS user_name, u.avatar_url AS user_avatar,
            a.username AS admin_name, a.avatar_url AS admin_avatar
       FROM tickets t
       JOIN users u ON u.id = t.user_id
  LEFT JOIN users a ON a.id = t.assigned_admin_id
      WHERE ${where}
      ORDER BY t.state = 'open' DESC, t.last_message_at DESC, t.id DESC`,
    params
  );
  res.json({ ok: true, tickets: rows });
});

// GET /api/admin/tickets/:id — details + messages
router.get("/tickets/:id", async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ error: "Blogas ID" });

  const [[meta]] = await pool.query(
    `SELECT t.*, u.username AS user_name, u.avatar_url AS user_avatar,
            a.username AS admin_name, a.avatar_url AS admin_avatar
       FROM tickets t
       JOIN users u ON u.id = t.user_id
  LEFT JOIN users a ON a.id = t.assigned_admin_id
      WHERE t.id = ? LIMIT 1`,
    [id]
  );
  if (!meta) return res.status(404).json({ error: "Nerasta" });

  const [msgs] = await pool.query(
    `SELECT m.id, m.sender_id, m.sender_role, m.content, m.created_at,
            u.username, u.avatar_url AS avatar
       FROM ticket_messages m
       JOIN users u ON u.id = m.sender_id
      WHERE m.ticket_id = ?
      ORDER BY m.id ASC`,
    [id]
  );

  res.json({ ok: true, ticket: meta, messages: msgs });
});

// POST /api/admin/tickets/:id/messages — admin reply => auto-assign & set accepted
const MsgSchema = z.object({ content: z.string().min(1).max(2000) });
router.post("/tickets/:id/messages", async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ error: "Blogas ID" });
  const { content } = MsgSchema.parse(req.body || {});
  const adminId = req.user.uid;

  const [[t]] = await pool.query(`SELECT state, assigned_admin_id FROM tickets WHERE id = ? LIMIT 1`, [id]);
  if (!t) return res.status(404).json({ error: "Nerasta" });
  if (t.state === "closed") return res.status(400).json({ error: "Bilietas uždarytas" });
  if (t.assigned_admin_id && String(t.assigned_admin_id) !== String(adminId)) {
    return res.status(403).json({ error: "Bilietą jau tvarko kitas administratorius" });
  }

  await pool.query(
    `INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, content) VALUES (?,?, 'admin', ?)`,
    [id, adminId, content]
  );
  await pool.query(
    `UPDATE tickets SET assigned_admin_id = COALESCE(assigned_admin_id, ?), state = 'accepted', last_message_at = NOW(), updated_at = NOW() WHERE id = ?`,
    [adminId, id]
  );

  res.json({ ok: true });
});

// PATCH /api/admin/tickets/:id/close — close & lock messaging
router.patch("/tickets/:id/close", async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ error: "Blogas ID" });
  await pool.query(`UPDATE tickets SET state = 'closed', updated_at = NOW() WHERE id = ?`, [id]);
  res.json({ ok: true });
});

// DELETE /api/admin/tickets/:id — delete ticket
router.delete("/tickets/:id", async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ error: "Blogas ID" });
  await pool.query(`DELETE FROM tickets WHERE id = ?`, [id]);
  res.json({ ok: true });
});

export default router;