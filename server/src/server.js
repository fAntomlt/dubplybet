import express from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import pool, { dbPing } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();
const PORT = process.env.SERVER_PORT || 8080;

const allowedOrigins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || "*")
  .split(",").map(s=>s.trim()).filter(Boolean);

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("Not allowed by CORS: " + origin), false);
  },
  credentials: true,
};

// ORDER: parsers → cors → routes
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(cors(corsOptions));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Per daug užklausų. Bandykite dar kartą vėliau." }
});
app.use("/api/auth", authLimiter, authRoutes);

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
const io = new SocketIOServer(server, { cors: corsOptions });

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);
  socket.on("ping", () => socket.emit("pong"));
});

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log("Allowed CORS origins:", allowedOrigins.join(", ") || "(none)");
});