import { Router } from "express";
import { z } from "zod";
import pool from "../db.js";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import slugify from "slugify";
import sanitizeHtml from "sanitize-html";
import multer from "multer";
import sharp from "sharp";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const router = Router();
router.use(requireAuth, requireAdmin);

const PostSchema = z.object({
  type: z.enum(["post", "update"]),
  title: z.string().min(3).max(200),
  version: z.string().max(50).optional().nullable(),
  header_url: z.string().max(191).optional().nullable(),
  content_html: z.string().min(1),
  content_json: z.any().optional().nullable(),
  pinned: z.preprocess((v) => {
    if (v === true || v === false) return v;
    if (v === "on") return true;
    if (v === "off") return false;
    if (typeof v === "string") return v === "true" || v === "1";
    if (typeof v === "number") return v === 1;
    return false;
  }, z.boolean()).optional().default(false),
});

function sanitize(html) {
  return sanitizeHtml(html, {
    allowedTags: [
      "p","br","strong","em","u","s","a",
      "ul","ol","li","h1","h2","code","pre","blockquote","span"
    ],
    allowedAttributes: {
      a: ["href","target","rel"],
      span: ["style"],
      code: ["class"],
      h1: [], h2: [], p: [], ul: [], ol: [], li: [], strong: [], em: [], u: [], s: [], pre: [], blockquote: []
    },
    allowedSchemes: ["http","https","mailto"],
    allowedStyles: {
      "*": { color: [/^#(?:[0-9a-fA-F]{3}){1,2}$/] } // hex colors only
    },
    transformTags: {
      "a": (tag, attribs) => ({
        tagName: "a",
        attribs: {
          ...attribs,
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        }
      })
    }
  });
}

async function uniqueSlug(title) {
  const base = slugify(String(title), { lower: true, strict: true, trim: true }) || "post";
  let slug = base, n = 1;
  // try up to base-9; if still taken, append unix time
  while (true) {
    const [[row]] = await pool.query("SELECT id FROM posts WHERE slug = ? LIMIT 1", [slug]);
    if (!row) return slug;
    slug = `${base}-${n++}`;
    if (n > 9) return `${base}-${Date.now()}`;
  }
}

/* -------- CREATE -------- */
router.post("/posts", async (req, res) => {
  const conn = await pool.getConnection();
  try {
    const body = PostSchema.parse(req.body || {});
    const html = sanitize(body.content_html);
    const slug = await uniqueSlug(body.title);
    const authorId = req.user?.id ?? req.user?.uid; // use whatever your auth sets

    await conn.beginTransaction();

    if (body.pinned) {
      // free the slot before inserting the new pinned row
      await conn.query(
        "UPDATE posts SET pinned = 0, pinned_at = NULL WHERE type = ?",
        [body.type]
      );
    }

    const [r] = await conn.query(
      `INSERT INTO posts
        (type, title, version, slug, header_url, content_html, content_json, pinned, pinned_at, author_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.type,
        body.title,
        body.type === "update" ? (body.version || null) : null,
        slug,
        body.header_url || null,
        html,
        body.content_json ? JSON.stringify(body.content_json) : null,
        body.pinned ? 1 : 0,
        body.pinned ? new Date() : null,
        authorId,
      ]
    );

    await conn.commit();
    return res.json({ ok: true, id: r.insertId, slug });
  } catch (e) {
    try { await conn.rollback(); } catch {}
    // surface a useful message (helps next time)
    if (e?.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "Jau yra prisegtas įrašas šio tipo." });
    }
    console.error("create post error:", e);
    return res.status(400).json({ error: "Neteisingi duomenys" });
  } finally {
    conn.release();
  }
});

/* -------- LIST (admin) -------- */
router.get("/posts", async (req, res) => {
  const type = String(req.query.type || "");
  const q = `%${String(req.query.q || "").trim()}%`;
  const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 200);
  const offset = Math.max(parseInt(req.query.offset || "0", 10), 0);

  let where = "1=1";
  const params = [];
  if (type === "post" || type === "update") { where += " AND type = ?"; params.push(type); }
  if (q !== "%%") { where += " AND title LIKE ?"; params.push(q); }

  const [rows] = await pool.query(
    `SELECT p.*, u.username, u.avatar_url AS avatarUrl
       FROM posts p
       JOIN users u ON u.id = p.author_id
      WHERE ${where}
      ORDER BY p.pinned DESC, p.pinned_at DESC, p.created_at DESC
      LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  res.json({ ok: true, posts: rows });
});

/* -------- UPDATE -------- */
router.patch("/posts/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Bad id" });

  const allowed = ["title","version","header_url","content_html","content_json","pinned"];
  const sets = [];
  const vals = [];
  for (const k of allowed) {
    if (k in req.body) {
      if (k === "content_html") vals.push(sanitize(req.body[k]));
      else if (k === "content_json") vals.push(req.body[k] ? JSON.stringify(req.body[k]) : null);
      else vals.push(req.body[k]);
      sets.push(`${k} = ?`);
    }
  }
  if (!sets.length) return res.status(400).json({ error: "Nėra ką atnaujinti" });

  await pool.query(`UPDATE posts SET ${sets.join(", ")}, updated_at = NOW() WHERE id = ?`, [...vals, id]);

  // if pinned toggled to true → unpin others in same type
  if (req.body?.pinned) {
    const [[row]] = await pool.query("SELECT type FROM posts WHERE id = ? LIMIT 1", [id]);
    if (row?.type) {
      await pool.query("UPDATE posts SET pinned = 0, pinned_at = NULL WHERE type = ? AND id <> ?", [row.type, id]);
      await pool.query("UPDATE posts SET pinned_at = NOW() WHERE id = ?", [id]);
    }
  } else if (req.body?.pinned === false) {
    await pool.query("UPDATE posts SET pinned_at = NULL WHERE id = ?", [id]);
  }

  res.json({ ok: true });
});

/* -------- PIN/UNPIN (explicit) -------- */
router.patch("/posts/:id/pin", async (req, res) => {
  const id = Number(req.params.id);
  const pinned = !!req.body?.pinned;
  const [[row]] = await pool.query("SELECT type FROM posts WHERE id = ? LIMIT 1", [id]);
  if (!row) return res.status(404).json({ error: "Nerasta" });

  if (pinned) {
    await pool.query("UPDATE posts SET pinned = 0, pinned_at = NULL WHERE type = ? AND id <> ?", [row.type, id]);
    await pool.query("UPDATE posts SET pinned = 1, pinned_at = NOW() WHERE id = ?", [id]);
  } else {
    await pool.query("UPDATE posts SET pinned = 0, pinned_at = NULL WHERE id = ?", [id]);
  }
  res.json({ ok: true });
});

/* -------- DELETE -------- */
router.delete("/posts/:id", async (req, res) => {
  const id = Number(req.params.id);
  await pool.query("DELETE FROM posts WHERE id = ?", [id]);
  res.json({ ok: true });
});

/* -------- HEADER UPLOAD -------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024, files: 1 } });

const headersDir = path.join(__dirname, "../../uploads/post-headers");
await fs.mkdir(headersDir, { recursive: true }).catch(()=>{});

router.post("/posts/upload-header", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nėra failo" });
    const outName = `h_${Date.now()}_${Math.random().toString(36).slice(2)}.webp`;
    const outPath = path.join(headersDir, outName);

    // 16:9 cover @1200x675, webp ~85
    const buf = await sharp(req.file.buffer, { failOn: "none" })
      .rotate()
      .resize(1200, 675, { fit: "cover", position: "attention" })
      .webp({ quality: 85 })
      .toBuffer();

    await fs.writeFile(outPath, buf);
    return res.json({ ok: true, url: `/uploads/post-headers/${outName}` });
  } catch (e) {
    console.error("upload header error:", e);
    return res.status(400).json({ error: "Blogas paveikslėlis" });
  }
});

export default router;