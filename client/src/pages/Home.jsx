// src/pages/Home.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import UserCardPopover from "../components/UserCardPopover.jsx";

/* ======= shared helpers / constants ======= */
const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const joinApi = (p) => (p?.startsWith("/uploads") ? `${API_ORIGIN}${p}` : p || "");

// Backgrounds exactly like /pages/tournaments.jsx
const BG_ACTIVE   = `url('${joinApi(import.meta.env.VITE_TOURNAMENT_BG_ACTIVE   || "/uploads/turnyras-active.jpg")}')`;
const BG_DRAFT    = `url('${joinApi(import.meta.env.VITE_TOURNAMENT_BG_DRAFT    || "/uploads/turnyras-draft.jpg")}')`;
const BG_ARCHIVED = `url('${joinApi(import.meta.env.VITE_TOURNAMENT_BG_ARCHIVED || "/uploads/turnyras-archived.jpg")}')`;
const FALLBACK_IMG = `url('${API_ORIGIN}/uploads/basketball.jpg')`;
const HERO_H = 420
const d10 = (s) => String(s || "").slice(0, 10);

/* ======= Home ======= */
export default function Home() {
  const navigate = useNavigate();
  const pageRef = useRef(null);

  // Active tournament + leaderboards
  const [tournaments, setTournaments] = useState([]);
  const activeTournament = useMemo(
    () => tournaments.find((t) => t.status === "active") || null,
    [tournaments]
  );

  const [lbTourney, setLbTourney] = useState([]); // points
  const [lbAllTime, setLbAllTime] = useState([]); // correct

  // Latest content
  const [latestPost, setLatestPost] = useState(null);
  const [latestUpdate, setLatestUpdate] = useState(null);

  // Popover
  const [cardOpen, setCardOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [cardUser, setCardUser] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState("");
  const token = useMemo(() => localStorage.getItem("authToken"), []);
  const HOME_HERO_GIF = import.meta.env.VITE_HOME_HERO_GIF || "";
  const asBg = (p) => (p ? `url('${joinApi(p)}')` : null);
  const heroBg =
   asBg(HOME_HERO_GIF) || bgForStatus(activeTournament?.status);


  /* ---- effects ---- */
  useEffect(() => { document.title = "Pradžia – DuBPlyBET"; }, []);

  useEffect(() => {
    (async () => {
      try {
        const d = await api("/api/tournaments");
        setTournaments(d.tournaments || []);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [p, u] = await Promise.all([
          api("/api/posts?type=post&limit=1&offset=0"),
          api("/api/posts?type=update&limit=1&offset=0"),
        ]);
        setLatestPost((p.posts || [])[0] || null);
        setLatestUpdate((u.posts || [])[0] || null);
      } catch {}
    })();
  }, []);

  // Load leaderboards
  useEffect(() => {
    (async () => {
      try {
        const d = await api("/api/leaderboards/all-time");
        const rows = (d.leaderboard || []).map((r) => ({
          user_id: r.user_id ?? r.id,
          username: r.username ?? r.name ?? `#${r.user_id ?? r.id}`,
          avatarUrl: r.avatarUrl ?? r.avatar_url ?? null,
          correct: Number(r.correct_guesses_all_time ?? r.correct_any ?? r.correct ?? 0),
        }));
        // already roughly sorted by API; enforce stability + name/id tie-break
        rows.sort((a, b) => {
          if (b.correct !== a.correct) return b.correct - a.correct;
          const n = String(a.username || "").localeCompare(String(b.username || ""));
          if (n !== 0) return n;
          return (a.user_id ?? 0) - (b.user_id ?? 0);
        });
        setLbAllTime(rows.slice(0, 5));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!activeTournament) { setLbTourney([]); return; }
    (async () => {
      try {
        const d = await api(`/api/leaderboards/tournament/${activeTournament.id}`);
        const list = d.leaderboard || [];
        // same custom sorter you use in TournamentDetail.jsx for consistency
        const num = (v, d=0) => (Number.isFinite(v) ? v : d);
        list.sort((a, b) => {
          const p = num(b.points) - num(a.points);
          if (p) return p;
          const ca = num(b.correct_any) - num(a.correct_any);
          if (ca) return ca;
          // guesses count if present
          const aGuessCnt = num(a.guesses_count ?? a.predictions_count ?? a.total_guesses, null);
          const bGuessCnt = num(b.guesses_count ?? b.predictions_count ?? b.total_guesses, null);
          if (aGuessCnt !== null && bGuessCnt !== null && aGuessCnt !== bGuessCnt) {
            return aGuessCnt - bGuessCnt;
          }
          const aTime = a.last_updated_at || a.updated_at || a.last_guess_at || "";
          const bTime = b.last_updated_at || b.updated_at || b.last_guess_at || "";
          if (aTime && bTime && aTime !== bTime) return aTime.localeCompare(bTime);
          const nameCmp = String(a.username || "").localeCompare(String(b.username || ""));
          if (nameCmp) return nameCmp;
          return num(a.user_id, 0) - num(b.user_id, 0);
        });
        setLbTourney(list.slice(0, 5));
      } catch {}
    })();
  }, [activeTournament?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- popover ---- */
  async function fetchUserPublic(userId) {
    setCardLoading(true);
    setCardError("");
    setCardUser(null);
    try {
      const tid = activeTournament?.id || null;
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

  /* ---- helpers ---- */
  const initials = (name = "") =>
    name.split(" ").filter(Boolean).map((s) => s[0]).slice(0, 2).join("").toUpperCase() || "U";
  const bgForStatus = (status) => {
    switch (status) {
      case "active": return BG_ACTIVE;
      case "draft": return BG_DRAFT;
      case "archived": return BG_ARCHIVED;
      default: return FALLBACK_IMG;
    }
  };
  const goToTournament = (t) => navigate(`/turnyrai/${t.id}`);
  const goToPost = (p) => navigate(`/naujienos/${p.slug || p.id}`);
  const goToUpdate = (p) => navigate(`/atnaujinimai/${p.slug || p.id}`);

  return (
    <Wrap ref={pageRef}>
      <Grid>
        {/* ===== Left column ===== */}
        <LeftCol>
          {/* Active tournament hero card (same as Tournaments page) */}
          {activeTournament ? (
            <HeroCard
              $bg={asBg(HOME_HERO_GIF) || bgForStatus(activeTournament.status)}
              role="button"
              tabIndex={0}
              onClick={() => goToTournament(activeTournament)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && goToTournament(activeTournament)}
              aria-label={`Atidaryti turnyrą ${activeTournament.name}`}
            >
              <ImageLayer $bg={heroBg} />
              <Overlay />
              <HeroContent>
                <div>
                  <Title>{activeTournament.name}</Title>
                  <Dates>{d10(activeTournament.start_date)} – {d10(activeTournament.end_date)}</Dates>
                </div>
                <LiveRow><LiveDot /> <span>GYVAI</span></LiveRow>
              </HeroContent>
            </HeroCard>
          ) : (
            <SkeletonHero />
          )}

          <MiniGrid>
            {/* Latest post */}
            <MiniCard aria-label="Naujausia naujiena">
            <MiniHeader>
                <MiniKicker>NAUJAUSIA NAUJIENA</MiniKicker>
                {latestPost?.pinned ? <Pin aria-hidden>📌</Pin> : null}
            </MiniHeader>

            {latestPost?.header_url ? (
                <MiniThumb
                $clickable={!!latestPost?.header_url}
                role="button"
                tabIndex={0}
                aria-label="Atidaryti naujausią naujieną"
                style={{ backgroundImage: `url(${joinApi(latestPost.header_url)})` }}
                onClick={() => latestPost && goToPost(latestPost)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), latestPost && goToPost(latestPost))}
                />
            ) : (
                <MiniThumb className="placeholder" />
            )}

            <MiniBody>
                <MiniTitle
                $clickable={!!latestPost}
                role="button"
                tabIndex={0}
                onClick={() => latestPost && goToPost(latestPost)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), latestPost && goToPost(latestPost))}
                >
                {latestPost ? latestPost.title : "—"}
                </MiniTitle>

                {latestPost ? (
                <MiniMeta
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && e.stopPropagation()}
                >
                    <UserRow>
                    <MiniAvatar
                        $img={latestPost?.avatarUrl ? joinApi(latestPost.avatarUrl) : null}
                        role="button"
                        tabIndex={0}
                        aria-label={`Rodyti ${latestPost?.username} profilį`}
                        onClick={(e) => {
                        e.stopPropagation();
                        latestPost?.author_id && openCard(latestPost.author_id, e);
                        }}
                        onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            latestPost?.author_id && openCard(latestPost.author_id, e);
                        }
                        }}
                    >
                        {!latestPost?.avatarUrl ? <span>{initials(latestPost?.username)}</span> : null}
                    </MiniAvatar>

                    <MiniNick
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                        e.stopPropagation();
                        latestPost?.author_id && openCard(latestPost.author_id, e);
                        }}
                        onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            latestPost?.author_id && openCard(latestPost.author_id, e);
                        }
                        }}
                    >
                        {latestPost?.username || "—"}
                    </MiniNick>
                    </UserRow>

                    <MiniDate>{latestPost ? String(latestPost.created_at).slice(0, 16).replace("T", " ") : ""}</MiniDate>
                </MiniMeta>
                ) : null}
            </MiniBody>
            </MiniCard>

            {/* Latest update */}
            <MiniCard aria-label="Naujausias atnaujinimas">
            <MiniHeader>
                <MiniKicker>NAUJAUSIAS ATNAUJINIMAS</MiniKicker>
                {latestUpdate?.pinned ? <Pin aria-hidden>📌</Pin> : null}
            </MiniHeader>

            {latestUpdate?.header_url ? (
                <MiniThumb
                $clickable={!!latestUpdate?.header_url}
                role="button"
                tabIndex={0}
                aria-label="Atidaryti naujausią atnaujinimą"
                style={{ backgroundImage: `url(${joinApi(latestUpdate.header_url)})` }}
                onClick={() => latestUpdate && goToUpdate(latestUpdate)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); latestUpdate && goToUpdate(latestUpdate); }}}
                />
            ) : (
                <MiniThumb className="placeholder" />
            )}

            <MiniBody>
                <MiniTitle
                $clickable={!!latestUpdate}
                role="button"
                tabIndex={0}
                onClick={() => latestUpdate && goToUpdate(latestUpdate)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); latestUpdate && goToUpdate(latestUpdate); }}}
                >
                {latestUpdate ? (
                    <>
                    {latestUpdate?.version ? <Version>v{latestUpdate.version}</Version> : null}
                    {latestUpdate.title}
                    </>
                ) : "—"}
                </MiniTitle>

                {latestUpdate ? (
                <MiniMeta
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") e.stopPropagation();
                    }}
                >
                    <UserRow>
                    <MiniAvatar
                        $img={latestUpdate?.avatarUrl ? joinApi(latestUpdate.avatarUrl) : null}
                        role="button"
                        tabIndex={0}
                        aria-label={`Rodyti ${latestUpdate?.username} profilį`}
                        onClick={(e) => {
                        e.stopPropagation();
                        latestUpdate?.author_id && openCard(latestUpdate.author_id, e);
                        }}
                        onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            latestUpdate?.author_id && openCard(latestUpdate.author_id, e);
                        }
                        }}
                    >
                        {!latestUpdate?.avatarUrl ? <span>{initials(latestUpdate?.username)}</span> : null}
                    </MiniAvatar>

                    <MiniNick
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                        e.stopPropagation();
                        latestUpdate?.author_id && openCard(latestUpdate.author_id, e);
                        }}
                        onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            latestUpdate?.author_id && openCard(latestUpdate.author_id, e);
                        }
                        }}
                    >
                        {latestUpdate?.username || "—"}
                    </MiniNick>
                    </UserRow>

                    <MiniDate>
                    {latestUpdate ? String(latestUpdate.created_at).slice(0, 16).replace("T", " ") : ""}
                    </MiniDate>
                </MiniMeta>
                ) : null}
            </MiniBody>
            </MiniCard>
          </MiniGrid>
        </LeftCol>

        {/* ===== Right column ===== */}
        <RightCol>
          {/* Top 5 tournament leaderboard */}
          <BoardCard>
            <BoardHeader>
              <BoardTitle>TOP 5 – AKTYVAUS TURNYRO</BoardTitle>
              <BoardSub>{activeTournament ? activeTournament.name : "—"}</BoardSub>
            </BoardHeader>
            <BoardList>
              {lbTourney.length ? (
                lbTourney.map((u) => (
                  <RowCard key={u.user_id} title={u.username}>
                    <RowAvatar $img={u.avatarUrl ? joinApi(u.avatarUrl) : null}>
                      {!u.avatarUrl ? <span>{initials(u.username)}</span> : null}
                    </RowAvatar>
                    <RowInfo>
                      <RowName
                        role="button"
                        tabIndex={0}
                        onClick={(e) => openCard(u.user_id, e)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openCard(u.user_id, e)}
                      >
                        {u.username}
                      </RowName>
                      <RowMetric><strong>{u.points ?? 0}</strong> taškų</RowMetric>
                    </RowInfo>
                  </RowCard>
                ))
              ) : (
                <BoardEmpty>Reitingas dar tuščias.</BoardEmpty>
              )}
            </BoardList>
          </BoardCard>

          {/* Top 5 all-time leaderboard */}
          <BoardCard>
            <BoardHeader>
              <BoardTitle>TOP 5 – VISŲ LAIKŲ</BoardTitle>
              <BoardSub>Kiek kartų atspėta bent viena sąlyga</BoardSub>
            </BoardHeader>
            <BoardList>
              {lbAllTime.length ? (
                lbAllTime.map((u) => (
                  <RowCard key={u.user_id} title={u.username}>
                    <RowAvatar $img={u.avatarUrl ? joinApi(u.avatarUrl) : null}>
                      {!u.avatarUrl ? <span>{initials(u.username)}</span> : null}
                    </RowAvatar>
                    <RowInfo>
                      <RowName
                        role="button"
                        tabIndex={0}
                        onClick={(e) => openCard(u.user_id, e)}
                        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openCard(u.user_id, e)}
                      >
                        {u.username}
                      </RowName>
                      <RowMetric><strong>{u.correct ?? 0}</strong> teisingų spėjimų</RowMetric>
                    </RowInfo>
                  </RowCard>
                ))
              ) : (
                <BoardEmpty>Dar nėra reitingo.</BoardEmpty>
              )}
            </BoardList>
          </BoardCard>
        </RightCol>
      </Grid>

      {/* Popover */}
      <UserCardPopover
        open={cardOpen}
        anchorEl={anchorEl}
        onClose={closeCard}
        user={cardUser}
        loading={cardLoading && !cardUser}
        error={cardError}
        apiOrigin={API_ORIGIN}
        containerEl={pageRef.current}
      />
    </Wrap>
  );
}

/* =================== styles =================== */

const Wrap = styled.div`
  min-height: calc(100dvh - var(--main-pad-top, 24px) - var(--main-pad-bottom, 24px));

  /* Center the content block vertically (and keep full width) */
  display: grid;
  align-content: center;
  gap: 18px;

  /* Stop box-shadows/hover transforms from adding a 1-2px scroll */
  overflow: hidden;

  @media (min-width: 901px){
    padding-left: 30px;
    padding-right: 30px;
  }

  /* PHONE: let the hero bleed out of the container (for top/side edge-to-edge) */
  @media (max-width: 900px){
  overflow: visible;
  align-content: start;
  gap: 0;

  /* Change this to reveal more/less of the next component */
  --hero-peek: 320px;
}
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  align-items: start;          /* <-- key: no stretching across rows */

  @media (max-width: 900px){
    grid-template-columns: 1fr;
  }
`;

const LeftCol = styled.div`
  display: grid;
  gap: 14px;
`;

const RightCol = styled.div`
  display: grid;
  gap: 14px;
`;

/* ====== HERO CARD (copied to match tournaments page exactly) ====== */
const blurIn = keyframes`from{filter:blur(0)}to{filter:blur(3px)}`;

const ImageLayer = styled.div`
  position:absolute; inset:0;
  background:${p=>p.$bg || FALLBACK_IMG}; background-size:cover; background-position:center;
  transition:transform .2s ease, filter .2s ease;
`;
const Overlay = styled.div`
  position:absolute; inset:0; background:rgba(0,0,0,.65); transition:background .2s ease; z-index: 1;
`;
const HeroContent = styled.div`
  position:absolute; z-index:2; inset:0;
  color:#fff;
  padding:18px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align:center;
  gap: 8px;
`;
const Title = styled.h2`
  margin: 0;
  font-size: clamp(34px, 10vw, 84px);
  line-height: 1.05;
  font-weight: 900;
  letter-spacing: -.025em;
  text-shadow: 0 3px 10px rgba(0,0,0,.6);
`;
const Dates = styled.div`
  margin-top: 6px;
  font-size: clamp(16px, 3.5vw, 28px);
  font-weight: 800;
  opacity: .95;
  text-shadow: 0 2px 8px rgba(0,0,0,.55);
`;
const LiveRow = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-weight: 900;
  font-size: clamp(14px, 4.2vw, 20px);
  color: #b91c1c;
  background: rgba(255, 255, 255, .82);
  border-radius: 999px;
  padding: 6px 14px;
  width: fit-content;
  margin-top: 36px;
`;
const LiveDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ef4444;
  display: inline-block;
  box-shadow: 0 0 0 7px rgba(239,68,68,.18);
`;
const CTA = styled.button`
  position:absolute; left:50%; top:50%; transform:translate(-50%,-50%) scale(.96);
  opacity:0; transition:opacity .18s ease, transform .18s ease; z-index:3;
  border:0; border-radius:999px; padding:12px 20px; font-weight:900; letter-spacing:.02em;
  background:#1f6feb; color:#fff; box-shadow:0 8px 20px rgba(31,111,235,.35); cursor:pointer;
`;

const HeroCard = styled.div`
  position:relative; width:100%; min-height:${HERO_H}px; border-radius:18px; overflow:hidden;
  cursor:pointer; box-shadow:0 8px 24px rgba(2,6,23,.12); background:#000;

  &:hover ${ImageLayer}{ animation:${blurIn} .25s ease forwards; transform:scale(1.04); }
  &:hover ${Overlay}{ background:rgba(0,0,0,.35); }
  &:hover ${CTA}{ opacity:1; transform:translate(-50%,-50%) scale(1); }

  /* PHONE: full-bleed and full-height (below the sidebar) */
  @media (max-width: 900px){
  width: 100vw;
  /* exact math so the visible peek equals --hero-peek even with negative bottom margin */
  height: calc(100dvh - var(--hero-peek, 0px) + var(--main-pad-bottom, 0px));
  min-height: calc(100dvh - var(--hero-peek, 0px) + var(--main-pad-bottom, 0px));

  border-radius: 0;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  margin-top: calc(var(--main-pad-top) * -1);
  margin-bottom: calc(var(--main-pad-bottom) * -1);
  box-shadow: none;
}
`;

const shimmer = keyframes`0%{background-position:-200px 0}100%{background-position:calc(200px + 100%) 0}`;
const SkeletonHero = styled.div`
  height:${HERO_H}px; width:100%; border-radius:18px; background:#f3f4f6; position:relative; overflow:hidden;
  &:after{content:""; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);
    background-size:200px 100%; animation:${shimmer} 1.2s infinite;}
`;

/* ====== mini cards (latest post / update) ====== */
const MiniGrid = styled.div`
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 900px){
    padding-top: 16px; /* space below the full-bleed hero */
  }

  @media (max-width: 640px){
    grid-template-columns: 1fr;
  }
`;
const MiniCard = styled.article`
  border:1px solid #e7eaf0;
  background:#fff;
  border-radius:14px;
  overflow:hidden;
  display:grid;
  grid-template-rows: auto clamp(140px, 22vw, 200px) auto;
  box-shadow:0 6px 16px rgba(2,6,23,.06);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: #c9d6ec;
    box-shadow:0 10px 26px rgba(2,6,23,.10);
  }
`;
const MiniHeader = styled.div`
  display:flex; align-items:center; justify-content:space-between;
  padding:10px 12px; background:#f9fafb; border-bottom:1px solid #eef2f7;
`;
const MiniKicker = styled.div`
  font-size:11px; letter-spacing:.12em; font-weight:800; color:#0f172a; opacity:.8;
`;
const Pin = styled.span`font-size:18px; opacity:.9;`;
const MiniThumb = styled.div`
  background:#f3f4f6 center/cover no-repeat;
  cursor: ${p => (p.$clickable ? 'pointer' : 'default')};
  &.placeholder{ background:#f3f4f6; }
`;
const MiniBody = styled.div`display:grid; gap:8px; padding:10px 12px;`;
const Version = styled.span`
  font-size:12px; font-weight:800; color:#1f6feb; margin-right:8px; background:#eef4ff; padding:2px 6px; border-radius:6px;
`;
const MiniTitle = styled.h3`margin:0; font-size:18px; font-weight:800; color:#0f172a; cursor: ${p => (p.$clickable ? 'pointer' : 'default')};`;
const MiniMeta = styled.div`
  display:flex; align-items:center; justify-content:space-between; gap:8px;
`;
const UserRow = styled.div`display:flex; align-items:center; gap:8px;`;
const MiniAvatar = styled.div`
  width:28px; height:28px; border-radius:50%;
  background:${p=>p.$img ? `url(${p.$img}) center/cover no-repeat` : "#e7eaf0"};
  border:1px solid #e7eaf0; display:grid; place-items:center; color:#0f172a; font-weight:800;
`;
const MiniNick = styled.span`font-weight:700; cursor:pointer; &:hover{ text-decoration: underline; }`;
const MiniDate = styled.div`color:#64748b; font-weight:600; font-size:13px;`;

/* ====== Right: compact leaderboard cards ====== */
const BoardCard = styled.section`
  border:1px solid #e7eaf0; border-radius:14px; overflow:hidden; background:#fff;
  box-shadow:0 8px 24px rgba(2,6,23,.06); color:#0f172a;

  display:grid;
  grid-template-rows:auto 1fr;
  height:${HERO_H}px;      /* same height as hero */
`;
const BoardHeader = styled.div`
  padding:10px 12px;       /* slightly tighter */
  border-bottom:1px solid #e7eaf0;
  background:#ffffff;
  display:grid; gap:6px;
`;
const BoardTitle = styled.h3`
  margin:0; font-size:13px; letter-spacing:.14em; font-weight:800; color:#0f172a; opacity:.9;
`;
const BoardSub = styled.div`font-size:12px; color:#64748b; font-weight:700;`;
const BoardList = styled.div`
  padding:8px 10px;        /* slightly tighter */
  display:grid; gap:8px;
  min-height:0;            /* allow the inner area to actually scroll */
  overflow:auto;           /* scroll inside the leaderboard */
`;
const BoardEmpty = styled.div`color:#64748b; font-weight:700; padding:12px 8px; text-align:center;`;

const RowCard = styled.div`
  display:grid;
  grid-template-columns: 38px 1fr;  /* smaller avatar */
  gap: 8px;
  align-items: center;
  border:1px solid #e7eaf0;
  border-radius:12px;
  background:#ffffff;
  padding:8px;                      /* tighter padding */
  box-shadow: 0 2px 8px rgba(2,6,23,.04);
  transition: transform .14s ease, box-shadow .14s ease, border-color .14s ease;

  &:hover {
    transform: translateY(-1px);
    border-color: #d6e2fb;
    box-shadow: 0 6px 16px rgba(2,6,23,.10);
  }
`;
const RowAvatar = styled.div`
  width:38px; height:38px; border-radius:50%;
  background:${p=>p.$img ? `url(${p.$img}) center/cover no-repeat` : "#e5e7eb"};
  border:1px solid #e7eaf0; display:grid; place-items:center; color:#0f172a; font-weight:900;
  font-size: 12px;
`;
const RowInfo = styled.div`display:grid; align-content:center; gap:4px;`;
const RowName = styled.div`
  font-weight:800; color:#0f172a; line-height:1.1; cursor:pointer;
  &:hover { text-decoration: underline; }
`;
const RowMetric = styled.div`font-size:12px; color:#16a34a; font-weight:800;`;