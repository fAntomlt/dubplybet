// server/src/routes/users.me.js
import { Router } from "express";
import pool from "../db.js";
import { requireAuth } from "../middleware/auth.js";
import { z } from "zod";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs/promises";
import multer from "multer";
import sharp from "sharp";
import { fileURLToPath } from "url";

const router = Router();

// shared validators
const UsernameSchema = z.string().min(3).max(50);

// Discord: 2–32, only a–z 0–9 _ . , no consecutive "..".
// We also normalize: trim, strip leading "@", lowercase.
const DISCORD_RE = /^(?!.*\.\.)[a-z0-9._]{2,32}$/;
const DiscordSchema = z
  .string()
  .transform((s) => String(s).trim().replace(/^@/, "").toLowerCase())
  .refine((s) => DISCORD_RE.test(s), "Neteisingas Discord vardas");

const PasswordSchema = z.string().min(8).max(100);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max
    files: 1,
  },
  fileFilter: (req, file, cb) => {
  const ok =
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png" ||
    file.mimetype === "image/webp";
  if (ok) return cb(null, true);
  return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "avatar"));
},
});

// Very small “magic number” sniff as an extra check
function looksLikeImage(buffer) {
  if (!buffer || buffer.length < 12) return false;
  const sig = buffer.subarray(0, 12);

  // JPEG: FF D8 FF
  if (sig[0] === 0xff && sig[1] === 0xd8 && sig[2] === 0xff) return true;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e && sig[3] === 0x47 &&
    sig[4] === 0x0d && sig[5] === 0x0a && sig[6] === 0x1a && sig[7] === 0x0a
  ) return true;

  // WEBP: "RIFF" .... "WEBP"
  const str4 = (b, i) => String.fromCharCode(b[i], b[i+1], b[i+2], b[i+3]);
  if (str4(sig, 0) === "RIFF" && str4(sig, 8) === "WEBP") return true;

  return false;
}

const avatarsDir = path.join(__dirname, "../../uploads/avatars");

async function ensureDirs() {
  await fs.mkdir(avatarsDir, { recursive: true });
}
ensureDirs().catch(() => { /* ignore on boot */ });

// POST /api/users/me/avatar
router.post("/me/avatar", requireAuth, upload.single("avatar"), async (req, res) => {
  try {
    const uid = req.user.uid ?? req.user.id ?? req.user.userId;
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ ok: false, error: "Nerastas bylos turinys." });
    }

    // Extra content sniff
    if (!looksLikeImage(req.file.buffer)) {
      return res.status(400).json({ ok: false, error: "Neleistinas paveikslėlio formatas." });
    }

    // Process with sharp: strip metadata, clamp size, square cover, convert to webp
    const MAX_DIM = 512;  // keep a nice source
    const AVATAR_DIM = 256; // final square avatar size

    // First, normalize & limit to max bounds to avoid huge inputs
    const normalized = sharp(req.file.buffer, { failOn: "none" })
      .rotate()
      .resize(MAX_DIM, MAX_DIM, { fit: "inside", withoutEnlargement: true })
      .removeAlpha(); // normalize alpha channels

    // Then produce a centered square avatar
    const avatar = await normalized
      .resize(AVATAR_DIM, AVATAR_DIM, { fit: "cover", position: "attention" })
      .webp({ quality: 90 })
      .toBuffer();

    // Save with deterministic name per user (cache-bust with a version if you like)
    const filename = `u_${uid}.webp`;
    const outPath = path.join(avatarsDir, filename);
    await fs.writeFile(outPath, avatar);

    const publicUrl = `/uploads/avatars/${filename}`;

    // Persist in DB (recommended)
    await pool.query("UPDATE users SET avatar_url = ? WHERE id = ?", [publicUrl, uid]);

    return res.json({ ok: true, url: publicUrl });
  } catch (err) {
    if (err instanceof multer.MulterError) {
      // Size/type/etc
      return res.status(400).json({ ok: false, error: "Netinkamas failas (dydis ar tipas)." });
    }
    console.error("avatar upload error:", err);
    return res.status(500).json({ ok: false, error: "Serverio klaida." });
  }
});

// GET /api/users/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid ?? req.user.id ?? req.user.userId;
    const [rows] = await pool.query(
      "SELECT id, email, username, discord_username AS discordUsername, role, avatar_url AS avatarUrl FROM users WHERE id = ? LIMIT 1",
      [uid]
    );
    if (!rows.length) return res.status(404).json({ error: "Vartotojas nerastas" });

    return res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error("GET /users/me error:", err);
    return res.status(500).json({ error: "Serverio klaida. Bandykite vėliau." });
  }
});

// PATCH /api/users/me
// body: { username?, discordUsername?, currentPassword }
router.patch("/me", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid ?? req.user.id ?? req.user.userId;

    const Schema = z.object({
      username: z.optional(UsernameSchema),
      discordUsername: z.optional(DiscordSchema),
      currentPassword: PasswordSchema,
    });

    // NOTE: if provided, discordUsername is already normalized by DiscordSchema.transform()
    const { username, discordUsername, currentPassword } = Schema.parse(req.body || {});

    if (!username && !discordUsername) {
      return res.status(400).json({ error: "Nėra ką atnaujinti" });
    }

    // fetch hash to verify current password
    const [uRows] = await pool.query(
      "SELECT id, password_hash FROM users WHERE id = ? LIMIT 1",
      [uid]
    );
    if (!uRows.length) return res.status(404).json({ error: "Vartotojas nerastas" });

    const ok = await bcrypt.compare(currentPassword, uRows[0].password_hash);
    if (!ok) return res.status(400).json({ error: "Neteisingas slaptažodis" });

    // uniqueness checks if username/discord provided
    if (username) {
      const [dupe] = await pool.query(
        "SELECT id FROM users WHERE username = ? AND id <> ? LIMIT 1",
        [username, uid]
      );
      if (dupe.length) return res.status(400).json({ error: "Vartotojo vardas jau naudojamas" });
    }
    if (discordUsername) {
      const [dupe] = await pool.query(
        "SELECT id FROM users WHERE discord_username = ? AND id <> ? LIMIT 1",
        [discordUsername, uid]
      );
      if (dupe.length) return res.status(400).json({ error: "Discord vardas jau naudojamas" });
    }

    // build update
    const sets = [];
    const vals = [];
    if (username) { sets.push("username = ?"); vals.push(username); }
    if (discordUsername) { sets.push("discord_username = ?"); vals.push(discordUsername); }
    vals.push(uid);

    await pool.query(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, vals);

    return res.json({ ok: true, message: "Pakeitimai išsaugoti" });
  } catch (err) {
    if (err?.issues) {
      return res.status(400).json({ error: "Neteisingai užpildyti laukeliai", issues: err.issues });
    }
    console.error("PATCH /users/me error:", err);
    return res.status(500).json({ error: "Serverio klaida. Bandykite vėliau." });
  }
});

// POST /api/users/change-password
// body: { oldPassword, password, confirmPassword }
router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const uid = req.user.uid ?? req.user.id ?? req.user.userId;

    const Schema = z
      .object({
        oldPassword: PasswordSchema,
        password: PasswordSchema,
        confirmPassword: z.string(),
      })
      .refine((d) => d.password === d.confirmPassword, {
        path: ["confirmPassword"],
        message: "Slaptažodžiai nesutampa",
      });

    const { oldPassword, password } = Schema.parse(req.body || {});

    const [uRows] = await pool.query(
      "SELECT id, password_hash FROM users WHERE id = ? LIMIT 1",
      [uid]
    );
    if (!uRows.length) return res.status(404).json({ error: "Vartotojas nerastas" });

    const ok = await bcrypt.compare(oldPassword, uRows[0].password_hash);
    if (!ok) return res.status(400).json({ error: "Neteisingas senas slaptažodis" });

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [password_hash, uid]);

    return res.json({ ok: true, message: "Slaptažodis atnaujintas" });
  } catch (err) {
    if (err?.issues) {
      return res.status(400).json({ error: "Neteisingai užpildyti laukeliai", issues: err.issues });
    }
    console.error("POST /users/change-password error:", err);
    return res.status(500).json({ error: "Serverio klaida. Bandykite vėliau." });
  }
});

router.get("/public/:id", requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ ok: false, error: "Blogas vartotojo ID" });
    }

    const [rows] = await pool.query(
      `SELECT id,
              username,
              avatar_url AS avatarUrl,
              created_at AS registeredAt
         FROM users
        WHERE id = ?
        LIMIT 1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ ok: false, error: "Vartotojas nerastas" });
    }

    // Return only minimal public data
    return res.json({ ok: true, user: rows[0] });
  } catch (err) {
    console.error("GET /users/public/:id error:", err);
    return res.status(500).json({ ok: false, error: "Serverio klaida" });
  }
});

export default router;