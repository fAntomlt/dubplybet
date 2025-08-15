import express from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

// GET /api/chat/history?limit=50
router.get("/history", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  try {
    const [rows] = await pool.query(
      `SELECT
         cm.id,
         cm.user_id      AS userId,
         cm.content,
         cm.created_at   AS createdAt,
         cm.edited_at    AS editedAt,
         u.username,
         u.avatar_url    AS avatarUrl
       FROM chat_messages cm
       JOIN users u ON u.id = cm.user_id
       ORDER BY cm.id ASC
       LIMIT ?`,
      [limit]
    );
    res.json({ ok: true, items: rows });
  } catch (err) {
    console.error("chat history error:", err);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

export default router;