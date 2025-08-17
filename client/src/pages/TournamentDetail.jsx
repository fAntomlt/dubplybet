// src/pages/TournamentDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { flagForTeam, stageLabel, bandFromDiff } from "../lib/flags";
import { guessConditionPretty } from "../lib/conditions";
import { FiLock, FiChevronDown } from "react-icons/fi";
import { getAuth } from "../store/auth";

const PAGE_SIZE = 15;

export default function TournamentDetail(){
  const { id } = useParams(); // :id
  const tid = Number(id);
  const { token } = getAuth() || {};

  const [tournament, setTournament] = useState(null);
  const [upcomingLocked, setUpcomingLocked] = useState([]); // scheduled+locked (from /upcoming)
  const [finished, setFinished] = useState([]);
  const [finTotal, setFinTotal] = useState(0); // optional if you later add a count route
  const [finPage, setFinPage] = useState(1);

  const [expanded, setExpanded] = useState(new Set());
  const [guesses, setGuesses] = useState({}); // {gameId: {loading, items}}
  const [modal, setModal] = useState({ open:false, game:null, a:"", b:"", err:"", saving:false });

  useEffect(() => {
    // tournament
    (async () => {
      try {
        const t = await api(`/api/tournaments/${tid}`);
        setTournament(t.tournament);
      } catch {
        const list = await api(`/api/tournaments`);
        setTournament((list.tournaments || []).find(x=>x.id===tid) || null);
      }
    })();
  }, [tid]);

  useEffect(() => {
    // upcoming + locked
    (async () => {
      const d = await api(`/api/games/upcoming?tournament_id=${tid}`, { headers: token ? { Authorization:`Bearer ${token}` } : {} });
      setUpcomingLocked(d.games || []);
    })();
  }, [tid, token]);

  useEffect(() => {
    loadFinished(finPage);
  }, [tid, token, finPage]);

  async function loadFinished(page){
    const offset = (page-1)*PAGE_SIZE;
    const d = await api(`/api/games/finished?tournament_id=${tid}&limit=${PAGE_SIZE}&offset=${offset}`, { headers: token ? { Authorization:`Bearer ${token}` } : {} });
    setFinished(d.games || []);
    // if you later return total, update finTotal; for now we’ll paginate while there are 15
    setFinTotal((d.games || []).length < PAGE_SIZE && page>1 ? (offset + (d.games || []).length) : (offset + PAGE_SIZE + 1)); // cheap way to keep paginator clickable next if full page
  }

  // split upcoming list
  const upcoming = useMemo(()=> (upcomingLocked.filter(g => g.status==="scheduled" && !g.locked)), [upcomingLocked]);
  const ongoing  = useMemo(()=> (upcomingLocked.filter(g => g.status!=="scheduled" || g.locked)), [upcomingLocked]);

  // helpers
  const d10 = s => String(s||"").slice(0,10);
  const t5  = s => String(s||"").slice(11,16).replace("T"," "); // HH:mm from "YYYY-MM-DD HH:mm:ss"
  const toggle = id => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); if(!guesses[id]) fetchGuesses(id); return n; });

  async function fetchGuesses(gameId, order="team"){
    setGuesses(prev => ({...prev, [gameId]: {loading:true, items: prev[gameId]?.items || []}}));
    const d = await api(`/api/games/${gameId}/guesses?order=${order}`);
    setGuesses(prev => ({...prev, [gameId]: {loading:false, items: d.guesses || []}}));
  }

  function openGuess(g){
    const mine = g.my_guess || null;
    setModal({
      open:true,
      game:g,
      a: mine ? String(mine.guess_a) : "",
      b: mine ? String(mine.guess_b) : "",
      err: "",
      saving:false,
    });
  }
  function closeModal(){ setModal(m => ({...m, open:false})); }

  const numOrNaN = v => (v === "" ? NaN : Number(v));
  const modalPreview = useMemo(() => {
    const ga = numOrNaN(modal.a);
    const gb = numOrNaN(modal.b);
    if (!modal.open || !Number.isFinite(ga) || !Number.isFinite(gb)) return "";
    const { team_a, team_b, stage } = modal.game || {};
    const diff = Math.abs(ga-gb);
    const band = bandFromDiff(diff);
    const winner = ga>gb ? team_a : (gb>ga ? team_b : "Lygiosios");
    const pts = stage === "playoff" ? (diff===0?0:(ga===gb?0:(diff===5?4:(diff>5?2:2)))) : (diff===0?0:(ga===gb?0:(diff===5?3:(diff>5?1:1)))); // visual only; real points come from server when finished
    return `${winner} ${band} [${diff} pt.] (${ga}-${gb})`;
  }, [modal]);

  async function submitGuess(){
    const ga = Number(modal.a), gb = Number(modal.b);
    if (!Number.isInteger(ga) || !Number.isInteger(gb) || ga<1 || gb<1 || ga>300 || gb>300){
      return setModal(m=>({...m, err:"Galima įvesti tik skaičius 1–300"}));
    }
    try {
      setModal(m=>({...m, saving:true, err:""}));
      await api(`/api/games/${modal.game.id/1}/guess`, {
        method:"POST",
        json:{ guess_a: ga, guess_b: gb },
        headers: token ? { Authorization:`Bearer ${token}` } : {},
      });
      // refresh upcoming list to get my_guess
      const d = await api(`/api/games/upcoming?tournament_id=${tid}`, { headers: token ? { Authorization:`Bearer ${token}` } : {} });
      setUpcomingLocked(d.games || []);
      closeModal();
    } catch (e) {
      setModal(m=>({...m, saving:false, err: e?.message || "Nepavyko išsaugoti"}));
    }
  }

  return (
    <Wrap>
      {/* Centered header with lines */}
      <TopHeader>
        <Line aria-hidden />
        <h1>{tournament?.name || "Turnyras"}</h1>
        <Line aria-hidden />
      </TopHeader>

      {/* Upcoming */}
      <Section>
        <H3>ARTĖJANTYS ŽAIDIMAI</H3>
        {upcoming.length ? upcoming.map(g => (
          <GameCard key={g.id}>
            <LeftCol>
              <PhasePill>{stageLabel(g.stage)}</PhasePill>
              <Teams>
                <TeamRow><span className="flag">{flagForTeam(g.team_a)}</span><span className="name">{g.team_a}</span></TeamRow>
                <TeamRow><span className="flag">{flagForTeam(g.team_b)}</span><span className="name">{g.team_b}</span></TeamRow>
              </Teams>
            </LeftCol>
            <RightCol>
              <When>
                <span>{d10(g.tipoff_at)}</span>
                <DividerV />
                <span>{t5(g.tipoff_at)}</span>
              </When>

              {/* My guess summary if exists */}
              {g.my_guess ? (
                <MyGuessBox>
                  <strong>TAVO SPĖJIMAS</strong>
                  <GuessPair>
                    <span className="flag">{flagForTeam(g.team_a)}</span>
                    <span className="name">{g.team_a}</span>
                    <span className="score">{g.my_guess.guess_a}</span>
                  </GuessPair>
                  <GuessPair>
                    <span className="flag">{flagForTeam(g.team_b)}</span>
                    <span className="name">{g.team_b}</span>
                    <span className="score">{g.my_guess.guess_b}</span>
                  </GuessPair>
                </MyGuessBox>
              ) : null}

              {/* CTA (hover shows change/create) */}
              <HoverCta
                onClick={()=>openGuess(g)}
                title={g.my_guess ? "KEISTI SPĖJIMĄ" : "SPĖTI REZULTATĄ"}
              >
                {g.my_guess ? "KEISTI SPĖJIMĄ" : "SPĖTI REZULTATĄ"}
              </HoverCta>

              <ExpandBtn onClick={()=>toggle(g.id)} aria-expanded={expanded.has(g.id)}>
                <FiChevronDown />
              </ExpandBtn>
            </RightCol>

            {expanded.has(g.id) && (
              <ExpandArea>
                <GuessesList game={g} guesses={guesses[g.id]} fetch={()=>fetchGuesses(g.id, "team")} finished={false} teamOrder />
              </ExpandArea>
            )}
          </GameCard>
        )) : <Empty>Nėra artėjančių rungtynių.</Empty>}
      </Section>

      <DividerH />

      {/* Ongoing (locked) */}
      <Section>
        <H3>VYKSTANTYS ŽAIDIMAI</H3>
        {ongoing.length ? ongoing.map(g => (
          <GameCard key={g.id}>
            <LeftCol>
              <PhasePill>{stageLabel(g.stage)}</PhasePill>
              <Teams>
                <TeamRow><span className="flag">{flagForTeam(g.team_a)}</span><span className="name">{g.team_a}</span></TeamRow>
                <TeamRow><span className="flag">{flagForTeam(g.team_b)}</span><span className="name">{g.team_b}</span></TeamRow>
              </Teams>
            </LeftCol>
            <RightCol>
              <When>
                <span>{d10(g.tipoff_at)}</span>
                <DividerV />
                <span className="lock"><FiLock /></span>
              </When>

              <MyGuessBox>
                <strong>TAVO SPĖJIMAS</strong>
                {g.my_guess ? (
                  <>
                    <GuessPair><span className="flag">{flagForTeam(g.team_a)}</span><span className="name">{g.team_a}</span><span className="score">{g.my_guess.guess_a}</span></GuessPair>
                    <GuessPair><span className="flag">{flagForTeam(g.team_b)}</span><span className="name">{g.team_b}</span><span className="score">{g.my_guess.guess_b}</span></GuessPair>
                  </>
                ) : <span style={{color:"#64748b"}}>ŠIO ŽAIDIMO REZULTATO NESPĖLIOJAI</span>}
              </MyGuessBox>

              <ExpandBtn onClick={()=>toggle(g.id)} aria-expanded={expanded.has(g.id)}>
                <FiChevronDown />
              </ExpandBtn>
            </RightCol>

            {expanded.has(g.id) && (
              <ExpandArea>
                <GuessesList game={g} guesses={guesses[g.id]} fetch={()=>fetchGuesses(g.id, "team")} finished={false} teamOrder />
              </ExpandArea>
            )}
          </GameCard>
        )) : <Empty>Nėra vykstančių rungtynių.</Empty>}
      </Section>

      <DividerH />

      {/* Finished with pagination */}
      <Section>
        <H3>PRAĖJĘ ŽAIDIMAI</H3>
        {finished.length ? finished.map(g => (
          <GameCard key={g.id}>
            <LeftCol>
              <PhasePill>{stageLabel(g.stage)}</PhasePill>
              <Teams>
                <TeamRow><span className="flag">{flagForTeam(g.team_a)}</span><span className="name">{g.team_a}</span><span className="scoreFinal">{g.score_a}</span></TeamRow>
                <TeamRow><span className="flag">{flagForTeam(g.team_b)}</span><span className="name">{g.team_b}</span><span className="scoreFinal">{g.score_b}</span></TeamRow>
              </Teams>
            </LeftCol>
            <RightCol>
              <MyGuessBox>
                <strong>TAVO SPĖJIMAS</strong>
                {g.my_guess ? (
                  <div style={{display:"grid",gap:6}}>
                    <div style={{whiteSpace:"pre-wrap", fontSize:14}}>
                      {/* Pretty with bolding rules */}
                      {renderMarkdownInline(
                        guessConditionPretty({
                          team_a: g.team_a,
                          team_b: g.team_b,
                          a: g.my_guess.guess_a,
                          b: g.my_guess.guess_b,
                          finished: true,
                          cond_ok: g.my_guess.cond_ok,
                          diff_ok: g.my_guess.diff_ok,
                          exact_ok: g.my_guess.exact_ok,
                          awarded_points: g.my_guess.awarded_points,
                        })
                      )}
                    </div>
                  </div>
                ) : <span style={{color:"#64748b"}}>Šio žaidimo nespėjai</span>}
              </MyGuessBox>

              <ExpandBtn onClick={()=>toggle(g.id)} aria-expanded={expanded.has(g.id)}>
                <FiChevronDown />
              </ExpandBtn>
            </RightCol>

            {expanded.has(g.id) && (
              <ExpandArea>
                <GuessesList game={g} guesses={guesses[g.id]} fetch={()=>fetchGuesses(g.id, "points")} finished />
              </ExpandArea>
            )}
          </GameCard>
        )) : <Empty>Nėra praėjusių rungtynių.</Empty>}

        {/* Simple paginator (client decides next/prev) */}
        <Pager>
          <button disabled={finPage<=1} onClick={()=>setFinPage(p=>p-1)}>Ankstesnis</button>
          <span>{finPage}</span>
          <button disabled={(finished||[]).length < PAGE_SIZE} onClick={()=>setFinPage(p=>p+1)}>Kitas</button>
        </Pager>
      </Section>

      {/* Guess modal */}
      {modal.open && (
        <ModalBackdrop onClick={closeModal}>
          <ModalCard onClick={e=>e.stopPropagation()}>
            <ModalHeader>
              <h3>{modal?.game?.my_guess ? "SPĖJIMO KOREGAVIMAS" : "REZULTATO SPĖJIMAS"}</h3>
              <CloseX onClick={closeModal}>×</CloseX>
            </ModalHeader>

            <ModalGrid>
              <Side>
                <Flag>{flagForTeam(modal.game.team_a, 22)}</Flag>
                <TeamName>{modal.game.team_a}</TeamName>
                <ScoreInput
                  inputMode="numeric"
                  placeholder="0"
                  value={modal.a}
                  onChange={e=>setModal(m=>({...m, a:e.target.value.replace(/\D/g,"")}))}
                />
              </Side>
              <Side>
                <Flag>{flagForTeam(modal.game.team_b, 22)}</Flag>
                <TeamName>{modal.game.team_b}</TeamName>
                <ScoreInput
                  inputMode="numeric"
                  placeholder="0"
                  value={modal.b}
                  onChange={e=>setModal(m=>({...m, b:e.target.value.replace(/\D/g,"")}))}
                />
              </Side>
            </ModalGrid>

            <PreviewLine>{modalPreview}</PreviewLine>
            {!!modal.err && <InlineErr>{modal.err}</InlineErr>}

            <Primary onClick={submitGuess} disabled={modal.saving}>
              {modal?.game?.my_guess ? "KEISTI SPĖJIMĄ" : "SPĖTI"}
            </Primary>
          </ModalCard>
        </ModalBackdrop>
      )}
    </Wrap>
  );
}

/* ===== Guesses sub-list ===== */
function GuessesList({ game, guesses, fetch, finished, teamOrder }){
  useEffect(()=>{ fetch(); }, []); // initial load
  const items = guesses?.items || [];
  if (guesses?.loading) return <Loading>Kraunama…</Loading>;
  if (!items.length) return <Muted>Spėjimų nėra</Muted>;

  // Sort rules for upcoming/ongoing:
  // by team (winner guess A group first, then A<, A=; then B> B< B=).
  let sorted = items;
  if (!finished && teamOrder) {
    const { team_a, team_b } = game;
    const bucket = (g) => {
      const A = g.guess_a, B = g.guess_b;
      const winner = A>B ? team_a : (B>A ? team_b : "tie");
      const diff = Math.abs(A-B);
      const sign = diff>5?0:(diff===5?2:1); // order: >, <, =
      // group A before B; if tie (shouldn’t happen), put last
      const teamRank = (winner===team_a)?0:(winner===team_b?1:2);
      return [teamRank, sign];
    };
    sorted = [...items].sort((x,y)=>{
      const [ta,sa] = bucket(x);
      const [tb,sb] = bucket(y);
      if (ta!==tb) return ta-tb;
      if (sa!==sb) return sa-sb;
      return String(x.username||"").localeCompare(String(y.username||""));
    });
  }

  if (finished){
    sorted = [...items].sort((a,b)=>{
      const pa = a.awarded_points ?? 0, pb = b.awarded_points ?? 0;
      if (pb!==pa) return pb-pa;
      return String(a.username||"").localeCompare(String(b.username||""));
    });
  }

  return (
    <GuessTable>
      <thead>
        <tr>
          <th>Vartotojas</th>
          <th>Sąlyga</th>
          {finished && <th>Taškai</th>}
        </tr>
      </thead>
      <tbody>
        {sorted.map((gu, i) => (
          <tr key={i}>
            <td>{gu.username || `#${gu.user_id}`}</td>
            <td>{renderMarkdownInline(
              guessConditionPretty({
                team_a: game.team_a,
                team_b: game.team_b,
                a: gu.guess_a,
                b: gu.guess_b,
                finished,
                cond_ok: gu.cond_ok,
                diff_ok: gu.diff_ok,
                exact_ok: gu.exact_ok,
                awarded_points: gu.awarded_points,
              })
            )}</td>
            {finished && <td style={{whiteSpace:"nowrap"}}>{gu.awarded_points ?? 0}p</td>}
          </tr>
        ))}
      </tbody>
    </GuessTable>
  );
}

/* ===== tiny markdown bold renderer for inline **...** only ===== */
function renderMarkdownInline(s){
  const parts = String(s).split(/\*\*/g);
  return parts.map((p, i) => i%2 ? <strong key={i}>{p}</strong> : <span key={i}>{p}</span>);
}

/* ===== styles ===== */
const Wrap = styled.div`display:grid; gap:22px;`;
const TopHeader = styled.div`
  display:grid; grid-template-columns:1fr auto 1fr; align-items:center; gap:10px;
  h1{ margin:0; font-size:clamp(20px,4.8vw,32px); font-weight:900; letter-spacing:-.02em; color:#0f172a; text-align:center; }
`;
const Line = styled.div`height:1px; background:#e5e7eb;`;
const Section = styled.section`display:grid; gap:12px;`;
const H3 = styled.h3`margin:0; font-size:14px; letter-spacing:.12em; color:#0f172a; font-weight:900;`;
const DividerH = styled.div`height:1px; background:#eceff3; margin:2px 0 8px;`;

const GameCard = styled.div`
  display:grid; grid-template-columns:1fr auto; gap:16px; align-items:center;
  border:1px solid #e5e7eb; border-radius:14px; padding:12px 12px; background:#fff;
  position:relative; overflow:hidden;
  &:hover .hoverCta{ opacity:1; transform:translateY(0); }
`;
const LeftCol = styled.div`display:grid; gap:8px;`;
const RightCol = styled.div`display:grid; gap:10px; justify-items:end;`;
const PhasePill = styled.div`display:inline-flex; align-items:center; gap:8px; font-weight:800; font-size:12px; background:#f3f6fc; padding:4px 8px; border-radius:999px;`;
const Teams = styled.div`display:grid; gap:6px;`;
const TeamRow = styled.div`
  display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:8px;
  .flag{font-size:18px}
  .name{font-weight:900}
  .scoreFinal{font-weight:900}
`;
const When = styled.div`display:inline-flex; align-items:center; gap:10px; font-weight:800;`;
const DividerV = styled.span`width:1px; height:14px; background:#e5e7eb; display:inline-block;`;
const HoverCta = styled.button`
  position:absolute; left:50%; bottom:8px; transform:translate(-50%,8px);
  background:#1f6feb; color:#fff; font-weight:900; border:0; border-radius:999px; padding:8px 12px; cursor:pointer;
  box-shadow:0 8px 20px rgba(31,111,235,.25);
  opacity:0; transition:opacity .18s ease, transform .18s ease; z-index:3;
  &.hoverCta{}
`;
const ExpandBtn = styled.button`
  border:1px solid #e5e7eb; background:#fff; border-radius:10px; width:36px; height:32px; display:grid; place-items:center; cursor:pointer;
`;
const ExpandArea = styled.div`grid-column:1 / -1; border-top:1px dashed #e5e7eb; padding-top:10px;`;
const MyGuessBox = styled.div`
  width:100%; min-width:260px; border:1px solid #e5e7eb; background:#f9fafb; border-radius:12px; padding:8px 10px; display:grid; gap:6px;
  strong{font-size:12px; letter-spacing:.08em;}
`;
const GuessPair = styled.div`display:grid; grid-template-columns:18px 1fr auto; gap:8px; align-items:center; .score{font-weight:900}`;
const Flag = styled.span`font-size:22px;`;
const TeamName = styled.div`font-weight:900;`;
const ScoreInput = styled.input`
  width:80px; border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; text-align:right; font-weight:900;
  &:focus{ outline:none; border-color:#99b9ff; box-shadow:0 0 0 4px rgba(31,111,235,.12); }
`;
const PreviewLine = styled.div`color:#0f172a; font-weight:700;`;
const InlineErr = styled.div`color:#dc2626; font-weight:700; font-size:13px;`;

const GuessTable = styled.table`
  width:100%; border-collapse:collapse; font-size:14px;
  th,td{ padding:6px 6px; border-bottom:1px solid #eef2f7; vertical-align:top; }
  th{ text-align:left; font-weight:800; color:#111827; background:#f9fafb; }
`;
const Loading = styled.div`color:#64748b;`;
const Muted = styled.div`color:#64748b;`;
const Empty = styled.div`color:#64748b; font-weight:600;`;
const Pager = styled.div`display:flex; gap:10px; align-items:center; justify-content:center; margin-top:8px; 
  button{border:1px solid #e5e7eb; background:#fff; border-radius:8px; padding:6px 10px; cursor:pointer;}
`;

const ModalBackdrop = styled.div`position:fixed; inset:0; background:rgba(15,23,42,.45); display:grid; place-items:center; z-index:1000;`;
const ModalCard = styled.div`width:100%; max-width:520px; background:#fff; border:1px solid #e5e7eb; border-radius:14px; padding:14px; box-shadow:0 16px 40px rgba(2,6,23,.2); display:grid; gap:12px;`;
const ModalHeader = styled.div`display:flex; align-items:center; justify-content:space-between; h3{margin:0; font-size:16px; font-weight:900;}`;
const CloseX = styled.button`border:0; background:transparent; font-size:22px; color:#64748b; cursor:pointer; &:hover{color:#0f172a}`;
const ModalGrid = styled.div`display:grid; grid-template-columns:1fr 1fr; gap:14px;`;
const Side = styled.div`display:grid; gap:6px; align-items:center; justify-items:center;`;
const Primary = styled.button`
  border:0; border-radius:10px; padding:10px 12px; cursor:pointer; font-weight:900; background:#1f6feb; color:#fff;
  &:disabled{opacity:.6; cursor:not-allowed;}
`;