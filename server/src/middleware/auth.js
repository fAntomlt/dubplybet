import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  // Allow CORS preflight through. This is a metadata request from the browser,
  // not your app calling the API. It never reaches your handlers otherwise.
  if (req.method === "OPTIONS") return next();

  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Reikia prisijungti" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET); // { uid, role }
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Neteisingas arba pasibaigęs prisijungimas" });
  }
}

export function requireAdmin(req, res, next) {
  // Preflights must pass here too so the browser can send the real request.
  if (req.method === "OPTIONS") return next();

  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ error: "Reikalingos administratoriaus teisės" });
  }
  next();
}