import React, { useEffect, useMemo, useState } from "react";
import styled, { keyframes } from "styled-components";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

// Global fallback image (you can set :root { --ball-img:url('/uploads/basketball.jpg'); })


const blurIn = keyframes`from{filter:blur(0)}to{filter:blur(3px)}`;


const FALLBACK_IMG = "url('/uploads/basketball.jpg)";
const ImageLayer = styled.div`
  position:absolute; inset:0;
  background:${p=>p.$bg || FALLBACK_IMG}; background-size:cover; background-position:center;
  transition:transform .2s ease, filter .2s ease;
`;
const Overlay = styled.div`
  position:absolute; inset:0; background:rgba(255,255,255,.22); transition:background .2s ease;
`;
const HeroContent = styled.div`
  position:relative; z-index:2; color:#0f172a; padding:18px 20px; display:grid; gap:6px;
`;
const Title = styled.h2`margin:0; font-size:clamp(22px,4vw,32px); font-weight:900; letter-spacing:-.02em;`;
const Dates = styled.div`font-weight:700;`;
const LiveRow = styled.div`
  display:inline-flex; align-items:center; gap:8px; font-weight:900; color:#b91c1c;
  background:rgba(255,255,255,.7); border-radius:999px; padding:4px 10px; width:fit-content;
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

/* Shared card bits */
const CardBase = styled.div`position:relative; height:200px; border-radius:16px; overflow:hidden; background:#000;`;
const CardContent = styled.div`
  position:absolute; inset:0; z-index:2; display:grid; align-content:center; justify-items:center;
  text-align:center; color:#0f172a; gap:6px; padding:12px;
`;
const CardTitle = styled.div`font-size:clamp(18px,2.3vw,22px); font-weight:900; letter-spacing:-.01em;`;
const CardDates = styled.div`font-weight:700;`;

const SectionHeader = styled.h3`margin:0; font-size:16px; letter-spacing:.08em; font-weight:900; color:#0f172a;`;
const Grid = styled.div`display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px;`;
const EmptyHint = styled.div`color:#64748b; font-weight:600;`;
const EmptySmall = styled.div`color:#94a3b8; font-size:14px;`;

/* Active small */

const CardLive = styled.div`
  display:inline-flex; align-items:center; gap:8px; font-weight:900; color:#b91c1c;
  background:rgba(255,255,255,.7); border-radius:999px; padding:3px 8px;
`;


/* Draft */
const DraftCard = styled(CardBase)`
  pointer-events:none; box-shadow:0 4px 12px rgba(2,6,23,.08);
  &:hover ${ImageLayer}{ transform:scale(1.03); filter:saturate(1.05); }
  &:hover ${Overlay}{ background:rgba(255,255,255,.25); }
`;
const SoonRow = styled.div`
  display:inline-flex; align-items:center; gap:8px; font-weight:900;
  background:rgba(255,255,255,.7); border-radius:999px; padding:3px 8px;
`;

/* Archived */


/* Skeletons */
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

export default function Turnyrai() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const bgOf = t => (t?.cover_url ? `url('${t.cover_url}')` : FALLBACK_IMG);
  const goTo = t => navigate(`/tournaments/${t.id}`);

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
              <Title>{heroActive.name}</Title>
              <Dates>{heroActive.start_date} – {heroActive.end_date}</Dates>
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
                    <CardDates>{t.start_date} – {t.end_date}</CardDates>
                    <CardLive><LiveDot /> <span>GYVAI</span></CardLive>
                  </CardContent>
                  <MiniCTA>DALYVAUTI</MiniCTA>
                </ActiveCard>
              ))}
            </Grid>
          )}
        </>
      ) : (
        <EmptyHint>Šiuo metu aktyvių turnyrų nėra.</EmptyHint>
      )}

      {/* DRAFT */}
      <SectionHeader>ARTĖJANTYS TURNYRAI</SectionHeader>
      {draftSorted.length ? (
        <Grid>
          {draftSorted.map(t => (
            <DraftCard key={t.id} $bg={bgOf(t)} aria-label={`${t.name} – jau greitai`}>
              <ImageLayer $bg={bgOf(t)} />
              <Overlay />
              <CardContent>
                <CardTitle>{t.name}</CardTitle>
                <CardDates>{t.start_date} – {t.end_date}</CardDates>
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
                <CardTitle>{t.name}</CardTitle>
                <CardDates>{t.start_date} – {t.end_date}</CardDates>
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

/* Hero */
