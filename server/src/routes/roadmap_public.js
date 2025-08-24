import { Router } from "express";
import pool from "../db.js";

const router = Router();

/** GET /api/roadmap/board  -> public columns with visible features + subtasks */
router.get("/board", async (_req, res) => {
  const [features] = await pool.query(
    "SELECT id, title, description, status FROM roadmap_features WHERE is_public = 1 ORDER BY status, sort_index ASC, id ASC"
  );
  const ids = features.map(f => f.id);
  const subtasksByFeature = {};
  if (ids.length) {
    const [subs] = await pool.query(
      "SELECT id, feature_id, title, done FROM roadmap_subtasks WHERE feature_id IN (?) ORDER BY sort_index ASC, id ASC",
      [ids]
    );
    for (const s of subs) {
      (subtasksByFeature[s.feature_id] ||= []).push(s);
    }
  }
  const columns = { backlog: [], planned: [], upcoming: [], in_progress: [], done: [] };
  for (const f of features) {
    columns[f.status]?.push({ ...f, subtasks: subtasksByFeature[f.id] || [] });
  }
  res.json({ ok: true, columns });
});

export default router;