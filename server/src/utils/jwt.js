// src/utils/jwt.js
import jwt from "jsonwebtoken";

/** Verify a JWT and return its payload, or null if invalid/expired. */
export function verifyJwt(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

/** Optional helper (not used by login route, safe to keep). */
export function signJwt(payload, opts = {}) {
  const expiresIn = opts.expiresIn || process.env.JWT_EXPIRES_IN || "7d";
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
}