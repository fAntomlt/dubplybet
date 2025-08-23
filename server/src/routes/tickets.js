// server/src/routes/tickets.js
import { Router } from "express";
import { z } from "zod";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import sanitizeHtml from "sanitize-html";

const router = Router();
router.use(requireAuth);

// strip-all helper (same as chat)
const STRIP_ALL = { allowedTags: [], allowedAttributes: {} };
const stripAll = (v, max) =>
  sanitizeHtml(String(v ?? ""), STRIP_ALL).trim().slice(0, max);

// ---------- validation ----------
const CreateSchema = z.object({
  title: z.string().min(3).max(50),
  content: z.string().min(3).max(2000),
});

// POST /api/tickets — create ticket (with first message)
router.post("/", async (req, res) => {
  try {
    const { title, content } = CreateSchema.parse(req.body || {});
    const uid = req.user.uid;

    // sanitize after validation (length will be re-checked)
    const safeTitle = stripAll(title, 50);
    const safeContent = stripAll(content, 2000);
    if (!safeTitle || safeTitle.length < 3 || !safeContent || safeContent.length < 3) {
      return res.status(400).json({ error: "Neteisingi duomenys" });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [ins] = await conn.query(
        `INSERT INTO tickets (user_id, title, state, last_message_at)
         VALUES (?,?, 'open', NOW())`,
        [uid, safeTitle]
      );
      const ticketId = ins.insertId;
      await conn.query(
        `INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, content)
         VALUES (?,?, 'user', ?)`,
        [ticketId, uid, safeContent]
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
    `SELECT id, title, state, created_at FROM tickets
     WHERE ${where}
     ORDER BY id DESC`,
    params
  );

  // sanitize titles on the way out (belt & suspenders)
  const tickets = rows.map(r => ({ ...r, title: stripAll(r.title, 50) }));
  res.json({ ok: true, tickets });
});

// GET /api/tickets/:id — details + messages
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ error: "Blogas ID" });

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
            u.username, u.avatar_url AS avatarUrl
       FROM ticket_messages m
       JOIN users u ON u.id = m.sender_id
      WHERE m.ticket_id = ?
      ORDER BY m.id ASC`,
    [id]
  );

  // sanitize title + message bodies before returning
  const safeMeta = { ...meta, title: stripAll(meta.title, 50) };
  const safeMsgs = msgs.map(m => ({ ...m, content: stripAll(m.content, 2000) }));

  res.json({ ok: true, ticket: safeMeta, messages: safeMsgs });
});

// POST /api/tickets/:id/messages — user reply (not allowed if closed)
const MsgSchema = z.object({ content: z.string().min(1).max(2000) });
router.post("/:id/messages", async (req, res) => {
  const id = Number(req.params.id || 0);
  if (!id) return res.status(400).json({ error: "Blogas ID" });

  const { content } = MsgSchema.parse(req.body || {});
  const uid = req.user.uid;

  const [[t]] = await pool.query(`SELECT user_id, state FROM tickets WHERE id = ? LIMIT 1`, [id]);
  if (!t) return res.status(404).json({ error: "Nerasta" });
  if (String(t.user_id) !== String(uid) && (req.user.role !== "admin")) {
    return res.status(403).json({ error: "Neturite prieigos" });
  }
  if (t.state === "closed") return res.status(400).json({ error: "Bilietas uždarytas" });

  const safe = stripAll(content, 2000);
  if (!safe) return res.status(400).json({ error: "Tuščias turinys" });

  await pool.query(
    `INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, content)
     VALUES (?,?, 'user', ?)`,
    [id, uid, safe]
  );
  await pool.query(
    `UPDATE tickets SET last_message_at = NOW(), updated_at = NOW() WHERE id = ?`,
    [id]
  );
  res.json({ ok: true });
});

export default router;