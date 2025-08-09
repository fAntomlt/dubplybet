import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

dotenv.config();

const app = express();
const PORT = process.env.SERVER_PORT || 8080;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// HTTP + WebSockets
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: CORS_ORIGIN, credentials: true }
});

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);
  socket.on("ping", () => socket.emit("pong"));
});

server.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});