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

const [tick, setTick] = useState(0);

// Anchor rect (viewport coords)
const rect = useMemo(() => {
  if (!open || !anchorEl) return null;
  const r = anchorEl.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}, [open, anchorEl, tick]);

// Reposition on scroll/resize
useEffect(() => {
  if (!open) return;
  const reflow = () => setTick(t => t + 1);
  window.addEventListener("scroll", reflow, true);
  window.addEventListener("resize", reflow);
  return () => {
    window.removeEventListener("scroll", reflow, true);
    window.removeEventListener("resize", reflow);
  };
}, [open]);

useLayoutEffect(() => {
  if (!open || !rect || !popRef.current) return;

  const margin = 8;
  const cardW = popRef.current.offsetWidth || 0;
  const cardH = popRef.current.offsetHeight || 0;
  const anchorCenterX = rect.left + rect.width / 2;

  const desiredLeft = anchorCenterX - cardW / 2;
  const minLeft = margin;
  const maxLeft = Math.max(minLeft, window.innerWidth - margin - cardW);
  const clampedLeft = Math.min(Math.max(desiredLeft, minLeft), maxLeft);
  setShiftX(clampedLeft - desiredLeft);

  const fitsAbove = rect.top - offset - cardH >= margin;
  setPlaceBelow(!fitsAbove);
}, [open, rect, offset, tick]);


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

useEffect(() => {
  // whenever a new user is targeted, re-seed the state:
  // - if the user object already has a number, use it
  // - otherwise set to null so the fetch effect will run
  const v =
    user?.correct_guesses_all_time ??
    user?.correctGuessesAllTime ??
    user?.correct ??
    null;

  setCorrectAllTime(v == null ? null : Number(v));
}, [idForLookup, initialCorrect, user, open]);


  useEffect(() => {
    if (!open) return;
    if (correctAllTime != null) return;
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

  // Keep the card inside the viewport (clamp X; flip below if needed)
  const [shiftX, setShiftX] = useState(0);
  const [placeBelow, setPlaceBelow] = useState(false);

  useLayoutEffect(() => {
    if (!open || !rect || !popRef.current) return;

    const margin = 8;
    const cardW = popRef.current.offsetWidth || 0;
    const cardH = popRef.current.offsetHeight || 0;
    const anchorCenterX = rect.left + rect.width / 2;

    const desiredLeft = anchorCenterX - cardW / 2;
    const minLeft = margin;
    const maxLeft = Math.max(minLeft, window.innerWidth - margin - cardW);
    const clampedLeft = Math.min(Math.max(desiredLeft, minLeft), maxLeft);
    setShiftX(clampedLeft - desiredLeft);

    const fitsAbove = rect.top - offset - cardH >= margin;
    setPlaceBelow(!fitsAbove);
  }, [open, rect, offset]);

  if (!open || !rect) return null;

  const style = {
    position: "fixed",
    top: rect.top,
    left: rect.left + rect.width / 2,
    zIndex,
  };

  const abs = (u) => (u && !/^https?:\/\//i.test(u) ? `${apiOrigin}${u}` : u);

  return createPortal(
    <Wrap
      style={style}
      $open={anim}
      $offset={offset}
      $shiftX={shiftX}
      $below={placeBelow}
      ref={popRef}
      role="dialog"
      aria-modal="false"
    >
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
            <Name title={user?.username || ""}>{user?.username || "—"}</Name>
            <RolePill $admin={user?.role === "admin"}>
              {user?.role === "admin" ? "Administratorius" : "Narys"}
            </RolePill>
          </TopRow>

          {loading && <InfoMuted>Kraunama…</InfoMuted>}
          {!loading && error && <InfoMuted role="alert">{error}</InfoMuted>}

          {!loading && !error && (
            <InfoList>
              <InfoRow>
                <InfoLabel>Užsiregistravo</InfoLabel>
                <InfoValue>{user?.registeredAt ? fmtDate(user.registeredAt) : "—"}</InfoValue>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Teisingų spėjimų</InfoLabel>
                <InfoValueStrong>{Number(correctAllTime ?? 0)}</InfoValueStrong>
              </InfoRow>
              <InfoRow>
                <InfoLabel>Favoritas</InfoLabel>
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

      <Arrow $below={placeBelow} aria-hidden />
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

/* ====== styles (responsive + clamped) ====== */

const Wrap = styled.div`
  transform:
    translate(
      calc(-50% + ${({ $shiftX }) => Math.round($shiftX) }px),
      ${({ $below, $offset }) => ($below ? `${$offset}px` : `calc(-100% - ${$offset}px)`)}
    )
    scale(${({ $open }) => ($open ? 1 : 0.96)});
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transition:
    transform .42s cubic-bezier(.22,.61,.36,1),
    opacity   .42s cubic-bezier(.22,.61,.36,1);
  pointer-events: auto;
`;

const ProfileCard = styled.div`
  box-sizing: border-box;
  background: #ffffff;
  border: 1px solid ${({ theme }) => theme?.colors?.line || "#e7eaf0"};
  border-radius: 16px;
  box-shadow: 0 10px 24px rgba(2,6,23,.12);

  /* Never exceed viewport minus 16px margin */
  width: min(560px, calc(100vw - 16px));

  display: grid;
  grid-template-columns: 140px 1fr;
  overflow: hidden;

  @media (max-width: 420px) {
    grid-template-columns: 110px 1fr;
  }
  @media (max-width: 380px) {
    /* Stack to avoid overflowing on very narrow screens */
    grid-template-columns: 1fr;
  }
`;

const LeftPanel = styled.div`
  padding: 18px;
  display: grid;
  place-items: center;

  @media (max-width: 380px) {
    padding: 12px 12px 0;
  }
`;

const AvatarImg = styled.img`
  width: 92px; height: 92px;
  border-radius: 50%;
  object-fit: cover; display: block;
  border: 3px solid #ffffff;
  box-shadow: 0 6px 14px rgba(2,6,23,.18);

  @media (max-width: 420px) {
    width: 78px; height: 78px;
  }
  @media (max-width: 380px) {
    width: 64px; height: 64px;
  }
`;
const AvatarFallback = styled.div`
  width: 92px; height: 92px; border-radius: 50%;
  display: grid; place-items: center;
  background: #e0f2fe; color: #1f6feb;
  font-weight: 900; font-size: 24px;
  border: 3px solid #ffffff;
  box-shadow: 0 6px 14px rgba(2,6,23,.18);

  @media (max-width: 420px) {
    width: 78px; height: 78px; font-size: 20px;
  }
  @media (max-width: 380px) {
    width: 64px; height: 64px; font-size: 18px;
  }
`;

const RightPanel = styled.div`
  padding: 16px 18px;
  display: grid;
  gap: 10px;
  min-width: 0;

  @media (max-width: 380px) {
    padding: 12px;
  }
`;

const TopRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  justify-content: space-between;
  min-width: 0;
`;

const Name = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: .2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1 1 auto;

  @media (max-width: 360px) {
    font-size: 18px;
  }
`;

const RolePill = styled.span`
  align-self: flex-start;
  padding: 6px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  flex: 0 0 auto;
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
  color: #64748b;
  font-size: 13px;
  font-weight: 700;

  @media (max-width: 360px) { font-size: 12px; }
`;

const InfoValue = styled.span`
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;

  @media (max-width: 360px) { font-size: 13px; }
`;

const InfoValueStrong = styled.span`
  font-size: 15px;
  font-weight: 900;

  @media (max-width: 360px) { font-size: 14px; }
`;

const InfoMuted = styled.div`
  color: #64748b;
  font-size: 13px;
  font-weight: 700;

  @media (max-width: 360px) { font-size: 12px; }
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
  top: ${({ $below }) => ($below ? "-10px" : "100%")};
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: ${({ $below }) => ($below ? "0" : "10px solid #ffffff")};
  border-bottom: ${({ $below }) => ($below ? "10px solid #ffffff" : "0")};
  filter: drop-shadow(0 -1px 0 ${({ theme }) => theme?.colors?.line || "#e7eaf0"});
  margin-top: ${({ $below }) => ($below ? "0" : "8px")};
`;
