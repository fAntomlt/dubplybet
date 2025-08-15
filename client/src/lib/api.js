export const API = import.meta.env.VITE_API_URL;

function getToken() {
  try {
    return JSON.parse(localStorage.getItem("authToken") || "null")
        || localStorage.getItem("authToken");
  } catch {
    return localStorage.getItem("authToken");
  }
}

export async function api(path, { method = "GET", json, headers, ...rest } = {}) {
  const token = getToken();

  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(json ? { body: JSON.stringify(json) } : {}),
    ...rest,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    const msg = data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}