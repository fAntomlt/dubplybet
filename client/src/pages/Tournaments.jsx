import React, { useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { flagForTeam } from "../lib/flags";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const joinApi = (p) => (p?.startsWith("/uploads") ? `${API_ORIGIN}${p}` : p || "");

const BG_ACTIVE   = `url('${joinApi(import.meta.env.VITE_TOURNAMENT_BG_ACTIVE   || "/uploads/turnyras-active.jpg")}')`;
const BG_DRAFT    = `url('${joinApi(import.meta.env.VITE_TOURNAMENT_BG_DRAFT    || "/uploads/turnyras-draft.jpg")}')`;
const BG_ARCHIVED = `url('${joinApi(import.meta.env.VITE_TOURNAMENT_BG_ARCHIVED || "/uploads/turnyras-archived.jpg")}')`;

const toUploadUrl = (p) => {
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;
  if (p.startsWith("/uploads")) return `${API_ORIGIN}${p}`;
  return p;
};
const FALLBACK_IMG = `url('${API_ORIGIN}/uploads/basketball.jpg')`;

const blurIn = keyframes`from{filter:blur(0)}to{filter:blur(3px)}`;
const initials = (name = "") =>
  name.split(" ").filter(Boolean).map(s => s[0]).slice(0,2).join("").toUpperCase() || "U";

const ImageLayer = styled.div`
  position:absolute; inset:0;
  background:${p=>p.$bg || FALLBACK_IMG}; background-size:cover; background-position:center;
  transition:transform .2s ease, filter .2s ease;
`;
const Overlay = styled.div`
  position: absolute; inset: 0; z-index: 1;
  /* default = subtle white film; when $dark, use a black film */
  background: ${p =>
    p.$dark
      ? `rgba(0,0,0,${p.$alpha ?? 0.45})`
      : `rgba(255,255,255,${p.$alpha ?? 0.03})`};
  transition: background .2s ease;
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
const Title = styled.h2`margin:0; font-size:clamp(22px,4vw,45px); font-weight:900; letter-spacing:-.02em;`;
const Dates = styled.div`font-weight:700;`;
const LiveRow = styled.div`
  display:inline-flex; align-items:center; gap:8px; font-weight:900; color:#b91c1c;
  background:rgba(255,255,255,.7); border-radius:999px; padding:4px 10px; width:fit-content;
  margin-top:20px;
`;
const LiveDot = styled.span`
  width:8px; height:8px; border-radius:50%; background:#ef4444; display:inline-block;
  box-shadow:0 0 0 6px rgba(239,68,68,.2);
`;
const CTA = styled.button`
  position:absolute; left:50%; top:50%; transform:translate(-50%,-50%) scale(.96);
  opacity:0; transition:opacity .18s ease, transform .18s ease; z-index:3;
  border:0; border-radius:999px; padding:12px 20px; font-weight:900; letter-spacing:.02em;
  background:#1f6feb; color:#fff; box-shadow:0 8px 20px rgba(31,111,235,.35); cursor:pointer;
`;

const CardBase = styled.div`position:relative; height:200px; border-radius:16px; overflow:hidden; background:#000;`;
const CardContent = styled.div`
  position:absolute; inset:0; z-index:2;
  display:grid;
  place-items:center;        /* centers both vertically + horizontally */
  text-align:center; 
  color:#fff; gap:6px; padding:12px;
`;
const CardTitle = styled.div`font-size:clamp(18px,2.3vw,22px); font-weight:900; letter-spacing:-.01em; text-shadow: 0 2px 6px rgba(0,0,0,0.6);`; 
const CardDates = styled.div`font-weight:700; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);`;

const SectionHeader = styled.h3`margin:0; font-size:16px; letter-spacing:.08em; font-weight:900; color:#0f172a;`;
const Grid = styled.div`display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px;`;
const EmptyHint = styled.div`color:#64748b; font-weight:600;`;
const EmptySmall = styled.div`color:#94a3b8; font-size:14px;`;

const CardLive = styled.div`
  display:inline-flex; align-items:center; gap:8px; font-weight:900; color:#b91c1c; text-shadow: 0 1px 3px rgba(0,0,0,0.4);
  background:rgba(255,255,255,.7); border-radius:999px; padding:3px 8px;
`;
const DraftCard = styled(CardBase)`
  pointer-events:none; box-shadow:0 4px 12px rgba(2,6,23,.08);
  &:hover ${ImageLayer}{ transform:scale(1.03); filter:saturate(1.05); }
  &:hover ${Overlay}{ background:rgba(0,0,0,.6); }
`;
const SoonRow = styled.div`
  display:inline-flex; align-items:center; gap:8px; font-weight:900;
  background:rgba(255,255,255,.7); border-radius:999px; padding:3px 8px;
`;

const shimmer = keyframes`0%{background-position:-200px 0}100%{background-position:calc(200px + 100%) 0}`;
const SkeletonHero = styled.div`
  height:220px; width:100%; border-radius:18px; background:#f3f4f6; position:relative; overflow:hidden;
  &:after{content:""; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);
    background-size:200px 100%; animation:${shimmer} 1.2s infinite;}
`;
const SkeletonCard = styled.div`
  height:200px; border-radius:16px; background:#f3f4f6; position:relative; overflow:hidden;
  &:after{content:""; position:absolute; inset:0; background:linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent);
    background-size:200px 100%; animation:${shimmer} 1.2s infinite;}
`;

const HeroCard = styled.div`
  position:relative; width:100%; min-height:220px; border-radius:18px; overflow:hidden;
  cursor:pointer; box-shadow:0 8px 24px rgba(2,6,23,.12); background:#000;
  &:hover ${ImageLayer}{ animation:${blurIn} .25s ease forwards; transform:scale(1.04); }
  &:hover ${Overlay}{ background:rgba(255,255,255,.28); }
  &:hover ${CTA}{ opacity:1; transform:translate(-50%,-50%) scale(1); }
`;

const MiniCTA = styled(CTA)`
  top:auto; bottom:18px; transform:translate(-50%,6px); padding:10px 16px; opacity:0;
`;

const ActiveCard = styled(CardBase)`
  cursor:pointer; box-shadow:0 6px 18px rgba(2,6,23,.12);
  &:hover ${Overlay}{ background:rgba(255,255,255,.26); }
  &:hover ${MiniCTA}{ opacity:1; transform:translateY(0); }
  &:hover ${ImageLayer}{ transform:scale(1.03); filter:blur(2px); }
`;

const ArchivedCard = styled(CardBase)`
  cursor:pointer; box-shadow:0 4px 12px rgba(2,6,23,.08);
  &:hover ${ImageLayer}{ transform:scale(1.03); filter:blur(2px); }
  &:hover ${Overlay}{ background:rgba(255,255,255,.26); }
  &:hover ${CTA}{ opacity:1; transform:translate(-50%,-50%) scale(1); }
`;

const CenterStack = styled.div`
  display: grid;
  gap: 4px;
`;

const WinnerRow = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 900;
  color: #ffffffff;
  border-radius: 999px;
  padding: 4px 10px;
`;

const Trophy = styled.span`
  display: inline-block;
  font-size: 16px;
`;

const PageHeader = styled.h1`
  font-size: clamp(28px, 6vw, 36px);
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #0f172a;
`;

const Divider = styled.div`
  height: 1px;
  background: #eceff3;
  margin: 10px 0 30px 0;
`;

const InlineGroup = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;
const FlagBare = styled.span`
  display: inline-grid;
  place-items: center;
  width: 20px;
  height: 20px;
`;
const AvatarBare = styled.span`
  display: inline-grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${p => p.$img ? `url(${p.$img}) center/cover no-repeat` : "transparent"};
  color: #fff;
  font-weight: 900;
  font-size: 11px;
  text-shadow: 0 1px 6px rgba(0,0,0,.6);
`;
const WinnersStack = styled.div`
  display: grid;
  gap: 0;
  justify-items: center;
`;
const ChampionIcon = styled.span`
  display: inline-block;
  font-size: 16px;
`;


export default function Turnyrai() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [champByTid, setChampByTid] = useState({});
  const d10 = (v) => String(v || '').slice(0, 10);

  useEffect(() => {
    (async () => {
      try {
        const data = await api("/api/tournaments");
        setRows(data.tournaments || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => { document.title = "Turnyrai – DuBPlyBET"; }, [])

  const { heroActive, restActive, draftSorted, archivedSorted } = useMemo(() => {
    const active   = rows.filter(t => t.status === "active");
    const draft    = rows.filter(t => t.status === "draft");
    const archived = rows.filter(t => t.status === "archived");

    // Active: most recently started first
    active.sort((a, b) => (b.start_date || "").localeCompare(a.start_date || ""));
    // Draft: soonest start first
    draft.sort((a, b) => (a.start_date || "").localeCompare(b.start_date || ""));
    // Archived: most recently ended first
    archived.sort((a, b) => (b.end_date || "").localeCompare(a.end_date || ""));

    return {
      heroActive: active[0] || null,
      restActive: active.slice(1),
      draftSorted: draft,
      archivedSorted: archived,
    };
  }, [rows]);
  useEffect(() => {
  if (!archivedSorted.length) return;

  const missing = archivedSorted
    .map(t => t.id)
    .filter(id => champByTid[id] === undefined);
  if (!missing.length) return;

  (async () => {
    const entries = await Promise.all(missing.map(async (id) => {
      try {
        const d = await api(`/api/leaderboards/tournament/${id}`);
        const list = (d.leaderboard || []).slice();
        const num = (v, def = 0) => (Number.isFinite(v) ? v : def);
        list.sort((a, b) => {
          const p = num(b.points) - num(a.points);
          if (p) return p;
          const ca = num(b.correct_any) - num(a.correct_any);
          if (ca) return ca;
          const aGuessCnt = num(a.guesses_count ?? a.predictions_count ?? a.total_guesses, null);
          const bGuessCnt = num(b.guesses_count ?? b.predictions_count ?? b.total_guesses, null);
          if (aGuessCnt !== null && bGuessCnt !== null && aGuessCnt !== bGuessCnt) return aGuessCnt - bGuessCnt;
          const aTime = a.last_updated_at || a.updated_at || a.last_guess_at || "";
          const bTime = b.last_updated_at || b.updated_at || b.last_guess_at || "";
          if (aTime && bTime && aTime !== bTime) return aTime.localeCompare(bTime);
          const n = String(a.username || "").localeCompare(String(b.username || ""));
          if (n) return n;
          return num(a.user_id, 0) - num(b.user_id, 0);
        });
        const top = list[0];
        return [id, top ? {
          user_id: top.user_id ?? top.id,
          username: top.username ?? top.name ?? `#${top.user_id ?? top.id}`,
          avatarUrl: top.avatarUrl ?? top.avatar_url ?? null,
        } : null];
      } catch {
        return [id, null];
      }
    }));
    setChampByTid(prev => {
      const next = { ...prev };
      for (const [id, v] of entries) next[id] = v;
      return next;
    });
  })();
}, [archivedSorted, champByTid]);



  const bgForStatus = (status) => {
    switch (status) {
      case "active":   return BG_ACTIVE;
      case "draft":    return BG_DRAFT;
      case "archived": return BG_ARCHIVED;
      default:         return FALLBACK_IMG;
    }
  };
  const bgOf = (t) => {
    if (t?.cover_url) return `url('${toUploadUrl(t.cover_url)}')`;
    return bgForStatus(t?.status);
  };
  const goTo = (t) => navigate(`/turnyrai/${t.id}`);

  if (loading) {
    return (
      <Wrap>
        <SkeletonHero />
        <SectionHeader>ARTĖJANTYS TURNYRAI</SectionHeader>
        <Grid>{[...Array(3)].map((_,i)=><SkeletonCard key={i}/>)}</Grid>
        <SectionHeader>PRAĖJĘ TURNYRAI</SectionHeader>
        <Grid>{[...Array(3)].map((_,i)=><SkeletonCard key={i}/>)}</Grid>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <PageHeader>Turnyrai</PageHeader>
      {/* ACTIVE */}
      {heroActive ? (
        <>
          <HeroCard
            $bg={bgOf(heroActive)}
            role="button"
            tabIndex={0}
            onClick={() => goTo(heroActive)}
            onKeyDown={e => (e.key === "Enter" || e.key === " ") && goTo(heroActive)}
            aria-label={`Atidaryti turnyrą ${heroActive.name}`}
          >
            <ImageLayer $bg={bgOf(heroActive)} />
            <Overlay />
            <HeroContent>
              <div>
                <Title>{heroActive.name}</Title>
                <Dates>{d10(heroActive.start_date)} – {d10(heroActive.end_date)}</Dates>
              </div>
              <LiveRow><LiveDot /> <span>GYVAI</span></LiveRow>
            </HeroContent>
            <CTA>DALYVAUTI</CTA>
          </HeroCard>

          {!!restActive.length && (
            <Grid style={{ marginTop: 16 }}>
              {restActive.map(t => (
                <ActiveCard
                  key={t.id}
                  $bg={bgOf(t)}
                  role="button"
                  tabIndex={0}
                  onClick={() => goTo(t)}
                  onKeyDown={e => (e.key === "Enter" || e.key === " ") && goTo(t)}
                >
                  <ImageLayer $bg={bgOf(t)} />
                  <Overlay />
                  <CardContent>
                    <CardTitle>{t.name}</CardTitle>
                    <CardDates>{d10(t.start_date)} – {d10(t.end_date)}</CardDates>
                    <CardLive><LiveDot /> <span>GYVAI</span></CardLive>
                  </CardContent>
                  <MiniCTA>DALYVAUTI</MiniCTA>
                </ActiveCard>
              ))}
            </Grid>
          )}
          <Divider />
        </>
      ) : null}

      {/* DRAFT */}
      <SectionHeader>ARTĖJANTYS TURNYRAI</SectionHeader>
      {draftSorted.length ? (
        <Grid>
          {draftSorted.map(t => (
            <DraftCard key={t.id} $bg={bgOf(t)} aria-label={`${t.name} – jau greitai`}>
              <ImageLayer $bg={bgOf(t)} />
              <Overlay $dark $alpha={0.53} />
              <CardContent>
                <CenterStack>
                <CardTitle>{t.name}</CardTitle>
                <CardDates>{d10(t.start_date)} – {d10(t.end_date)}</CardDates>
                </CenterStack>
                <SoonRow><span aria-hidden>⏳</span> <span>JAU GREITAI</span></SoonRow>
              </CardContent>
            </DraftCard>
          ))}
        </Grid>
      ) : <EmptySmall>Nėra artėjančių turnyrų.</EmptySmall>}

      {/* ARCHIVED */}
      <SectionHeader>PRAĖJĘ TURNYRAI</SectionHeader>
      {archivedSorted.length ? (
        <Grid>
          {archivedSorted.map(t => (
            <ArchivedCard
              key={t.id}
              $bg={bgOf(t)}
              role="button"
              tabIndex={0}
              onClick={() => goTo(t)}
              onKeyDown={e => (e.key === "Enter" || e.key === " ") && goTo(t)}
            >
              <ImageLayer $bg={bgOf(t)} />
              <Overlay />
              <CardContent>
  <CenterStack>
    <CardTitle>{t.name}</CardTitle>
    <CardDates>{d10(t.start_date)} – {d10(t.end_date)}</CardDates>
  </CenterStack>

  {(t.winner_team || champByTid[t.id]) && (
    <WinnersStack>
  {t.winner_team && (
    <WinnerRow title="Turnyro nugalėtojas">
      <Trophy aria-hidden>🏆</Trophy>
      <InlineGroup>
        <span>{t.winner_team}</span>
        <FlagBare>{flagForTeam(t.winner_team, 18)}</FlagBare>
      </InlineGroup>
    </WinnerRow>
  )}

  {champByTid[t.id] && (
    <WinnerRow title="Spėliojimų čempionas">
      <ChampionIcon aria-hidden>👑</ChampionIcon>
      <InlineGroup>
        <span>{champByTid[t.id].username}</span>
        <AvatarBare $img={champByTid[t.id].avatarUrl ? joinApi(champByTid[t.id].avatarUrl) : null}>
          {!champByTid[t.id].avatarUrl ? <span>{initials(champByTid[t.id].username)}</span> : null}
        </AvatarBare>
      </InlineGroup>
    </WinnerRow>
  )}
</WinnersStack>
  )}
</CardContent>
              <CTA>PERŽIŪRĖTI</CTA>
            </ArchivedCard>
          ))}
        </Grid>
      ) : <EmptySmall>Nėra praėjusių turnyrų.</EmptySmall>}
    </Wrap>
  );
}

/* =================== styles =================== */

const Wrap = styled.div`display:grid; gap:24px;`;

