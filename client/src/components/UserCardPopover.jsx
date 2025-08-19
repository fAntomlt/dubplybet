import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { flagForTeam } from "../lib/flags";

export default function UserCardPopover({
  open,
  anchorEl,
  onClose,
  user,                  // { id|user_id|userId, username, avatarUrl, role, registeredAt, winnerPickTeam, ... }
  loading = false,
  error = "",
  apiOrigin = "",
  zIndex = 1000,
  offset = 10,
}) {
  const popRef = useRef(null);

  // Anchor rect (viewport coords)
  const rect = useMemo(() => {
    if (!open || !anchorEl) return null;
    const r = anchorEl.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height };
  }, [open, anchorEl]);

  // Reposition on scroll/resize
  const [, force] = useState(0);
  useEffect(() => {
    if (!open) return;
    const reflow = () => force((t) => t + 1);
    window.addEventListener("scroll", reflow, true);
    window.addEventListener("resize", reflow);
    return () => {
      window.removeEventListener("scroll", reflow, true);
      window.removeEventListener("resize", reflow);
    };
  }, [open]);

  // Close on outside/ESC
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      const inPopover = popRef.current?.contains(e.target);
      const inAnchor = anchorEl?.contains?.(e.target);
      if (!inPopover && !inAnchor) onClose?.();
    };
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, anchorEl]);

  // Animate in/out
  const [anim, setAnim] = useState(false);
  useLayoutEffect(() => {
    if (open) {
      setAnim(false);
      const r1 = requestAnimationFrame(() => {
        const r2 = requestAnimationFrame(() => setAnim(true));
        return () => cancelAnimationFrame(r2);
      });
      return () => cancelAnimationFrame(r1);
    } else {
      setAnim(false);
    }
  }, [open]);

  // Resolve which id to use for the lookup
  const idForLookup = useMemo(
    () => user?.user_id ?? user?.id ?? user?.userId ?? null,
    [user]
  );

  // All-time correct guesses: prefer value on `user`, else fetch
  const initialCorrect = useMemo(() => {
    const v =
      user?.correct_guesses_all_time ??
      user?.correctGuessesAllTime ??
      user?.correct;
    return v == null ? null : Number(v);
  }, [user]);

  const [correctAllTime, setCorrectAllTime] = useState(initialCorrect);
  useEffect(() => setCorrectAllTime(initialCorrect), [initialCorrect]);

  useEffect(() => {
    if (!open) return;
    if (correctAllTime != null) return;            // already have a value
    if (!apiOrigin || !idForLookup) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiOrigin}/api/leaderboards/all-time`);
        const data = await res.json();
        const arr = data?.leaderboard || [];
        const hit = arr.find(
          (r) => String(r.user_id ?? r.id) === String(idForLookup)
        );
        const val = Number(
          hit?.correct_guesses_all_time ??
          hit?.correct_any ??
          hit?.correct ??
          hit?.cnt ?? 0
        );
        if (!cancelled) setCorrectAllTime(val);
      } catch {
        if (!cancelled) setCorrectAllTime(0);
      }
    })();

    return () => { cancelled = true; };
  }, [open, apiOrigin, idForLookup, correctAllTime]);

  if (!open || !rect) return null;

  const style = {
    position: "fixed",
    top: rect.top,
    left: rect.left + rect.width / 2,
    zIndex,
  };

  const abs = (u) => (u && !/^https?:\/\//i.test(u) ? `${apiOrigin}${u}` : u);

  return createPortal(
    <Wrap style={style} $open={anim} $offset={offset} ref={popRef} role="dialog" aria-modal="false">
      <ProfileCard>
        <LeftPanel>
          {user?.avatarUrl ? (
            <AvatarImg src={abs(user.avatarUrl)} alt="" />
          ) : (
            <AvatarFallback>{initials(user?.username)}</AvatarFallback>
          )}
        </LeftPanel>

        <RightPanel>
          <TopRow>
            <Name>{user?.username || "—"}</Name>
            <RolePill $admin={user?.role === "admin"}>
              {user?.role === "admin" ? "Administratorius" : "Narys"}
            </RolePill>
          </TopRow>

          {loading && <InfoMuted>Kraunama…</InfoMuted>}
          {!loading && error && <InfoMuted role="alert">{error}</InfoMuted>}

          {!loading && !error && (
            <InfoList>
              <InfoRow>
                <InfoLabel>Registracija</InfoLabel>
                <InfoValue>{user?.registeredAt ? fmtDate(user.registeredAt) : "—"}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Teisingų spėjimų (visų laikų)</InfoLabel>
                <InfoValueStrong>{Number(correctAllTime ?? 0)}</InfoValueStrong>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Pasirinkta šalis</InfoLabel>
                <InfoValue>
                  {user?.winnerPickTeam ? (
                    <FlagWrap>
                      <span className="flag">{flagForTeam(user.winnerPickTeam, 16)}</span>
                      <b>{user.winnerPickTeam}</b>
                    </FlagWrap>
                  ) : (
                    "—"
                  )}
                </InfoValue>
              </InfoRow>
            </InfoList>
          )}
        </RightPanel>
      </ProfileCard>
      <Arrow aria-hidden />
    </Wrap>,
    document.body
  );
}

/* utils */
function initials(name = "") {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U"
  );
}
function fmtDate(d) {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return "";
  }
}

/* ====== styles (match the screenshot’s look) ====== */

const Wrap = styled.div`
  transform: translate(-50%, calc(-100% - ${({ $offset }) => $offset}px))
             scale(${({ $open }) => ($open ? 1 : 0.96)});
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transition:
    transform .42s cubic-bezier(.22,.61,.36,1),
    opacity   .42s cubic-bezier(.22,.61,.36,1);
  pointer-events: auto;
`;

const ProfileCard = styled.div`
  background: #ffffff;                     /* solid, no transparency */
  border: 1px solid ${({ theme }) => theme?.colors?.line || "#e7eaf0"};
  border-radius: 16px;
  box-shadow: 0 10px 24px rgba(2,6,23,.12);
  width: min(96vw, 560px);                 /* roomy like the mock */
  display: grid;
  grid-template-columns: 150px 1fr;        /* left blue panel + content */
  overflow: hidden;                        /* rounds the left panel */
`;

const LeftPanel = styled.div`
  padding: 18px;
  display: grid;
  place-items: center;
`;

const AvatarImg = styled.img`
  width: 92px; height: 92px;
  border-radius: 50%;
  object-fit: cover; display: block;
  border: 3px solid #ffffff;
  box-shadow: 0 6px 14px rgba(2,6,23,.18);
`;
const AvatarFallback = styled.div`
  width: 92px; height: 92px; border-radius: 50%;
  display: grid; place-items: center;
  background: #e0f2fe; color: #1f6feb;
  font-weight: 900; font-size: 24px;
  border: 3px solid #ffffff;
  box-shadow: 0 6px 14px rgba(2,6,23,.18);
`;

const RightPanel = styled.div`
  padding: 16px 18px;
  display: grid;
  gap: 10px;
`;

const TopRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  justify-content: space-between;
`;

const Name = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: .2px;
`;

const RolePill = styled.span`
  align-self: flex-start;
  padding: 6px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
`;

const InfoList = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 2px;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
`;

const InfoLabel = styled.span`
  color: #64748b;         /* slate-500 */
  font-size: 13px;
  font-weight: 700;
`;

const InfoValue = styled.span`
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
`;

const InfoValueStrong = styled.span`
  font-size: 15px;
  font-weight: 900;
`;

const InfoMuted = styled.div`
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
`;

const FlagWrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  .flag { display: inline-grid; place-items: center; }
`;

const Arrow = styled.div`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 0; height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid #ffffff; /* card color */
  filter: drop-shadow(0 -1px 0 ${({ theme }) => theme?.colors?.line || "#e7eaf0"});
  margin-top: 8px;
`;