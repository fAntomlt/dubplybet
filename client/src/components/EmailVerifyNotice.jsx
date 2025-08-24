import { useState, useEffect } from "react";
import styled from "styled-components";
import { api } from "../lib/api";
import { getAuth } from "../store/auth";
import { useToast } from "./ToastProvider";

export default function EmailVerifyNotice() {
  const toast = useToast();
  const [authToken, setAuthToken] = useState(
    () => getAuth()?.token || localStorage.getItem("token") || ""
  );
  const [me, setMe] = useState(null);
  const [sending, setSending] = useState(false);

  const isUnverified = me && (me.emailVerified === 0 || me.emailVerified === false);

  // keep token synced across tabs
  useEffect(() => {
    const refresh = () =>
      setAuthToken(getAuth()?.token || localStorage.getItem("token") || "");
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  async function fetchMe() {
    if (!authToken) { setMe(null); return; }
    try {
      const d = await api("/api/users/me", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setMe(d?.user || null);
    } catch {
      setMe(null);
    }
  }

  // load on mount/token change
  useEffect(() => { fetchMe(); }, [authToken]);

  // auto-refetch when user comes back (maybe verified via email link)
  useEffect(() => {
    const onFocus = () => fetchMe();
    const onVis = () => { if (!document.hidden) fetchMe(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [authToken]);

  async function resend() {
    if (!authToken || sending) return;
    try {
      setSending(true);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/resend-verification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 429) {
          toast.error("Tik kartą per penkias minutes");
        } else if (res.status === 400 && data?.error === "Paskyra jau patvirtinta") {
          toast.success("Paskyra jau patvirtinta");
          fetchMe();
        } else {
          toast.error(String(data?.error || "Nepavyko išsiųsti"));
        }
        return;
      }
      toast.success("Patvirtinimo laiškas išsiųstas");
    } catch {
      toast.error("Serverio klaida. Bandykite vėliau.");
    } finally {
      setSending(false);
    }
  }

  if (!authToken || !isUnverified) return null;

  return (
    <Bar role="region" aria-label="El. pašto patvirtinimas">
      <span>
        Jog naudotis visų puslapio funkcionalumu, turite patvirtinti paskyrą el. paštu.
      </span>
      <Resend onClick={resend} disabled={sending}>
        Siųsti patvirtinimo laišką iš naujo
      </Resend>
    </Bar>
  );
}

/* styles */
const Bar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 12px;
  border: 1px solid #fde68a;  /* amber-300 */
  background: #fffbeb;        /* amber-50  */
  color: #92400e;              /* amber-800 */
  border-radius: 12px;
  font-weight: 700;
`;

const Resend = styled.button`
  border: 0;
  background: #f59e0b;        /* amber-500 */
  color: #fff;
  font-weight: 900;
  border-radius: 999px;
  padding: 8px 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: transform .15s ease, background-color .15s ease, opacity .15s ease;
  &:hover { background: #d97706; transform: translateY(-1px); }
  &:active { transform: translateY(0); }
  &:disabled { opacity: .6; cursor: not-allowed; }
`;