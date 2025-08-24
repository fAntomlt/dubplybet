import { Router } from "express";
import pool from "../db.js";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth, requireAdmin);

const Status = z.enum(['backlog','planned','upcoming','in_progress','done']);

const FeatureSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().max(5000).optional().nullable(),
  status: Status.optional().default('backlog'),
  color: z.string().max(16).optional().nullable(),
  icon: z.string().max(32).optional().nullable(),
  is_public: z.boolean().optional().default(true),
});

const FeaturePatch = FeatureSchema.partial().refine(o => Object.keys(o).length > 0);

const SubtaskSchema = z.object({
  title: z.string().min(1).max(200),
  done: z.boolean().optional().default(false),
});
const SubtaskPatch = SubtaskSchema.partial().refine(o => Object.keys(o).length > 0);

/** Admin board (all items incl. hidden) */
router.get("/board", async (_req, res) => {
  const [features] = await pool.query(
    "SELECT * FROM roadmap_features ORDER BY status, sort_index ASC, id ASC"
  );
  const ids = features.map(f => f.id);
  const subtasksByFeature = {};
  if (ids.length) {
    const [subs] = await pool.query(
      "SELECT * FROM roadmap_subtasks WHERE feature_id IN (?) ORDER BY sort_index ASC, id ASC",
      [ids]
    );
    for (const s of subs) (subtasksByFeature[s.feature_id] ||= []).push(s);
  }
  const columns = { backlog: [], planned: [], upcoming: [], in_progress: [], done: [] };
  for (const f of features) columns[f.status]?.push({ ...f, subtasks: subtasksByFeature[f.id] || [] });
  res.json({ ok: true, columns });
});

/** Create feature */
router.post("/features", async (req, res) => {
  const body = FeatureSchema.parse(req.body || {});
  // next sort_index at the end of the column
  const [[maxRow]] = await pool.query(
    "SELECT COALESCE(MAX(sort_index), -1) AS m FROM roadmap_features WHERE status = ?",
    [body.status]
  );
  const nextIdx = (maxRow?.m ?? -1) + 1;
  const [r] = await pool.query(
    `INSERT INTO roadmap_features (title, description, status, sort_index, color, icon, is_public)
     VALUES (?,?,?,?,?,?,?)`,
    [body.title, body.description ?? null, body.status, nextIdx, body.color ?? null, body.icon ?? null, body.is_public ? 1 : 0]
  );
  res.json({ ok: true, id: r.insertId });
});

/** Update feature */
router.patch("/features/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = FeaturePatch.parse(req.body || {});
  const sets = [], vals = [];
  for (const [k, v] of Object.entries(body)) {
    sets.push(`${k}=?`);
    vals.push(k === "is_public" ? (v ? 1 : 0) : v);
  }
  if (!sets.length) return res.status(400).json({ error: "No changes" });
  vals.push(id);
  await pool.query(`UPDATE roadmap_features SET ${sets.join(", ")}, updated_at=NOW() WHERE id=?`, vals);
  res.json({ ok: true });
});

/** Delete feature */
router.delete("/features/:id", async (req, res) => {
  const id = Number(req.params.id);
  await pool.query("DELETE FROM roadmap_features WHERE id=?", [id]);
  res.json({ ok: true });
});

/** Create subtask */
router.post("/features/:id/subtasks", async (req, res) => {
  const feature_id = Number(req.params.id);
  const { title, done } = SubtaskSchema.parse(req.body || {});
  const [[maxRow]] = await pool.query(
    "SELECT COALESCE(MAX(sort_index), -1) AS m FROM roadmap_subtasks WHERE feature_id = ?",
    [feature_id]
  );
  const nextIdx = (maxRow?.m ?? -1) + 1;
  const [r] = await pool.query(
    `INSERT INTO roadmap_subtasks (feature_id, title, done, sort_index) VALUES (?,?,?,?)`,
    [feature_id, title, done ? 1 : 0, nextIdx]
  );
  res.json({ ok: true, id: r.insertId });
});

/** Update subtask */
router.patch("/subtasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = SubtaskPatch.parse(req.body || {});
  const sets = [], vals = [];
  for (const [k, v] of Object.entries(body)) {
    sets.push(`${k}=?`);
    vals.push(k === "done" ? (v ? 1 : 0) : v);
  }
  vals.push(id);
  await pool.query(`UPDATE roadmap_subtasks SET ${sets.join(", ")}, updated_at=NOW() WHERE id=?`, vals);
  res.json({ ok: true });
});

/** Delete subtask */
router.delete("/subtasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  await pool.query("DELETE FROM roadmap_subtasks WHERE id=?", [id]);
  res.json({ ok: true });
});

/** Reorder features (drag & drop) – pass entire columns */
router.post("/reorder", async (req, res) => {
  const columns = req.body?.columns || {};
  const statuses = ['backlog','planned','upcoming','in_progress','done'];
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const status of statuses) {
      const ids = columns[status] || [];
      for (let i = 0; i < ids.length; i++) {
        await conn.query(
          "UPDATE roadmap_features SET status=?, sort_index=?, updated_at=NOW() WHERE id=?",
          [status, i, ids[i]]
        );
      }
    }
    await conn.commit();
    res.json({ ok: true });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    console.error("reorder error", e);
    res.status(500).json({ error: "Klaida išsaugant tvarką" });
  } finally {
    conn.release();
  }
});

export default router;