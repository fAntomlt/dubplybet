// client/pages/LeaderboardsAllTime.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { api } from "../lib/api";
import UserCardPopover from "../components/UserCardPopover.jsx";

/**
 * All-Time Leaderboard
 * - Top 3 podium + list from 4th
 * - Shows "correct guesses" count (>= 1 condition met)
 * - Uses /api/leaderboards/all-time
 */

// If your API returns relative /uploads/* paths, prefix with API origin
const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const joinApi = (p) => (p?.startsWith("/uploads") ? `${API_ORIGIN}${p}` : p || "");

// Normalize whatever the API returns into a unified shape
function toRow(r) {
  return {
    user_id: r.user_id ?? r.id,
    username: r.username ?? r.name ?? `#${r.user_id ?? r.id}`,
    avatarUrl: r.avatarUrl ?? r.avatar_url ?? null,
    correct: Number(
      r.correct_guesses_all_time ??
      r.correct_any ??
      r.correct ??
      r.cnt ??
      0
    ),
  };
}

export default function LeaderboardsAllTime() {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const token = useMemo(() => localStorage.getItem("authToken"), []);
  const [cardOpen, setCardOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [cardUser, setCardUser] = useState(null);
    const [cardLoading, setCardLoading] = useState(false);
    const [cardError, setCardError] = useState("");

    async function fetchUserPublic(userId) {
  setCardLoading(true);
  setCardError("");
  setCardUser(null);

  try {
    let tid = null;
    try {
      const tRes = await fetch(`${API_ORIGIN}/api/tournaments`);
      const tData = await tRes.json();
      const list = tData?.tournaments || [];
      const active = list.find(t => t.status === "active") || list[0];
      tid = active?.id || null;
    } catch {}

    const url = tid
      ? `${API_ORIGIN}/api/users/public/${userId}?tournament_id=${tid}`
      : `${API_ORIGIN}/api/users/public/${userId}`;

    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(url, { headers });
    const data = await res.json();

    if (!res.ok || !data?.ok) {
      setCardError(data?.error || "Nepavyko užkrauti profilio");
      return;
    }
    setCardUser(data.user);
  } catch {
    setCardError("Serverio klaida įkeliant profilį");
  } finally {
    setCardLoading(false);
  }
}

function openCard(userId, e) {
  const el = e.currentTarget;
  // toggle if clicking the same anchor again
  if (cardOpen && anchorEl === el) {
    setCardOpen(false);
    setAnchorEl(null);
    return;
  }
  setAnchorEl(el);
  setCardOpen(true);
  fetchUserPublic(userId);
}

function closeCard() {
  setCardOpen(false);
  setAnchorEl(null);
}

  useEffect(() => {
    document.title = "Visų laikų lyderiai – DuBPlyBET";
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const d = await api("/api/leaderboards/all-time");
        const list = (d.leaderboard || []).map(toRow);
        // sort: correct desc, name A→Z, id asc
        list.sort((a, b) => {
          if (b.correct !== a.correct) return b.correct - a.correct;
          const nameCmp = String(a.username || "").localeCompare(String(b.username || ""));
          if (nameCmp !== 0) return nameCmp;
          return (a.user_id ?? 0) - (b.user_id ?? 0);
        });
        setRows(list);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const top3 = useMemo(() => rows.slice(0, 3), [rows]);
  const rest = useMemo(() => rows.slice(3), [rows]);

  const initials = (name = "") =>
    name
      .split(" ")
      .filter(Boolean)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  function renderPodium() {
    // left=2nd, center=1st, right=3rd
    const order = [top3[1], top3[0], top3[2]];
    const slots = [
      { place: 2, size: 52, step: 84, theme: "silver" },
      { place: 1, size: 64, step: 112, theme: "gold" },
      { place: 3, size: 52, step: 72, theme: "bronze" },
    ];

    return slots.map((slot, idx) => {
      const u = order[idx];
      if (!u) return <PodiumCol key={idx} />;

      const img = u.avatarUrl ? joinApi(u.avatarUrl) : null;
      return (
        <PodiumCol key={u.user_id} title={u.username}>
          <Step $h={slot.step}>
            <AvatarBig $size={slot.size} $img={img} aria-label={u.username}>
              {!img ? <span>{initials(u.username)}</span> : null}
              {slot.place === 1 ? <Crown aria-hidden>👑</Crown> : null}
              <PlaceBadge $theme={slot.theme}>{slot.place}</PlaceBadge>
            </AvatarBig>
            <StepInner>
              <PodiumName
                role="button"
                tabIndex={0}
                onClick={(e) => openCard(u.user_id, e)}
                onKeyDown={(e) => (e.key === "Enter" ? openCard(u.user_id, e) : null)}
                >{u.username}
              </PodiumName>
              <PodiumPoints $highlight={slot.place === 1}>{u.correct}</PodiumPoints>
            </StepInner>
          </Step>
        </PodiumCol>
      );
    });
  }

  const Podium = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  align-items: end;
  /* stages touch each other */
  gap: 0;
  padding: 10px 6px 18px;
  background: #f0f0f0ff;

  /* Hover effect for Top-3 (lift + subtle scale + shadow) */
  ${'' /* lift the stage */}
  & ${Step} {
    transition: transform 140ms ease, box-shadow 140ms ease;
    will-change: transform;
  }
  & ${AvatarBig} {
    transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease;
  }
  & ${PodiumCol}:hover ${Step} {
    transform: translateY(-4px);
    box-shadow: 0 8px 20px rgba(2,6,23,.10);
  }
  & ${PodiumCol}:hover ${AvatarBig} {
    transform: translate(-50%, -50%) scale(1.06);
    box-shadow: 0 6px 18px rgba(2,6,23,.18);
    border-color: #f59e0b;
  }
`;

  return (
    <Wrap>
      {/* Page-level header (outside the box, like Admin.jsx) */}
      <PageHeader>
        <PageTitle>VISŲ LAIKŲ LENTELĖ</PageTitle>
        <PageSub>Kiek kartų atspėta bent viena sąlyga</PageSub>
      </PageHeader>

      <LeaderboardWrap>
        {loading ? (
          <LBEmpty>Kraunama…</LBEmpty>
        ) : rows.length === 0 ? (
          <LBEmpty>Dar nėra reitingo.</LBEmpty>
        ) : (
          <>
            <Podium>{renderPodium()}</Podium>

            {/* List 4+ */}
            {rest.length ? (
              <LBList>
                {rest.map((u) => (
                  <LBRow key={u.user_id} title={u.username}>
                    <RowLeft>
                      <AvatarWrap $img={u.avatarUrl ? joinApi(u.avatarUrl) : null} data-fallback={u.username}>
                        {!u.avatarUrl ? <span>{initials(u.username)}</span> : null}
                      </AvatarWrap>
                      <RowName
                        role="button"
                        tabIndex={0}
                        onClick={(e) => openCard(u.user_id, e)}
                        onKeyDown={(e) => (e.key === "Enter" ? openCard(u.user_id, e) : null)}
                        >
                            {u.username}
                        </RowName>
                    </RowLeft>
                    <RowRight>{u.correct}</RowRight>
                  </LBRow>
                ))}
              </LBList>
            ) : null}
          </>
        )}
      </LeaderboardWrap>
      <UserCardPopover
        open={cardOpen}
        anchorEl={anchorEl}
        onClose={closeCard}
        user={cardUser}
        loading={cardLoading && !cardUser}
        error={cardError}
        apiOrigin={API_ORIGIN}
      />
    </Wrap>
  );
}

/* ====== Styles ====== */
const MOBILE_BP = 441;

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: calc(100vh - (var(--main-pad-y, 24px) * 2));
  width: 100%;
  box-sizing: border-box;

  @media (max-width: ${MOBILE_BP}px) {
    padding: 12px;
    gap: 12px;
  }
`;

/* Page-level header (outside the bordered card) */
const PageHeader = styled.div`
  display: grid;
  margin-bottom: 30px;
`;
const PageTitle = styled.h2`
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  color: #0f172a;
`;
const PageSub = styled.div`
  font-size: 14px;
  color: #64748b;
  font-weight: 700;
`;

const LeaderboardWrap = styled.section`
  border: 1px solid #e7eaf0;
  border-radius: 14px;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(2,6,23,.06);
  color: #0f172a;
`;

const LBEmpty = styled.div`
  color:#64748b; padding:16px 6px; text-align:center;
`;

/* Podium */

const PodiumCol = styled.div`
  position: relative;
  display: grid;
  justify-items: center;
  align-items: end;
`;

const AvatarBig = styled.div`
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
  width: ${p => p.$size}px;
  height: ${p => p.$size}px;
  border-radius: 50%;
  background: ${p => (p.$img ? `url(${p.$img}) center/cover no-repeat` : "#e5e7eb")};
  border: 2px solid #ffffff;
  display: grid;
  place-items: center;
  font-weight: 900;
  color: #0f172a;
`;

const Crown = styled.div`
  position: absolute;
  top: -18px;
  font-size: 20px;
  filter: drop-shadow(0 2px 2px rgba(0,0,0,.35));
`;

const PlaceBadge = styled.div`
  position: absolute;
  bottom: -6px;
  right: -6px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 900;
  color: #fff;
  background: ${p =>
    p.$theme === "gold" ? "#f59e0b" :
    p.$theme === "silver" ? "#9ca3af" : "#b35f00ff"};
  border: 2px solid #ffffff;
`;

const Step = styled.div`
  position: relative;
  width: 100%;
  height: ${p => p.$h}px;
  border-radius: 12px;
  background: #f8fafc;
  border: 1px solid #e7eaf0;
  margin-top: 30px;
  padding-top: 28px;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 6px;
`;

const StepInner = styled.div`
  display: grid;
  justify-items: center;
  gap: 4px;
  padding: 0 8px;
  text-align: center;
`;

const PodiumName = styled.div`
  font-weight: 800;
  color: #0f172a;
  font-size: 14px;
  line-height: 1.2;
  cursor: pointer;
  &:hover { text-decoration: underline; }
`;

const PodiumPoints = styled.div`
  font-weight: 900;
  font-size: 16px;
  color: ${p => (p.$highlight ? "#f59e0b" : "#16a34a")};
`;

/* List 4+ */
const LBList = styled.div`
  background:#ffffff;
  border-top: 1px solid #e7eaf0;
`;

const LBRow = styled.div`
  display:grid; grid-template-columns: 1fr auto; align-items:center;
  gap:8px; padding:12px;
  border-bottom:1px solid #e7eaf0;
  transition: background 120ms ease, transform 120ms ease, box-shadow 120ms ease;

  &:hover {
    background: #f8fafc;
    transform: translateX(2px);
    box-shadow: 0 4px 14px rgba(2,6,23,.06) inset;
  }

  &:last-child { border-bottom:0; }
`;

const RowLeft = styled.div`
  display:grid; grid-template-columns: 34px 1fr; gap:10px; align-items:center;
`;

const AvatarWrap = styled.div`
  width:34px; height:34px; border-radius:50%;
  background: ${p=>p.$img ? `url(${p.$img}) center/cover no-repeat` : "#e5e7eb"};
  border:1px solid #e7eaf0; display:grid; place-items:center; color:#0f172a; font-weight:900;
`;

const RowName = styled.div`
  font-weight: 800; color:#0f172a; cursor: pointer;
  &:hover { text-decoration: underline; }
`;
const RowRight = styled.div`
  font-weight:900; color:#16a34a; transition: color 120ms ease;
  ${LBRow}:hover & { color: #0f172a; }
`;