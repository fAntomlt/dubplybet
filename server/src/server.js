import express from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import http from "http";
import adminUsersRoutes from "./routes/admin.users.js";
import { requireAuth, requireAdmin } from "./middleware/auth.js";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import chatPublic from "./routes/chat.public.js";
import { verifyJwt } from "./utils/jwt.js";
import authRoutes from "./routes/auth.js";
import pool, { dbPing } from "./db.js";
import tournamentsAdmin from "./routes/admin.tournaments.js";
import gamesAdmin from "./routes/admin.games.js";
import gamesPublic from "./routes/games.public.js";
import gamesGuess from "./routes/games.guess.js";
import gamePublicGuesses from "./routes/games.public.guesses.js";
import leaderboardsPublic from "./routes/leaderboards.public.js";
import { startLockGamesJob } from "./jobs/lockGames.js";
import usersMeRoutes from "./routes/users.me.js";
import mime from "mime-types";
import fs from "fs";
import tournamentsPublic from "./routes/tournaments.public.js";
import tournamentsWinnerPicks from "./routes/tournaments.winner-picks.js";
import adminPostsRoutes from "./routes/admin.posts.js";
import publicPostsRoutes from "./routes/posts.public.js";
import ticketsRouter from "./routes/tickets.js";
import adminTicketsRouter from "./routes/adminTickets.js";
import badgesRouter from "./routes/badges.js";
import sanitizeHtml from "sanitize-html";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
const PORT = process.env.SERVER_PORT || 8080;

app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; connect-src 'self' https://api.icrib.pro; img-src 'self' https://api.icrib.pro data:; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'none'; object-src 'none';"
  );
  next();
});

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    // allow same-origin / curl / mobile apps (no Origin header)
    if (!origin) return cb(null, true);

    // in dev you may allow '*', but not in production
    const allowWildcard = process.env.NODE_ENV !== "production" && allowedOrigins.includes("*");

    const ok = allowWildcard || allowedOrigins.includes(origin);
    if (ok) return cb(null, true);
    return cb(new Error("Not allowed by CORS: " + origin), false);
  },
  credentials: true,
};

const uploadsRoot = path.join(__dirname, "../uploads");

// ORDER: parsers → cors → routes
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cors(corsOptions));
app.use("/api/admin", requireAuth, requireAdmin, adminUsersRoutes);
app.use("/api/admin", requireAuth, requireAdmin, tournamentsAdmin);
app.use("/api/admin", requireAuth, requireAdmin, gamesAdmin);
app.use("/api/games", gamesPublic);
app.use("/api/games", gamesGuess);
app.use("/api/games", gamePublicGuesses);
app.use("/api/leaderboards", leaderboardsPublic);
app.use("/api/chat", chatPublic);
app.use("/api/users", usersMeRoutes);
// safer /uploads handler (blocks symlink/path traversal, serves only images)
app.use("/uploads", async (req, res) => {
  try {
    // Build candidate path and resolve real paths
    const rawPath = path.join(uploadsRoot, req.path); // e.g. /uploads/avatars/u_1.webp
    const [rootReal, fileReal] = await Promise.all([
      fs.promises.realpath(uploadsRoot),
      fs.promises.realpath(rawPath).catch(() => null), // null if not found or broken link
    ]);

    // Reject if file missing or escapes the uploads root (symlinks, ../, etc.)
    if (!fileReal || !fileReal.startsWith(rootReal)) return res.status(400).end();

    // Must be a regular file
    const stat = await fs.promises.stat(fileReal).catch(() => null);
    if (!stat || !stat.isFile()) return res.status(404).end();

    // Strict MIME by extension
    const ext = path.extname(fileReal).toLowerCase();
    switch (ext) {
      case ".jpg":
      case ".jpeg":
        res.type("image/jpeg"); break;
      case ".png":
        res.type("image/png"); break;
      case ".gif":
        res.type("image/gif"); break;
      case ".webp":
        res.type("image/webp"); break;
      default:
        return res.status(415).end();
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    return res.sendFile(fileReal);
  } catch {
    return res.status(400).end();
  }
});
app.use("/api/tournaments", tournamentsPublic);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Per daug užklausų. Bandykite dar kartą vėliau." }
});
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/tournaments", tournamentsPublic);
app.use("/api/tournaments", tournamentsWinnerPicks);
app.use("/api/admin", requireAuth, requireAdmin, adminPostsRoutes);
app.use("/api/posts", publicPostsRoutes);
app.use("/api/tickets", ticketsRouter);
app.use("/api/admin", requireAuth, requireAdmin, adminTicketsRouter);
app.use("/api", badgesRouter);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.get("/api/db-health", async (req, res) => {
  try {
    const ok = await dbPing();
    res.json({ ok });
  } catch {
    res.status(500).json({ ok: false, error: "DB error" });
  }
});

const server = http.createServer(app);
server.setTimeout(10_000);
server.headersTimeout = 10_000;
const io = new SocketIOServer(server, { cors: corsOptions });
const CHAT_STRIP_ALL = { allowedTags: [], allowedAttributes: {} };

// ---------- CHAT SOCKET ----------
const lastSendAt = new Map();

function cleanName(name) {
  const s = String(name ?? "").trim();
  if (!s) return "Vartotojas";
  // strip any HTML and weird control characters; collapse spaces; clamp length
  const stripped = sanitizeHtml(s, CHAT_STRIP_ALL);
  const asciiSafe = stripped
    .replace(/[^\p{L}\p{N}\s._-]/gu, "")
    .replace(/\s+/g, " ");
  return asciiSafe.slice(0, 40) || "Vartotojas";
}

function safeAvatar(url) {
  return typeof url === "string" && url.startsWith("/uploads/")
    ? url
    : null;
}

io.on("connection", async (socket) => {
  try {
    // token from handshake auth or Authorization header
    const token =
      socket.handshake?.auth?.token ||
      (socket.handshake?.headers?.authorization || "").replace(/^Bearer\s+/i, "");

    if (!token) throw new Error("missing token");

    const payload = verifyJwt(token); // throws if invalid/expired/missing id
    const userId = payload.id;        // guaranteed by verifyJwt()

    // verify user exists (also read role for admin permissions)
    const [rows] = await pool.query(
      "SELECT id, username, role, avatar_url AS avatarUrl FROM users WHERE id = ? LIMIT 1",
      [userId]
    );
    if (!rows.length) throw new Error("user not found");

    const user = rows[0];
    const isAdmin = user.role === "admin";

    // everyone in a public room for now
    socket.join("public");
    const buckets = new Map(); // userId -> { tokens, lastRefill }

    function allow(userId, ratePerSec = 1, burst = 5) {
      const now = Date.now();
      const b = buckets.get(userId) || { tokens: burst, lastRefill: now };
      const dt = (now - b.lastRefill) / 1000;
      b.tokens = Math.min(burst, b.tokens + dt * ratePerSec);
      b.lastRefill = now;
      if (b.tokens < 1) { buckets.set(userId, b); return false; }
      b.tokens -= 1; buckets.set(userId, b); return true;
    }
    // === SEND ===
    socket.on("chat:send", async (data) => {
      if (!allow(user.id, 1, 5)) return;

      const raw = String(data?.content ?? "").trim();
      if (!raw) return;

      const trimmed = raw.slice(0, 500);
      const content = sanitizeHtml(trimmed, CHAT_STRIP_ALL); // strip all HTML
      if (!content) return;

      // throttle: 1 msg/sec per user
      const now = Date.now();
      if ((lastSendAt.get(user.id) || 0) > now - 1000) return;
      lastSendAt.set(user.id, now);

      const [result] = await pool.query(
        "INSERT INTO chat_messages (user_id, content) VALUES (?, ?)",
        [user.id, content]
      );

      io.to("public").emit("chat:new", {
        id: result.insertId,
        userId: user.id,
        username: cleanName(user.username),
        avatarUrl: safeAvatar(user.avatarUrl),
        content,
        createdAt: new Date().toISOString(),
      });
    });

    // === DELETE (admins can delete others' messages) ===
    // === DELETE (owner OR admin) ===
    socket.on("chat:delete", async ({ id }) => {
      try {
        // find owner of the message
        const [rows] = await pool.query(
          "SELECT user_id FROM chat_messages WHERE id = ? LIMIT 1",
          [id]
        );
        if (!rows.length) return;

        const ownerId = rows[0].user_id;
        const canDelete = isAdmin || ownerId === user.id; // allow owner OR admin
        if (!canDelete) return;

        const [res] = await pool.query("DELETE FROM chat_messages WHERE id = ?", [id]);
        if (res.affectedRows > 0) {
          io.to("public").emit("chat:deleted", { id });
        }
      } catch (e) {
        console.error("chat:delete error", e);
      }
    });


    // === EDIT (only author can edit) ===
    socket.on("chat:update", async ({ id, content }) => {
      try {
        let text = String(content || "").trim().slice(0, 500);
        text = sanitizeHtml(text, CHAT_STRIP_ALL);
        if (!text) return;

        // ensure ownership
        const [rows] = await pool.query(
          "SELECT user_id FROM chat_messages WHERE id = ?",
          [id]
        );
        if (!rows.length) return;
        if (rows[0].user_id !== user.id) return;
        await pool.query("UPDATE chat_messages SET content = ?, edited_at = NOW() WHERE id = ?", [text, id]);

        io.to("public").emit("chat:updated", {
          id,
          content: text,
          edited: true,
          userId: user.id,
          username: cleanName(user.username),
          updatedAt: new Date().toISOString(),
        });
      } catch (e) {
        console.error("chat:update error", e);
      }
    });
  } catch (err) {
    console.error("socket auth error:", err.message);
    socket.disconnect(true);
  }
});
// ---------- /CHAT SOCKET ----------

const enableCron = process.env.ENABLE_CRON_JOBS === "true";
if (enableCron) {
  startLockGamesJob();
  console.log("Cron jobs enabled: lockGames");
}

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log("Allowed CORS origins:", allowedOrigins.join(", ") || "(none)");
});