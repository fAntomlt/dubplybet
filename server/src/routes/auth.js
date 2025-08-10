import { Router } from "express";
import { z } from "zod";
import crypto from "crypto";
import pool from "../db.js";
import { sendMail } from "../utils/mailer.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const router = Router();

const RegisterSchema = z.object({
  email: z.string({ required_error: "El. paštas privalomas" })
           .email("Neteisingas el. pašto formatas")
           .max(191, "El. paštas per ilgas"),
  username: z.string({ required_error: "Vartotojo vardas privalomas" })
             .min(3, "Vartotojo vardas per trumpas (min. 3)")
             .max(50, "Vartotojo vardas per ilgas (max. 50)"),
  // Discord global username: letters/digits/._ , 2–32 chars, no leading/trailing . or _, no double .. or __
  discordUsername: z.string({ required_error: "Discord vardas privalomas" })
    .regex(/^(?!.*[._]{2})(?![._])[a-zA-Z0-9._]{2,32}(?<![._])$/, "Neteisingas Discord vardas"),
  password: z.string({ required_error: "Slaptažodis privalomas" })
             .min(8, "Slaptažodis per trumpas (min. 8)")
             .max(100, "Slaptažodis per ilgas (max. 100)"),
  confirmPassword: z.string({ required_error: "Pakartokite slaptažodį" }),
}).refine(d => d.password === d.confirmPassword, {
  path: ["confirmPassword"],
  message: "Slaptažodžiai nesutampa",
});

const LoginSchema = z.object({
  email: z.string().email("Neteisingas el. pašto formatas").max(191),
  password: z.string().min(8, "Neteisingi prisijungimo duomenys"),
});

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const payload = req.body?.data ?? req.body ?? {};
    const { email, username, discordUsername, password } = RegisterSchema.parse(payload);

    const [exists] = await pool.query(
      "SELECT id FROM users WHERE email = ? OR username = ? OR discord_username = ? LIMIT 1",
      [email, username, discordUsername]
    );
    if (exists.length) {
      return res.status(400).json({ error: "El. paštas, vartotojo vardas arba Discord vardas jau naudojamas" });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const [result] = await pool.query(
      "INSERT INTO users (email, username, discord_username, password_hash) VALUES (?,?,?,?)",
      [email, username, discordUsername, password_hash]
    );
    const userId = result.insertId;

    const token = crypto.randomBytes(32).toString("hex");
    const hrs = Number(process.env.EMAIL_VERIFY_EXPIRES_HOURS || 24);
    await pool.query(
      "INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?,?, DATE_ADD(NOW(), INTERVAL ? HOUR))",
      [userId, token, hrs]
    );

    const verifyUrl = `${process.env.BASE_URL}/api/auth/verify?token=${token}`;

    await sendMail({
      to: email,
      subject: "Patvirtinkite savo paskyrą",
      html: `
        <p>Sveiki, ${username},</p>
        <p>Norėdami aktyvuoti paskyrą, paspauskite žemiau esančią nuorodą:</p>
        <p><a href="${verifyUrl}">${verifyUrl}</a></p>
        <p>Nuoroda galioja ${hrs} val.</p>
        <p>Jei neregistravote paskyros, šį laišką galite ignoruoti.</p>
      `,
    });

    return res.json({ ok: true, message: "Registracija sėkminga. Patvirtinkite paskyrą el. paštu." });
  } catch (err) {
    if (err?.issues) {
      return res.status(400).json({ error: "Neteisingai užpildyti laukeliai", issues: err.issues });
    }
    console.error("register error:", err);
    return res.status(500).json({ error: "Serverio klaida. Bandykite vėliau." });
  }
});

// GET /api/auth/verify?token=...
router.get("/verify", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: "Trūksta žetono (token)" });

  try {
    const [rows] = await pool.query(
      `SELECT ev.id, ev.user_id, ev.expires_at, ev.used, u.email_verified
       FROM email_verifications ev
       JOIN users u ON u.id = ev.user_id
       WHERE ev.token = ? LIMIT 1`,
      [token]
    );
    if (!rows.length) return res.status(400).json({ error: "Neteisingas patvirtinimo žetonas" });

    const ev = rows[0];
    if (ev.used) return res.status(400).json({ error: "Šis patvirtinimo žetonas jau panaudotas" });
    if (new Date(ev.expires_at) < new Date()) return res.status(400).json({ error: "Patvirtinimo žetonas nebegalioja" });

    await pool.query("UPDATE users SET email_verified = 1 WHERE id = ?", [ev.user_id]);
    await pool.query("UPDATE email_verifications SET used = 1 WHERE id = ?", [ev.id]);

    return res.json({ ok: true, message: "Paskyra sėkmingai patvirtinta" });
  } catch (err) {
    console.error("verify error:", err);
    return res.status(500).json({ error: "Serverio klaida. Bandykite vėliau." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    const [rows] = await pool.query(
      "SELECT id, email, username, password_hash, role, email_verified FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    if (!rows.length) {
      return res.status(400).json({ error: "El. paštas arba slaptažodis neteisingi" });
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(400).json({ error: "El. paštas arba slaptažodis neteisingi" });

    const token = jwt.sign({ uid: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.json({
      ok: true,
      message: "Prisijungimas sėkmingas",
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        email_verified: !!user.email_verified,
      },
    });
  } catch (err) {
    if (err?.issues) {
      return res.status(400).json({ error: "Neteisingai užpildyti laukeliai", issues: err.issues });
    }
    console.error("login error:", err);
    return res.status(500).json({ error: "Serverio klaida. Bandykite vėliau." });
  }
});

export default router;