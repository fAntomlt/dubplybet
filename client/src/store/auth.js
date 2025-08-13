let listeners = [];

export function getAuth() {
  try {
    const user = JSON.parse(localStorage.getItem("authUser") || "null");
    const token = localStorage.getItem("authToken");
    return user && token ? { user, token } : { user: null, token: null };
  } catch {
    return { user: null, token: null };
  }
}

export function setAuth({ user, token }) {
  if (user) localStorage.setItem("authUser", JSON.stringify(user));
  if (token) localStorage.setItem("authToken", token);
  notify();
}

export function clearAuth() {
  localStorage.removeItem("authUser");
  localStorage.removeItem("authToken");
  notify();
}

export function subscribe(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter(l => l !== fn); };
}

function notify() { listeners.forEach(fn => fn(getAuth())); }

window.addEventListener("storage", (e) => {
  if (e.key === "authUser" || e.key === "authToken") notify();
});