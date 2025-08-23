import { Router } from "express";
import { z } from "zod";
import pool from "../db.js";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";

const router = Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 4 * 1024 * 1024 } });

const TournamentSchema = z.object({
  name: z.string().min(3, "Pavadinimas per trumpas").max(120, "Pavadinimas per ilgas"),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/,"Neteisinga data"),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/,"Neteisinga data"),
  // allow relative /uploads/... (what FE will send back after upload)
  cover_url: z.string().regex(/^\/uploads\/.+$/, "Neteisingas kelias").optional().nullable(),
}).refine(o => !o.start_date || !o.end_date || o.start_date <= o.end_date, { message: "Data neteisinga" });

// GET list
router.get("/tournaments", async (_req, res) => {
  const [rows] = await pool.query("SELECT * FROM tournaments ORDER BY created_at DESC");
  return res.json({ ok: true, tournaments: rows });
});

// POST create
router.post("/tournaments", async (req, res) => {
  try {
    const { name, start_date, end_date, cover_url = null } = TournamentSchema.parse(req.body);
    const [r] = await pool.query(
      "INSERT INTO tournaments (name, start_date, end_date, status, cover_url) VALUES (?,?,?,'draft',?)",
      [name, start_date, end_date, cover_url]
    );
    return res.json({ ok: true, id: r.insertId, message: "Turnyras sukurtas" });
  } catch (e) {
    return res.status(400).json({ error: e?.issues ? "Neteisingi duomenys" : "Serverio klaida" });
  }
});

// POST /api/admin/tournaments/upload-cover  (multipart/form-data, field: "file")
router.post("/tournaments/upload-cover", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Failas nepridėtas" });
    // ensure dir
    const outDir = path.join(__dirname, "../../uploads/tournament_covers");
    await fs.promises.mkdir(outDir, { recursive: true });

    const id = nanoid(12);
    const outPath = path.join(outDir, `${id}.webp`);

    // cover-ish crop 16:9, WebP
    await sharp(req.file.buffer)
      .resize(1600, 900, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toFile(outPath);

    const url = `/uploads/tournament_covers/${id}.webp`;
    res.json({ ok: true, url });
  } catch (e) {
    console.error("upload-cover error:", e);
    res.status(500).json({ error: "Klaida įkeliant" });
  }
});

// PATCH update (name/dates/status)
router.patch("/tournaments/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Neteisingas ID" });

  const fields = [];
  const values = [];
  const allowed = ["name", "start_date", "end_date", "status"];
  for (const k of allowed) {
    if (k in req.body) { fields.push(`${k} = ?`); values.push(req.body[k]); }
  }
  if (!fields.length) return res.status(400).json({ error: "Nėra ką atnaujinti" });

  values.push(id);
  await pool.query(`UPDATE tournaments SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`, values);
  return res.json({ ok: true, message: "Turnyras atnaujintas" });
});

// POST finish tournament (sets winner + archive)
router.post("/tournaments/:id/finish", async (req, res) => {
  const id = Number(req.params.id);
  const { winner_team } = req.body || {};
  if (!id || !winner_team) return res.status(400).json({ error: "Trūksta pavadinimo" });

  await pool.query(
    "UPDATE tournaments SET status='archived', winner_team = ?, updated_at = NOW() WHERE id = ?",
    [winner_team, id]
  );
  return res.json({ ok: true, message: "Turnyras užbaigtas" });
});

// DELETE
router.delete("/tournaments/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Neteisingas ID" });
  await pool.query("DELETE FROM tournaments WHERE id = ?", [id]);
  return res.json({ ok: true, message: "Turnyras ištrintas" });
});

export default router;