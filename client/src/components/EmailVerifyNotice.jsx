import { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { api } from "../lib/api";
import { getAuth } from "../store/auth";
import { useToast } from "./ToastProvider";
import { FiAlertCircle, FiSend } from "react-icons/fi";

export default function EmailVerifyNotice() {
  const toast = useToast();
  const [authToken, setAuthToken] = useState(
    () => getAuth()?.token || localStorage.getItem("token") || ""
  );
  const [me, setMe] = useState(null);
  const [sending, setSending] = useState(false);

  const isUnverified = me && (me.emailVerified === 0 || me.emailVerified === false);

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

  useEffect(() => { fetchMe(); }, [authToken]);

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
    <Banner role="region" aria-label="El. pašto patvirtinimas">
      <Accent aria-hidden />
      <IconWrap>
        <FiAlertCircle />
      </IconWrap>

      <Text>
        <Kicker>Reikalingas patvirtinimas</Kicker>
        <Msg>
          Jog naudotis visų puslapio funkcionalumu, turite patvirtinti paskyrą el. paštu.
        </Msg>
      </Text>

      <Actions>
        <ResendBtn onClick={resend} disabled={sending} aria-busy={sending}>
          <FiSend />
          {sending ? "Siunčiama…" : "Siųsti patvirtinimo laišką iš naujo"}
        </ResendBtn>
      </Actions>
    </Banner>
  );
}

/* === styles === */

const enter = keyframes`
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const Banner = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;

  padding: 10px 12px;
  margin-bottom: 12px;

  background: #ffffff;
  border: 1px solid #e7eaf0;
  border-radius: 12px;

  color: #0f172a;
  animation: ${enter} 160ms ease-out both;

  @media (max-width: 900px) {
  display: flex;
  flex-wrap: wrap;
   position: relative;
   z-index: 7;
    align-items: center;
    justify-content: space-between;
    gap: 10px;

   /* cancel Main’s top/side padding so this hugs the viewport edges */
   margin-top: 0;
   margin-left: calc(50% - 50vw);
   margin-right: calc(50% - 50vw);
   margin-bottom: 0;
   border-radius: 0;
   border-left: 0;
   border-right: 0;
   padding-left: var(--main-pad-x);
   padding-right: var(--main-pad-x);
   box-shadow: 0 4px 16px rgba(2,6,23,.08); /* float above hero */
  }
`;

const Accent = styled.span`
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 3px;
  background: linear-gradient(180deg, #f59e0b, #f59e0b);
  @media (max-width: 900px){ top: 0; bottom: 0; }
`;

const IconWrap = styled.span`
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #fff7ed;   /* light amber */
  color: #b45309;        /* amber-700 */
  border: 1px solid #fde68a;
  flex-shrink: 0;
  svg { font-size: 16px; }
`;

const Text = styled.div`
  display: grid;
  gap: 2px;
  min-width: 0;
  @media (max-width: 900px){
    flex: 1 1 0;
  }
`;

const Kicker = styled.div`
  font-size: 11px;
  font-weight: 900;
  letter-spacing: .12em;
  text-transform: uppercase;
  opacity: .75;
`;

const Msg = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.35;
`;

const Actions = styled.div`
  display: grid;                     /* desktop unchanged */
  gap: 8px;
  justify-items: end;
  @media (max-width: 900px){
    display: flex;
   align-items: center;
   justify-content: flex-start;      /* start of the new line */
   flex: 0 0 100%;                   /* force a full-width new row */
   margin-top: 6px;
   margin-left: calc(28px + 10px);   /* indent under text (icon width + gap) */
  }
`;

const ResendBtn = styled.button`
  display: inline-grid;
  grid-auto-flow: column;
  align-items: center;
  gap: 8px;

  border: 1px solid #1f6feb;
  background: #ffffff;
  color: #1f6feb;

  padding: 8px 12px;
  border-radius: 10px;
  font-weight: 900;
  cursor: pointer;

  transition: background-color .15s ease, transform .12s ease, opacity .15s ease;

  &:hover:not(:disabled) { background: #eff6ff; transform: translateY(-1px); }
  &:active:not(:disabled) { transform: translateY(0); }
  &:disabled { opacity: .6; cursor: not-allowed; }

  @media (max-width: 900px){
    padding: 6px 10px;
    font-size: 13px;
  }
`;