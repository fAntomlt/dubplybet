import { Router } from "express";
import pool from "../db.js";

const router = Router();

// LIST
router.get("/", async (req, res) => {
  const type = String(req.query.type || "");
  if (type !== "post" && type !== "update") return res.status(400).json({ error: "type privalomas" });

  const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
  const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

  const [rows] = await pool.query(
    `SELECT p.id, p.type, p.title, p.version, p.slug, p.header_url,
            p.pinned, p.pinned_at, p.created_at,
            u.username, u.avatar_url AS avatarUrl, u.id AS author_id
       FROM posts p
       JOIN users u ON u.id = p.author_id
      WHERE p.type = ?
      ORDER BY p.pinned DESC, p.pinned_at DESC, p.created_at DESC
      LIMIT ? OFFSET ?`,
    [type, limit, offset]
  );
  res.json({ ok: true, posts: rows });
});

// DETAIL
router.get("/:key", async (req, res) => {
  const key = req.params.key;
  const isId = /^\d+$/.test(key);
  const [rows] = await pool.query(
    `SELECT p.*, u.username, u.avatar_url AS avatarUrl, u.id AS author_id
       FROM posts p
       JOIN users u ON u.id = p.author_id
      WHERE ${isId ? "p.id = ?" : "p.slug = ?"} LIMIT 1`,
    [key]
  );
  if (!rows.length) return res.status(404).json({ error: "Nerasta" });
  res.json({ ok: true, post: rows[0] });
});

export default router;