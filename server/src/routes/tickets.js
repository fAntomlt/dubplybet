import { Router } from "express";
import { z } from "zod";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const CreateSchema = z.object({
  title: z.string().min(3).max(50),
  content: z.string().min(3).max(2000),
});

// POST /api/tickets — create ticket (with first message)
router.post("/", async (req, res) => {
  try {
    const { title, content } = CreateSchema.parse(req.body || {});
    const uid = req.user.uid;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [ins] = await conn.query(
        `INSERT INTO tickets (user_id, title, state, last_message_at) VALUES (?,?, 'open', NOW())`,
        [uid, title]
      );
      const ticketId = ins.insertId;
      await conn.query(
        `INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, content) VALUES (?,?, 'user', ?)`,
        [ticketId, uid, content]
      );
      await conn.commit();
      return res.json({ ok: true, id: ticketId });
    } catch (e) {
      try { await conn.rollback(); } catch {}
      throw e;
    } finally {
      conn.release();
    }
  } catch (e) {
    if (e?.issues) return res.status(400).json({ error: "Neteisingi duomenys" });
    return res.status(500).json({ error: "Serverio klaida" });
  }
});

// GET /api/tickets/mine?state=open|accepted|closed|all
router.get("/mine", async (req, res) => {
  const uid = req.user.uid;
  const state = String(req.query.state || "all");
  const params = [uid];
  let where = "user_id = ?";
  if (["open", "accepted", "closed"].includes(state)) {
    where += " AND state = ?"; params.push(state);
  }
  const [rows] = await pool.query(
    `SELECT id, title, state, created_at FROM tickets WHERE ${where} ORDER BY id DESC`,
    params
  );
  res.json({ ok: true, tickets: rows });
});

// Ownership guard helper
async function canAccessTicket(ticketId, uid) {
  const [[t]] = await pool.query(`SELECT id, user_id FROM tickets WHERE id = ? LIMIT 1`, [ticketId]);
  if (!t) return { ok: false };
  return { ok: String(t.user_id) === String(uid) };
}

// GET /api/tickets/:id — details + messages
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ error: "Blogas ID" });

  // allow owner OR admin (checked in a subquery)
  const uid = req.user.uid;
  const [[meta]] = await pool.query(
    `SELECT t.*, u.username AS user_name, u.avatar_url AS user_avatar,
            a.username AS admin_name, a.avatar_url AS admin_avatar
       FROM tickets t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN users a ON a.id = t.assigned_admin_id
      WHERE t.id = ?
      LIMIT 1`,
    [id]
  );
  if (!meta) return res.status(404).json({ error: "Nerasta" });

  if (String(meta.user_id) !== String(uid) && (req.user.role !== "admin")) {
    return res.status(403).json({ error: "Neturite prieigos" });
  }

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

// POST /api/tickets/:id/messages — user reply (not allowed if closed)
const MsgSchema = z.object({ content: z.string().min(1).max(2000) });
router.post("/:id/messages", async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ error: "Blogas ID" });
  const { content } = MsgSchema.parse(req.body || {});
  const uid = req.user.uid;
  const { ok } = await canAccessTicket(id, uid);
  if (!ok) return res.status(403).json({ error: "Neturite prieigos" });

  const [[t]] = await pool.query(`SELECT state FROM tickets WHERE id = ? LIMIT 1`, [id]);
  if (!t) return res.status(404).json({ error: "Nerasta" });
  if (t.state === "closed") return res.status(400).json({ error: "Bilietas uždarytas" });

  await pool.query(
    `INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, content) VALUES (?,?, 'user', ?)`,
    [id, uid, content]
  );
  await pool.query(`UPDATE tickets SET last_message_at = NOW(), updated_at = NOW() WHERE id = ?`, [id]);
  res.json({ ok: true });
});

export default router;