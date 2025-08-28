// src/pages/TournamentDetail.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { flagForTeam, stageLabel, bandFromDiff } from "../lib/flags";
import { guessConditionPretty } from "../lib/conditions";
import { FiLock, FiChevronDown, FiCheck, FiBookOpen } from "react-icons/fi";
import { FaFire } from "react-icons/fa";
import { getAuth } from "../store/auth";
import { useToast } from "../components/ToastProvider";
import UserCardPopover from "../components/UserCardPopover.jsx";

const PAGE_SIZE = 15;

const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const joinApi = (p) => (p?.startsWith("/uploads") ? `${API_ORIGIN}${p}` : p || "");

const BG_ACTIVE   = `url('${joinApi(import.meta.env.VITE_TOURNAMENT_BG_ACTIVE   || "/uploads/turnyras-active.jpg")}')`;
const BG_DRAFT    = `url('${joinApi(import.meta.env.VITE_TOURNAMENT_BG_DRAFT    || "/uploads/turnyras-draft.jpg")}')`;
const BG_ARCHIVED = `url('${joinApi(import.meta.env.VITE_TOURNAMENT_BG_ARCHIVED || "/uploads/turnyras-archived.jpg")}')`;
const FALLBACK_IMG = `url('${API_ORIGIN}/uploads/basketball.jpg')`;

const bgForStatus = (status) => {
  switch (status) {
    case "active":   return BG_ACTIVE;
    case "draft":    return BG_DRAFT;
    case "archived": return BG_ARCHIVED;
    default:         return FALLBACK_IMG;
  }
};

const bgForTournament = (t) => {
  if (t?.cover_url) return `url('${joinApi(t.cover_url)}')`;
  return bgForStatus(t?.status);
};

function ModalShell({ onClose, children}){
    const [show, setShow] = React.useState(false);

    React.useEffect(() => {
        const id = requestAnimationFrame(() => setShow(true));
        return () => cancelAnimationFrame(id);
        }, []);

    return (
        <ModalBackdrop onClick={onClose} $show={show}>
            <ModalCard onClick={(e) =>
                e.stopPropagation()} $show={show}>
                    {children}
            </ModalCard>
        </ModalBackdrop>
    )
}

export default function TournamentDetail(){
  const { id } = useParams(); // :id
  const tid = Number(id);
  const toast = useToast();
  const [authToken, setAuthToken] = useState(
    () => getAuth()?.token || localStorage.getItem("token") || ""
  );
  useEffect(() => {
    const refresh = () => {
      setAuthToken(getAuth()?.token || localStorage.getItem("token") || "");
    };
    refresh(); // run once on mount
    window.addEventListener("storage", refresh); // keep in sync if token changes in another tab
    return () => window.removeEventListener("storage", refresh);
  }, []);
  const [howOpen, setHowOpen] = useState(false);

  function renderMarkdownInline(input) {
  const esc = String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const html = esc.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

  const [tournament, setTournament] = useState(null);
  const isArchived = tournament?.status === "archived";
  const [upcomingLocked, setUpcomingLocked] = useState([]); // scheduled+locked (from /upcoming)
  const [finished, setFinished] = useState([]);
  const [finTotal, setFinTotal] = useState(0); // optional if you later add a count route
  const [finPage, setFinPage] = useState(1);

  const [expanded, setExpanded] = useState(new Set());
  const [guesses, setGuesses] = useState({}); // {gameId: {loading, items}}
  const [modal, setModal] = useState({ open:false, game:null, a:"", b:"", err:"", saving:false });
  const dayRailRef = useRef(null);

  // Leaderboard
  const [lbOpen, setLbOpen] = useState(false);
  const [lbLoading, setLbLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]); // [{user_id, username, avatarUrl, points}]

  const pageRef = useRef(null); // clamp popover to this page

  const [ucpOpen, setUcpOpen] = useState(false);
  const [ucpAnchor, setUcpAnchor] = useState(null);
  const [ucpUser, setUcpUser] = useState(null);
  const [ucpLoading, setUcpLoading] = useState(false);
  const [ucpError, setUcpError] = useState("");
  const profileCache = useRef(new Map());

  const closeUcp = () => {
    setUcpOpen(false);
    setUcpAnchor(null);
    setUcpError("");
  };

  async function openUserCardById(userId, username, avatarUrl, e) {
    if (!userId) return;
    setUcpAnchor(e.currentTarget);
    setUcpOpen(true);
    setUcpError("");

    const cached = profileCache.current.get(userId);
    if (cached) {
      setUcpUser(cached);
      return;
    }

    const base = { id: userId, user_id: userId, username, avatarUrl };
    setUcpUser(base);

    try {
      setUcpLoading(true);
      const d = await api(`/api/users/public/${userId}?tournament_id=${tid}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (d?.user) {
        profileCache.current.set(userId, d.user);
        setUcpUser(d.user);
      } else if (d?.ok === false) {
        setUcpError(d?.error || "Nepavyko užkrauti profilio");
      }
    } catch {
      setUcpError("Serverio klaida įkeliant profilį");
    } finally {
      setUcpLoading(false);
    }
  }

  // small helper when you already have a user object
  const openUserCard = (u, e) =>
    openUserCardById(u?.user_id ?? u?.id, u?.username, u?.avatarUrl, e);

  // Winner-pick modal
   const [pickModal, setPickModal] = useState({ open: false, team: "", saving: false, error: "", search: "" });

   const [bonus, setBonus] = useState({ loading: false, picks: [], error: "" });

  // Build a unique team list from games you already load
  const allTeams = useMemo(() => {
    const set = new Set();
    [...upcomingLocked, ...finished].forEach(g => {
      if (g?.team_a) set.add(g.team_a);
      if (g?.team_b) set.add(g.team_b);
    });
    return Array.from(set).sort((a, b) => String(a).localeCompare(String(b)));
  }, [upcomingLocked, finished]);

  function sortLeaderboard(a, b) {
    // normalize helpers (handle various API shapes without crashing)
    const num = (v, d = 0) => (Number.isFinite(v) ? v : d);

    // 1) points (desc)
    const p = num(b.points) - num(a.points);
    if (p !== 0) return p;

    // 2) correct_any (desc) – strictly as requested
    const ca = num(b.correct_any) - num(a.correct_any);
    if (ca !== 0) return ca;

    // 3a) fewer guesses (asc) if a count field exists
    const aGuessCnt = num(a.guesses_count ?? a.predictions_count ?? a.total_guesses, null);
    const bGuessCnt = num(b.guesses_count ?? b.predictions_count ?? b.total_guesses, null);
    if (aGuessCnt !== null && bGuessCnt !== null && aGuessCnt !== bGuessCnt) {
      return aGuessCnt - bGuessCnt; // fewer guesses ranks higher
    }

    // 3b) earlier timestamp wins (first-to-points feel), if available
    const aTime = a.last_updated_at || a.updated_at || a.last_guess_at || "";
    const bTime = b.last_updated_at || b.updated_at || b.last_guess_at || "";
    if (aTime && bTime && aTime !== bTime) {
      return aTime.localeCompare(bTime); // earlier first
    }

    // 3c) username A→Z
    const nameCmp = String(a.username || "").localeCompare(String(b.username || ""));
    if (nameCmp !== 0) return nameCmp;

    // 3d) user_id (asc) as final, stable fallback
    return num(a.user_id, 0) - num(b.user_id, 0);
  }

  async function loadLeaderboard() {
  if (leaderboard.length || lbLoading) return;
  try {
    setLbLoading(true);
    const d = await api(`/api/leaderboards/tournament/${tid}`);
    const list = d.leaderboard || [];
    setLeaderboard([...list].sort(sortLeaderboard));
  } finally {
    setLbLoading(false);
  }
}

  // remove " [5p]" (or any "[Xp]") fragments the formatter appends
    const cleanPointsTag = (s) => String(s).replace(/\s*\[\d+p\]/g, "");

    // LT points word: 1 taškas, 2-9 taškai (except 11-19), 0/5-... taškų
    const pointsWordLT = (n) => {
    const abs = Math.abs(n ?? 0);
    const mod10 = abs % 10, mod100 = abs % 100;
    if (mod10 === 1 && mod100 !== 11) return "Taškas";
    if (mod10 >= 2 && mod10 <= 9 && !(mod100 >= 12 && mod100 <= 19)) return "Taškai";
    return "taškų";
    };

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
  if (!tid || isArchived) {
    setUpcomingLocked([]);
    return;
  }
  (async () => {
    const d = await api(`/api/games/upcoming?tournament_id=${tid}`, {
      headers: authToken ? { Authorization:`Bearer ${authToken}` } : {}
    });
    setUpcomingLocked(d.games || []);
  })();
}, [tid, authToken, isArchived]);

  useEffect(() => {
  loadFinished(finPage);
}, [tid, authToken, finPage, isArchived]);

async function loadFinished(page){
  const pageSize = isArchived ? 100 : PAGE_SIZE;
  const offset = (page-1)*pageSize;
  const d = await api(
    `/api/games/finished?tournament_id=${tid}&limit=${pageSize}&offset=${offset}`,
    { headers: authToken ? { Authorization:`Bearer ${authToken}` } : {} }
  );
  setFinished(d.games || []);
  setFinTotal(
    (d.games || []).length < pageSize && page>1
      ? (offset + (d.games || []).length)
      : (offset + pageSize + 1)
  );
}

useEffect(() => {
  if (!tid || !isArchived) return;
  if (!leaderboard.length && !lbLoading) {
    loadLeaderboard();
  }
}, [tid, isArchived, leaderboard.length, lbLoading]);

  const [selectedDay, setSelectedDay] = useState(null);

  // YYYY-MM-DD "today" in Lithuania's local time
const todayISO = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vilnius",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date()); // -> "YYYY-MM-DD"

// helpers used by memos below
const d10 = (s) => String(s || "").slice(0, 10);

// derived flags from current selection
const isPastSelected = !!selectedDay && selectedDay < todayISO();
const isTodayOrFutureSelected = !!selectedDay && selectedDay >= todayISO();


  // split upcoming list
  const upcoming = useMemo(() => {
    const base = upcomingLocked.filter(g => g.status === "scheduled" && !g.locked);
    if (isTodayOrFutureSelected) {
      return base.filter(g => d10(g.tipoff_at) === selectedDay);
    }
    return base;
  }, [upcomingLocked, selectedDay]);

  const ongoing = useMemo(() => {
    const base = upcomingLocked.filter(g => g.status !== "scheduled" || g.locked);
    if (isTodayOrFutureSelected) {
      return base.filter(g => d10(g.tipoff_at) === selectedDay);
    }
    return base;
  }, [upcomingLocked, selectedDay]);
  // helpers
  const t5  = s => String(s||"").slice(11,16).replace("T"," "); // HH:mm from "YYYY-MM-DD HH:mm:ss"
  const toggle = id => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); if(!guesses[id]) fetchGuesses(id); return n; });

  function initials(name = "") {
  return name.split(" ").filter(Boolean).map(s => s[0]).slice(0,2).join("").toUpperCase() || "U";
  }

  // Avatar component with fallback via CSS background if no src
  const RowAvatar = ({ src, children, ...rest }) => {
    const has = !!src && src !== "null" && src !== "undefined";
    return (
      <AvatarWrap $img={has ? src : null} {...rest}>
        {!has ? <span>{children}</span> : null}
      </AvatarWrap>
    );
  };

    useEffect(() => {
  if (!authToken || !tid || isArchived) return;  // ← no pick UI on archived
  let cancelled = false;
  (async () => {
    try {
      const d = await api(`/api/tournaments/${tid}/winner-pick`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!cancelled && d && d.ok && d.picked === false) {
        setPickModal(p => ({ ...p, open: true }));
      }
    } catch (e) {
      const status = e?.status || e?.response?.status;
      if (!cancelled && status === 404) {
        setPickModal(p => ({ ...p, open: true }));
      }
    }
  })();
  return () => { cancelled = true; };
}, [tid, authToken, isArchived]);

    async function submitWinnerPick() {
    const team = String(pickModal.team || "").trim();
    if (!team) return setPickModal(p => ({ ...p, error: "Pasirinkite komandą" }));
    try {
      setPickModal(p => ({ ...p, saving: true, error: "" }));
      await api(`/api/tournaments/${tid}/winner-pick`, {
        method: "POST",
        json: { team },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      setPickModal({ open: false, team: "", saving: false, error: "", search: "" });
      toast.success(`Pasirinkote nugalėtoją: ${team}`);
    } catch (e) {
      const msg = e?.message || "Nepavyko išsaugoti";
      setPickModal(p => ({ ...p, saving: false, error: msg }));
    }
  }

  // Renders the 1–3 podium exactly like the image
function renderPodium(top3) {
  const slots = [
    { place: 2, size: 52,  step: 84,  theme: "silver" },
    { place: 1, size: 64,  step: 112, theme: "gold"   },
    { place: 3, size: 52,  step: 72,  theme: "bronze" },
  ];
  const order = [top3[1], top3[0], top3[2]]; // left=2nd, center=1st, right=3rd

  return slots.map((slot, idx) => {
    const u = order[idx];
    if (!u) return <PodiumCol key={idx} />;

    return (
      <PodiumCol key={u.user_id}>
        <Step $h={slot.step}>
          <AvatarBig
            $size={slot.size}
            $img={u.avatarUrl ? joinApi(u.avatarUrl) : null}
            data-fallback={u.username}
            aria-label={u.username}
            role="button"
            tabIndex={0}
            onClick={(e) => openUserCardById(u.user_id, u.username, u.avatarUrl, e)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openUserCardById(u.user_id, u.username, u.avatarUrl, e);
              }
            }}
          >
            {!u.avatarUrl ? <span>{initials(u.username)}</span> : null}
            {slot.place === 1 ? <Crown aria-hidden>👑</Crown> : null}
            <PlaceBadge $theme={slot.theme}>{slot.place}</PlaceBadge>
          </AvatarBig>

          <StepInner>
            <NickButton
              onClick={(e) => openUserCardById(u.user_id, u.username, u.avatarUrl, e)}
              aria-label={`Atidaryti ${u.username} profilį`}
            >
              <PodiumName as="span">{u.username}</PodiumName>
            </NickButton>
            <PodiumPoints $highlight={slot.place === 1}>{u.points}</PodiumPoints>
          </StepInner>
        </Step>
      </PodiumCol>
    );
  });
}

  // UI helpers for compact header + date lines
    const dOWMMMDD = (s) => {
    // use only the date part to avoid TZ shifts
    const [y, m, d] = String(s || "").slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return "";
    // noon UTC for that calendar date => no DST/offset jumps
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return dt
        .toLocaleDateString("lt-LT", {
        weekday: "short",
        month: "short",
        day: "2-digit",
        timeZone: "UTC",
        })
        .toUpperCase();
    };
    const phaseTiny = (stage) =>
        stage === "playoff" ? "PLAYOFFS" : "GROUP PHASE";

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
      const g = modal.game;
      await api(`/api/games/${modal.game.id/1}/guess`, {
        method:"POST",
        json:{ guess_a: ga, guess_b: gb },
        headers: authToken ? { Authorization:`Bearer ${authToken}` } : {},
      });
      // refresh upcoming list to get my_guess
      const d = await api(`/api/games/upcoming?tournament_id=${tid}`, {
        headers: authToken ? { Authorization:`Bearer ${authToken}` } : {}
      });
      setUpcomingLocked(d.games || []);
      closeModal();
      toast.success(`Spėjimas išsaugotas: ${g.team_a} ${ga}–${gb} ${g.team_b}`);
    } catch (e) {
      setModal(m=>({...m, saving:false, err: e?.message || "Nepavyko išsaugoti"}));
    }
  }

  const daysWithUpcoming = useMemo(() => {
  const set = new Set();
  (upcomingLocked || []).forEach(g => {
    if (g?.status === "scheduled" && !g?.locked) {
      set.add(d10(g.tipoff_at));
    }
  });
  return set;
}, [upcomingLocked]);


  useEffect(() => {
  const base = "DuBPlyBET";
  const name = (tournament?.name || "").trim();
  document.title = name ? `${name} - ${base}` : `Turnyras - ${base}`;
}, [tournament?.name]);


  useEffect(() => {
  if (!pickModal.open) return;
  const scrollBarW = window.innerWidth - document.documentElement.clientWidth;
  const prevOverflow = document.body.style.overflow;
  const prevPadRight = document.body.style.paddingRight;

  document.body.style.overflow = "hidden";
  if (scrollBarW > 0) document.body.style.paddingRight = `${scrollBarW}px`;

  return () => {
    document.body.style.overflow = prevOverflow;
    document.body.style.paddingRight = prevPadRight;
  };
}, [pickModal.open]);


  // Build day list from tournament date range (inclusive)
  const dayList = useMemo(() => {
  const s10 = String(tournament?.start_date || "").slice(0, 10); // YYYY-MM-DD
  const e10 = String(tournament?.end_date   || "").slice(0, 10);
  if (!s10 || !e10) return [];

  const start = new Date(`${s10}T12:00:00Z`);
  const end   = new Date(`${e10}T12:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];

  const out = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const yyyy = d.getUTCFullYear();
    const mm   = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd   = String(d.getUTCDate()).padStart(2, "0");
    out.push(`${yyyy}-${mm}-${dd}`);
  }
  return out;
}, [tournament?.start_date, tournament?.end_date]);

  // Choose default day when we enter archived view.
  // If you prefer the FIRST day, change last index (out.length-1) to 0.
  useEffect(() => {
    if (isArchived && dayList.length && !selectedDay) {
      setSelectedDay(dayList[dayList.length-1]); // default: LAST day
    }
  }, [isArchived, dayList, selectedDay]);

  // keep your LT-time default for ACTIVE tournaments
useEffect(() => {
  if (isArchived || !dayList.length || selectedDay) return;
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vilnius",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const start = dayList[0], end = dayList[dayList.length - 1];
  setSelectedDay(today < start ? start : (today > end ? end : today));
}, [isArchived, dayList, selectedDay]);

// and restore default day for ARCHIVED tournaments (last day)
useEffect(() => {
  if (!isArchived || !dayList.length || selectedDay) return;
  setSelectedDay(dayList[dayList.length - 1]);
}, [isArchived, dayList, selectedDay]);


  useEffect(() => {
  if (!isArchived || !tid) return;
  (async () => {
    try {
      setBonus({ loading: true, picks: [], error: "" });
      const d = await api(`/api/tournaments/${tid}/winner-picks/correct`);
      setBonus({ loading: false, picks: d.picks || [], error: "" });
    } catch (e) {
      setBonus({ loading: false, picks: [], error: "Šiuo metu nėra duomenų (API nepalaiko)." });
    }
  })();
}, [isArchived, tid]);

  // Games filtered by selected day
  const finishedForDay = useMemo(
   () => (selectedDay ? finished.filter(g => d10(g.tipoff_at) === selectedDay) : finished),
   [finished, selectedDay]
   );
   const finishedShown = finishedForDay; // render this everywhere

  // Label helper for day cards (matches your screenshot)
  function dayParts(d) {
  const dt = new Date(`${d}T12:00:00Z`); // safe from TZ shifts
  const y = dt.getUTCFullYear();
  const m = dt.getUTCMonth();  // 0–11
  const dow = dt.getUTCDay();  // 0–6  (Sun..Sat)

  const DOW_LT = ["SEK","PIR","ANT","TRE","KET","PEN","ŠEŠ"];   // Sun..Sat
  const MON_LT = ["SAU","VAS","KOV","BAL","GEG","BIR","LIE","RGP","RGS","SPA","LAP","GRU"];

  return {
    year: y,
    dow: DOW_LT[dow],
    mon: MON_LT[m],
    day: String(dt.getUTCDate()).padStart(2,"0"),
  };
}

  const scrollByCard = (dir /* -1 left, 1 right */) => {
    const rail = dayRailRef.current;
    if (!rail) return;

    const cards = Array.from(rail.querySelectorAll('[data-day-card="1"]'));
    if (!cards.length) return;

    const railCenter = rail.scrollLeft + rail.clientWidth / 2;
    let bestIdx = 0, bestDist = Infinity;

    cards.forEach((el, i) => {
      const cx = el.offsetLeft + el.offsetWidth / 2;
      const d = Math.abs(cx - railCenter);
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    });

    const next = Math.max(0, Math.min(cards.length - 1, bestIdx + dir));
    cards[next].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  };

  const centerSelectedDay = (behavior = "auto") => {
  const rail = dayRailRef.current;
  if (!rail) return;
  const active = rail.querySelector('[data-day-card="1"][aria-pressed="true"]');
  if (active) {
    active.scrollIntoView({ behavior, block: "nearest", inline: "center" });
  }
};

useEffect(() => {
  if (!selectedDay) return;
  // wait one frame so the card exists in the DOM
  const id = requestAnimationFrame(() => centerSelectedDay("auto"));
  return () => cancelAnimationFrame(id);
}, [selectedDay, dayList.length]);



  return (
    <Wrap ref={pageRef}>
      {tournament && (
          <HeaderCard aria-label={tournament.name}>
            <ImageLayer $bg={bgForTournament(tournament)} />
              <Overlay />
                <CardContent>
                  <CardInfo>
                    <CardTitle>{tournament.name}</CardTitle>
                    <CardDates>
                      {String(tournament.start_date || "").slice(0,10)} – {String(tournament.end_date || "").slice(0,10)}
                    </CardDates>
                  </CardInfo>
                </CardContent>
          </HeaderCard>
      )}
      <HowCard>
        <HowHeader
          type="button"
          onClick={() => setHowOpen((v) => !v)}
          aria-expanded={howOpen}
          aria-controls="how-body"
        >
          <div className="lh">
            <FiBookOpen />
            <span>TAISYKLĖS IR DALYVAVIMO PROCESAS</span>
          </div>
          <HowCaret $open={howOpen}>
            <FiChevronDown />
          </HowCaret>
        </HowHeader>

        <HowCollapse $open={howOpen} id="how-body">
          <HowInner $open={howOpen}>
            <HowBody>
              <p>
                Išsirinkus komandą favoritą, atsidaro visas turnyro puslapis. Per vidurį – dienų
                juosta: išsirenkate dieną ir spėjate tos dienos rungtynes.
              </p>
              <p>
                Jog spėti – tiesiog paspauskite ant rungtynių. Atsidarius langui, suvedate
                abiejų komandų galutinį rezultatą. Įrašius skaičius, viduryje iškart
                pamatysite <strong>jūsų spėjimo sąlygą</strong>:
                <br />
                <strong>Komanda X &gt;, &lt;, = 5 [X pt.] (XX–XX)</strong>
              </p>
              <p>
                Kiekvienas teisingas spėjimas taipogi keliauja į nepriklausomą nuo turnyrų <strong>Visų laikų</strong>
                lentą (navigacijoje „Leaderboards → Visų laikų“) – ten matosi aktyviausi
                ir taikliausi DuBPlyBET spėjikai.
              </p>

              <HowH4>TAŠKŲ SISTEMA (1 → 3 → 5)</HowH4>
              <ol>
                <li>
                  <strong>Nugalėtojo sąlyga – 1 taškas.</strong> Komanda X
                  <strong> &gt; 5</strong>, <strong>&lt; 5</strong> arba <strong>= 5</strong>.
                  Sistema parenka pagal jūsų rezultatą.
                </li>
                <li>
                  <strong>Taškų skirtumas – 3 taškai.</strong> Jei atspėjote nugalėtojo
                  sąlygą, tikrinamas tikslus taškų <strong>skirtumas</strong>.
                </li>
                <li>
                  <strong>Tikslus rezultatas – 5 taškai.</strong> Jei sutampa nugalėtojas,
                  skirtumas ir <strong>tikslus rezultatas</strong> – gaunate maksimalų taškų skaičių.
                </li>
              </ol>
              <SmallNote>Taškai nesumuojami: imamas aukščiausias atitiktas (1 → 3 → 5).</SmallNote>

              <HowH4>SĄLYGŲ APSKAIČIAVIMAS</HowH4>
              <p><strong>Nugalėtojo sąlyga (1 tšk.)</strong> – iš jūsų rezultato:</p>
              <ul>
                <li><strong>Komanda A &gt; 5</strong> – pvz., <strong>100–90</strong> (laimi &gt; 5).</li>
                <li><strong>Komanda A &lt; 5</strong> – pvz., <strong>100–96</strong> (laimi &lt; 5).</li>
                <li><strong>Komanda A = 5</strong> – pvz., <strong>100–95</strong> (laimi lygiai 5).</li>
              </ul>
              <p>
                <strong>Taškų skirtumas (3 tšk.)</strong> – jei nugalėtojo sąlyga teisinga ir taškų
                <strong> skirtumas</strong> tiksliai sutampa.
              </p>
              <p>
                <strong>Galutinis rezultatas (5 tšk.)</strong> – jei sutampa viskas, įskaitant
                <strong> tikslų rezultatą</strong>.
              </p>

              <HowH4>Trumpai</HowH4>
              <p>Užtenka pataikyti bent vieną – jau gaunate taškų; kuo tiksliau – tuo daugiau (1 → 3 → 5).</p>
            </HowBody>
          </HowInner>
        </HowCollapse>
      </HowCard>
        {isArchived && (
    <WinnerWrap>
      <WinnerGrid>
        <div>
          <WinnerKicker>TURNYRO NUGALĖTOJAS</WinnerKicker>
          <WinnerTeam>
            <FlagDot style={{ width: 34, height: 34 }}>{flagForTeam(tournament?.winner_team, 22)}</FlagDot>
            <span>{tournament?.winner_team || "—"}</span>
          </WinnerTeam>
        </div>

        <div>
          <WinnerKicker>DALYVIŲ NUGALĖTOJAS</WinnerKicker>
          {leaderboard?.[0] ? (
            <WinnerUser>
              <RowAvatar src={joinApi(leaderboard[0].avatarUrl)} data-fallback={leaderboard[0].username}>
                {initials(leaderboard[0].username)}
              </RowAvatar>
              <div>
                <NickButton
                  onClick={(e) =>
                    openUserCardById(
                      leaderboard[0].user_id,
                      leaderboard[0].username,
                      leaderboard[0].avatarUrl,
                      e
                    )
                  }
                  aria-label={`Atidaryti ${leaderboard[0].username} profilį`}
                >
                  <div className="name">{leaderboard[0].username}</div>
                </NickButton>
                <div className="pts">{leaderboard[0].points} taškų</div>
              </div>
            </WinnerUser>
          ) : (
            <span style={{ color:"#64748b", fontWeight:700 }}>—</span>
          )}
        </div>
      </WinnerGrid>
    </WinnerWrap>
  )}
  {isArchived && (
      <Section>
        <H3>TEISINGAI PASIRINKĘ TURNYRO NUGALĖTOJĄ</H3>
        <TableCard>
          {bonus.loading ? (
            <LBEmpty>Kraunama…</LBEmpty>
          ) : bonus.error ? (
            <LBEmpty>{bonus.error}</LBEmpty>
          ) : bonus.picks.length ? (
            <Table>
              <thead>
                <tr>
                  <th>Vartotojas</th>
                  <th>Pasirinkimas</th>
                  <th>Taškai (viso)</th>
                </tr>
              </thead>
              <tbody>
                {bonus.picks.map(u => (
                  <tr key={u.user_id}>
                    <td>
                      <UserCell>
                        <RowAvatar src={joinApi(u.avatarUrl)} data-fallback={u.username}>
                          {initials(u.username)}
                        </RowAvatar>

                        <NickButton
                          onClick={(e) => openUserCardById(u.user_id, u.username, u.avatarUrl, e)}
                          aria-label={`Atidaryti ${u.username} profilį`}
                        >
                          <UserName as="span">{u.username}</UserName>
                        </NickButton>
                      </UserCell>
                    </td>
                    <td><strong>{u.team}</strong></td>
                    <td><strong>{u.points}</strong></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <LBEmpty>Niekas nepasirinko teisingai.</LBEmpty>
          )}
        </TableCard>
      </Section>
    )}

    <LeaderboardWrap>
      <LBHeader>
        <LBTitle>TURNYRO LENTELĖ</LBTitle>
        <LBExpand
          onClick={() => {
            const next = !lbOpen;
            setLbOpen(next);
            if (next) loadLeaderboard();
          }}
          aria-expanded={lbOpen}
        >
          <FiChevronDown />
        </LBExpand>
      </LBHeader>

      <LBCollapse $open={lbOpen}>
        <LBCollapseInner $open={lbOpen}>
          {lbLoading ? (
            <LBEmpty>Kraunama…</LBEmpty>
          ) : leaderboard.length === 0 ? (
            <LBEmpty>Dar nėra reitingo.</LBEmpty>
          ) : (
            <>
              {/* Podium (Top 3) */}
              <Podium>
                {renderPodium(leaderboard.slice(0, 3), API_ORIGIN)}
              </Podium>
              {/* List from 4th */}
              <LBList>
                {leaderboard.slice(3).map((u, i) => (
                  <LBRow key={u.user_id}>
                    <RowLeft>
                      <RowAvatar src={joinApi(u.avatarUrl)} data-fallback={u.username}>
                        {initials(u.username)}
                      </RowAvatar>

                      <NickButton
                        onClick={(e) => openUserCardById(u.user_id, u.username, u.avatarUrl, e)}
                        aria-label={`Atidaryti ${u.username} profilį`}
                      >
                        <RowName as="span">{u.username}</RowName>
                      </NickButton>
                    </RowLeft>
                    <RowRight>{u.points}</RowRight>
                  </LBRow>
                ))}
              </LBList>
            </>
          )}
        </LBCollapseInner>
      </LBCollapse>
  </LeaderboardWrap>

      {/* === Day picker: show for archived, and for active when day is unset or today/future === */}
      {dayList.length > 0 && (
        <>
          <DayBarWrap>
            <DayArrow onClick={() => scrollByCard(-1)}>‹</DayArrow>
            <DayRail ref={dayRailRef}>
              {dayList.map(d => {
  const p = dayParts(d);
  const active = selectedDay === d;
  const hasUpcoming = daysWithUpcoming.has(d);
  return (
    <DayCard
      data-day-card="1"
      key={d}
      aria-pressed={active}
      $hasUpcoming={hasUpcoming}
      onClick={() => { setSelectedDay(d); }}
      title={`${p.dow} ${p.day} ${p.mon} ${p.year}`}
    >
      <div className="year">{p.year}</div>
      <div className="dow">{p.dow}</div>
      <div className="num">{p.day}</div>
      <div className="mon">{p.mon}</div>
    </DayCard>
  );
})}
            </DayRail>
            <DayArrow onClick={() => scrollByCard(1)}>›</DayArrow>
          </DayBarWrap>
          <DividerH />
        </>
      )}

      {/* Upcoming & Ongoing for ACTIVE tournaments only */}
      {!isArchived && (!selectedDay || isTodayOrFutureSelected) && (
  <>
    {/* Upcoming */}
    <Section>
      <H3>ARTĖJANTYS ŽAIDIMAI</H3>
      {upcoming.length ? upcoming.map(g => (
        <GameCard key={g.id} $clickable onClick={() => openGuess(g)}>
          <LeftCol>
            <CardTinyHeader>{phaseTiny(g.stage)}</CardTinyHeader>
            <Teams>
              <TeamRow>
                <FlagDot>{flagForTeam(g.team_a, 18)}</FlagDot>
                <span className="name">{g.team_a}</span>
              </TeamRow>
              <TeamRow>
                <FlagDot>{flagForTeam(g.team_b, 18)}</FlagDot>
                <span className="name">{g.team_b}</span>
              </TeamRow>
            </Teams>
          </LeftCol>
          <RightCol>
            <MetaBlock>
              <SmallMeta>{dOWMMMDD(g.tipoff_at).toUpperCase()}</SmallMeta>
            </MetaBlock>
            <DividerV />
            <TimeBadge>{t5(g.tipoff_at)}</TimeBadge>
          </RightCol>

          {/* My guess summary if exists */}
          {g.my_guess ? (
            <FullWidth>
              <MyGuessBox>
                <strong>TAVO SPĖJIMAS</strong>
                <GuessPair>
                  <FlagDot>{flagForTeam(g.team_a, 16)}</FlagDot>
                  <span className="name">{g.team_a}</span>
                  <span className="score">{g.my_guess.guess_a}</span>
                </GuessPair>
                <GuessPair>
                  <FlagDot>{flagForTeam(g.team_b, 16)}</FlagDot>
                  <span className="name">{g.team_b}</span>
                  <span className="score">{g.my_guess.guess_b}</span>
                </GuessPair>
              </MyGuessBox>
            </FullWidth>
          ) : null}

          <ExpandBtn
            onClick={(e) => { e.stopPropagation(); toggle(g.id); }}
            aria-expanded={expanded.has(g.id)}
          >
            <FiChevronDown />
          </ExpandBtn>
          <ExpandArea $open={expanded.has(g.id)} onClick={(e) => e.stopPropagation()}>
            <ExpandInner $open={expanded.has(g.id)}>
              {guesses[g.id] ? (
                <GuessesList
                  game={g}
                  guesses={guesses[g.id]}
                  fetch={() => fetchGuesses(g.id, "team")}
                  finished={false}
                  teamOrder
                  onUserClick={openUserCardById}
                />
              ) : null}
            </ExpandInner>
          </ExpandArea>
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
            <CardTinyHeader>{phaseTiny(g.stage)}</CardTinyHeader>
            <Teams>
              <TeamRow>
                <FlagDot>{flagForTeam(g.team_a, 18)}</FlagDot>
                <span className="name">{g.team_a}</span>
              </TeamRow>
              <TeamRow>
                <FlagDot>{flagForTeam(g.team_b, 18)}</FlagDot>
                <span className="name">{g.team_b}</span>
              </TeamRow>
            </Teams>
          </LeftCol>
          <RightCol>
            <MetaBlock>
              <SmallMeta>{dOWMMMDD(g.tipoff_at).toUpperCase()}</SmallMeta>
            </MetaBlock>
            <DividerV />
            <LockedBadge><FiLock style={{ verticalAlign: "middle" }} /> Vyksta </LockedBadge>
          </RightCol>

          <FullWidth>
            <MyGuessBox>
              <strong>TAVO SPĖJIMAS</strong>
              {g.my_guess ? (
                <>
                  <GuessPair>
                    <FlagDot>{flagForTeam(g.team_a, 16)}</FlagDot>
                    <span className="name">{g.team_a}</span>
                    <span className="score">{g.my_guess.guess_a}</span>
                  </GuessPair>
                  <GuessPair>
                    <FlagDot>{flagForTeam(g.team_b, 16)}</FlagDot>
                    <span className="name">{g.team_b}</span>
                    <span className="score">{g.my_guess.guess_b}</span>
                  </GuessPair>
                </>
              ) : (
                <span style={{ color:"#64748b" }}>ŠIO ŽAIDIMO REZULTATO NESPĖLIOJAI</span>
              )}
            </MyGuessBox>
          </FullWidth>

          <ExpandBtn onClick={() => toggle(g.id)} aria-expanded={expanded.has(g.id)}>
            <FiChevronDown />
          </ExpandBtn>
          <ExpandArea $open={expanded.has(g.id)}>
            <ExpandInner $open={expanded.has(g.id)}>
              {guesses[g.id] ? (
                <GuessesList
                  game={g}
                  guesses={guesses[g.id]}
                  fetch={() => fetchGuesses(g.id, "team")}
                  finished={false}
                  teamOrder
                  onUserClick={openUserCardById}
                />
              ) : null}
            </ExpandInner>
          </ExpandArea>
        </GameCard>
      )) : <Empty>Nėra vykstančių rungtynių.</Empty>}
    </Section>

    <DividerH />
  </>
)}
      <Section>
      <H3>PRAĖJĘ ŽAIDIMAI</H3>

       {finishedShown.length ? (
        finishedShown.map(g => (
          <GameCard key={g.id}>
            <LeftCol>
              <CardTinyHeader>{phaseTiny(g.stage)}</CardTinyHeader>
              <Teams>
                <TeamRow>
                  <FlagDot>{flagForTeam(g.team_a, 18)}</FlagDot>
                  <span className="name">{g.team_a}</span>
                  <span className="scoreFinal">{g.score_a}</span>
                </TeamRow>
                <TeamRow>
                  <FlagDot>{flagForTeam(g.team_b, 18)}</FlagDot>
                  <span className="name">{g.team_b}</span>
                  <span className="scoreFinal">{g.score_b}</span>
                </TeamRow>
              </Teams>
            </LeftCol>

            <RightCol>
  <RightMetaGrid>
    <MetaBlock>
      <SmallMeta>{dOWMMMDD(g.tipoff_at).toUpperCase()}</SmallMeta>
    </MetaBlock>
    <DividerV />

    {/* Top-right status */}
    <DoneBadge><FiCheck style={{ verticalAlign: "middle" }} /> Baigta</DoneBadge>
    <ResultCondInline className="cond">
      <CondText className="cond--desktop">
        {renderMarkdownInline(
          guessConditionPretty({
            team_a: g.team_a,
            team_b: g.team_b,
            a: g.score_a,
            b: g.score_b,
            finished: false,
          })
        )}
      </CondText>
      <CondTwoLine className="cond--mobile" aria-hidden="false">
        <span className="main">
          {(() => {
            const a = Number(g.score_a) || 0;
            const b = Number(g.score_b) || 0;
            const diff = Math.abs(a - b);
            if (a === b) return "Lygiosios";
            const band = bandFromDiff(diff); // "> 5", "< 5" or "= 5"
            return a > b ? `${g.team_a} ${band}` : `${g.team_b} ${band}`;
          })()}
        </span>
        <span className="diff">
          {(() => {
            const a = Number(g.score_a) || 0;
            const b = Number(g.score_b) || 0;
            const diff = Math.abs(a - b);
            return `[${diff} pt.]`;
          })()}
        </span>
        <span className="score">
          {(() => {
            const a = Number(g.score_a) || 0;
            const b = Number(g.score_b) || 0;
            return `(${a}-${b})`;
          })()}
        </span>
      </CondTwoLine>
    </ResultCondInline>
  </RightMetaGrid>
</RightCol>
            <FullWidth>
              <MyGuessBoxFinished>
                <div>
                  <strong>TAVO SPĖJIMAS</strong>
                  {g.my_guess ? (
                    <CondText>
                      {renderMarkdownInline(
                        cleanPointsTag(
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
                        )
                      )}
                    </CondText>
                  ) : (
                    <span style={{ color: "#64748b" }}>ŠIO ŽAIDIMO REZULTATO NESPĖLIOJAI</span>
                  )}
                </div>

                {g.my_guess && (
                  <PointsAside>
                    <PointsHeader>TAŠKAI</PointsHeader>
                    <PointsValue>
                      <strong>
                        {g.my_guess.awarded_points ?? 0}{" "}
                        {pointsWordLT(g.my_guess.awarded_points ?? 0)}
                      </strong>
                    </PointsValue>
                  </PointsAside>
                )}
              </MyGuessBoxFinished>
            </FullWidth>

            <ExpandBtn onClick={() => toggle(g.id)} aria-expanded={expanded.has(g.id)}>
              <FiChevronDown />
            </ExpandBtn>

            <ExpandArea $open={expanded.has(g.id)}>
              <ExpandInner $open={expanded.has(g.id)}>
                {guesses[g.id] ? (
                  <GuessesList
                    game={g}
                    guesses={guesses[g.id]}
                    fetch={() => fetchGuesses(g.id, "points")}
                    finished
                    onUserClick={openUserCardById}
                  />
                ) : null}
              </ExpandInner>
            </ExpandArea>
          </GameCard>
        ))
      ) : (
        <Empty>{selectedDay ? "Šią dieną rungtynių nėra." : (isArchived ? "Šią dieną rungtynių nėra." : "Nėra praėjusių rungtynių.")}</Empty>
      )}

      {/* Pager only for non-archived */}
      {!isArchived && (!selectedDay || isTodayOrFutureSelected) && (
        <Pager>
          <button disabled={finPage <= 1} onClick={() => setFinPage(p => p - 1)}>Ankstesnis</button>
          <span>{finPage}</span>
          <button
            disabled={(finished || []).length < PAGE_SIZE}
            onClick={() => setFinPage(p => p + 1)}
          >
            Kitas
          </button>
        </Pager>
      )}
    </Section>

      {/* Guess modal */}
      {modal.open && (
  <ModalShell onClose={closeModal}>
    <ModalHeader>
      <h3>{modal?.game?.my_guess ? "SPĖJIMO KOREGAVIMAS" : "REZULTATO SPĖJIMAS"}</h3>
      <CloseX onClick={closeModal}>×</CloseX>
    </ModalHeader>

    <ModalGrid>
      <Side>
        <BigFlag>{flagForTeam(modal.game.team_a, 56)}</BigFlag>
        <ModalTeamName>{modal.game.team_a}</ModalTeamName>
        <BigScoreInput
          inputMode="numeric"
          placeholder="0"
          value={modal.a}
          onChange={e => setModal(m => ({ ...m, a: e.target.value.replace(/\D/g, "") }))}
        />
      </Side>

      <MidCol>
        <PhaseTiny>{phaseTiny(modal.game.stage)}</PhaseTiny>
        <TipoffDate>{dOWMMMDD(modal.game.tipoff_at)}</TipoffDate>
        <TipoffTime>{t5(modal.game.tipoff_at)}</TipoffTime>
        <PreviewLineCenter>{modalPreview}</PreviewLineCenter>
      </MidCol>

      <Side>
        <BigFlag>{flagForTeam(modal.game.team_b, 56)}</BigFlag>
        <ModalTeamName>{modal.game.team_b}</ModalTeamName>
        <BigScoreInput
          inputMode="numeric"
          placeholder="0"
          value={modal.b}
          onChange={e => setModal(m => ({ ...m, b: e.target.value.replace(/\D/g, "") }))}
        />
      </Side>
    </ModalGrid>

    {!!modal.err && <InlineErr>{modal.err}</InlineErr>}

    <Primary onClick={submitGuess} disabled={modal.saving}>
      {modal?.game?.my_guess ? "KEISTI SPĖJIMĄ" : "SPĖTI"}
    </Primary>
  </ModalShell>
)}

        {/* Winner pick modal (shown once per tournament until user picks) */}
      {pickModal.open && (
      // Block closing via backdrop click:
      <ModalShell onClose={() => { /* force choose winner */ }}>
        <ModalHeader>
          <h3>PASIRINKITE TURNYRO NUGALĖTOJĄ</h3>
        </ModalHeader>

          <div style={{ display: "grid", gap: 10 }}>
            <label style={{ fontWeight: 800, fontSize: 12, letterSpacing: ".08em", opacity: .9 }}>
              KOMANDA
            </label>

            <input
              type="text"
              placeholder="Ieškoti..."
              value={pickModal.search || ""}
              onChange={(e) => {
                const s = e.target.value;
                setPickModal(p => ({ ...p, search: s }));
              }}
              style={{
                border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 10px",
                fontWeight: 600
              }}
            />

            <div
              style={{
                maxHeight: 260, overflow: "auto", border: "1px solid #e5e7eb",
                borderRadius: 10, padding: 6, background: "#fff"
              }}
              role="listbox"
            >
              {(allTeams.length ? allTeams : [pickModal.team || ""]).filter(name => {
                if (!pickModal.search) return true;
                const q = pickModal.search.toLowerCase();
                return String(name).toLowerCase().includes(q);
              }).map((name) => (
                <button
                  type="button"
                  key={name}
                  onClick={() => setPickModal(p => ({ ...p, team: name }))}
                  aria-selected={pickModal.team === name}
                  style={{
                    width: "100%", textAlign: "left", display: "grid",
                    gridTemplateColumns: "24px 1fr auto", alignItems: "center",
                    gap: 10, padding: "8px 10px", borderRadius: 8, cursor: "pointer",
                    background: pickModal.team === name ? "#eef5ff" : "#fff",
                    border: "1px solid transparent"
                  }}
                >
                  <span style={{
                    width: 22, height: 22, borderRadius: "50%", display: "grid",
                    placeItems: "center", background: "#f3f4f6"
                  }}>
                    {flagForTeam(name, 18)}
                  </span>
                  <span style={{ fontWeight: 800 }}>{name}</span>
                  {pickModal.team === name ? <FiCheck /> : null}
                </button>
              ))}
            </div>

            {!!pickModal.error && (
              <InlineErr>{pickModal.error}</InlineErr>
            )}

            <Primary onClick={submitWinnerPick} disabled={pickModal.saving || !pickModal.team}>
              IŠSAUGOTI PASIRINKIMĄ
            </Primary>

            <div style={{ fontSize: 12, color: "#64748b" }}>
              * Pasirinkimas vienkartinis ir negalės būti keičiamas vėliau.
            </div>
          </div>
        </ModalShell>
      )}
      <UserCardPopover
        open={ucpOpen}
        anchorEl={ucpAnchor}
        onClose={closeUcp}
        user={ucpUser}
        loading={ucpLoading}
        error={ucpError}
        apiOrigin={API_ORIGIN}
        containerEl={pageRef.current}
        variant="default"
      />
    </Wrap>
  );
}

/* ===== Guesses sub-list ===== */
function GuessesList({ game, guesses, fetch, finished, teamOrder, onUserClick }) {
  useEffect(()=>{ fetch(); }, []); // initial load
  const items = guesses?.items || [];
  if (guesses?.loading) return <Loading>Kraunama…</Loading>;
  if (!items.length) return <Muted>Spėjimų nėra</Muted>;
  const initials = (name = "") => name.split(" ").filter(Boolean).map(s => s[0]).slice(0,2).join("").toUpperCase() || "U";
  const RowAvatar = ({ src, children, ...rest }) => {
    const has = !!src && src !== "null" && src !== "undefined";
    return (
      <AvatarWrap $img={has ? src : null} {...rest}>
        {!has ? <span>{children}</span> : null}
      </AvatarWrap>
    );
  };

  // remove " [5p]" (or any "[Xp]") fragments the formatter appends
    const cleanPointsTag = (s) => String(s).replace(/\s*\[\d+p\]/g, "");

    // LT points word: 1 taškas, 2-9 taškai (except 11-19), 0/5-... taškų
    const pointsWordLT = (n) => {
    const abs = Math.abs(n ?? 0);
    const mod10 = abs % 10, mod100 = abs % 100;
    if (mod10 === 1 && mod100 !== 11) return "Taškas";
    if (mod10 >= 2 && mod10 <= 9 && !(mod100 >= 12 && mod100 <= 19)) return "Taškai";
    return "taškų";
    };

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
  function renderMarkdownInline(input) {
  const esc = String(input ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const html = esc.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

  return (
    <>
    <SubTitle>KITŲ ŽMONIŲ SPĖJIMAI</SubTitle>
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
            <td>
            <UserCell>
              <RowAvatar src={joinApi(gu.avatarUrl)} data-fallback={gu.username}>
                {initials(gu.username)}
              </RowAvatar>
              <NickButton
                onClick={(e) => onUserClick?.(gu.user_id, gu.username, gu.avatarUrl, e)}
                aria-label={`Atidaryti ${gu.username} profilį`}
              >
                <UserName as="span">{gu.username}</UserName>
              </NickButton>
            </UserCell>
          </td>
            <td>
            <CondRow>
              <CondText>
                {renderMarkdownInline(
                  cleanPointsTag(
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
                  )
                )}
              </CondText>

              {/* Flame if ALL conditions are met */}
              {finished && gu?.cond_ok && gu?.diff_ok && gu?.exact_ok ? (
                <Flame title="Atspėjo galutinį rezultata!">
                  <FaFire />
                </Flame>
              ) : null}
            </CondRow>
          </td>
            {finished && (
            <td style={{ whiteSpace: "nowrap" }}>
                <strong>
                    {gu.awarded_points ?? 0}{" "}
                    {pointsWordLT(gu.awarded_points ?? 0)}
                </strong>
            </td>
            )}
          </tr>
        ))}
      </tbody>
    </GuessTable>
    </>
  );
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

const fadeInBackdrop = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const popIn = keyframes`
  0%   { opacity: 0; transform: scale(.96) translateY(6px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
`;

const GameCard = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  border: 1px solid #e7eaf0;
  background: #fff;
  border-radius: 10px;
  padding: 10px 12px;
  position: relative;
  margin-right: 56px;
  overflow: visible;
  transition: transform .18s ease, border-color .15s ease, box-shadow .15s ease, background .15s ease;
  @media (max-width: 474px){
    margin-right: 44px;        /* matches ExpandBtn width */
    padding: 8px 10px;
    gap: 8px;
  }

  ${({ $clickable }) =>
    $clickable &&
    `
    cursor: pointer;

    /* Disable hover/active when over expand button OR expanded guesses area */
    &:hover:not(:has(${ExpandBtn}:hover)):not(:has(${ExpandArea}:hover)) {
      transform: translateY(-3px) scale(1.02);
      background: #f9fbff;
      border-color: #c9d6ec;
      box-shadow: 0 8px 24px rgba(2,6,23,.12);
    }

    &:active:not(:has(${ExpandBtn}:active)):not(:has(${ExpandArea}:active)) {
      transform: translateY(-1px) scale(0.99);
    }
  `}
`;
const LeftCol = styled.div`display:grid; gap:6px; min-width:0;`;
const RightCol = styled.div`
  display: grid;
  grid-auto-flow: column;
  align-items: center;
  gap: 12px;
  justify-content: end;
  min-width: 0;

  @media (max-width: 474px){
    grid-auto-flow: row;
    justify-items: end;
    gap: 6px;
  }
`;
const CardTinyHeader = styled.div`
  font-size: 11px;
  letter-spacing: .12em;
  color: #6b7280;
  font-weight: 800;
  text-transform: uppercase;
`;
const PhasePill = styled.div`display:inline-flex; align-items:center; gap:8px; font-weight:800; font-size:12px; background:#f3f6fc; padding:4px 8px; border-radius:999px;`;
const Teams = styled.div`display:grid; gap:6px;`;
const TeamRow = styled.div`
  display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:8px;
  .name{
    font-weight:800;
    min-width:0;
    text-overflow:ellipsis;
    white-space:nowrap;
    @media (max-width: 474px){
     white-space: normal;
     text-overflow: unset;
     word-break: break-word;
     overflow: visible;
   }
  }
  .scoreFinal{font-weight:900; font-size: 14px;}
`;
const FlagDot = styled.span`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #f3f4f6;
  display: grid;
  place-items: center;

  // children (SVG or emoji) centered
  & > * { display: inline-block; }
`;

// right meta block (venue/date lines)
const MetaBlock = styled.div`
  display: grid;
  justify-items: end;
  gap: 2px;
  min-width: 120px;
  @media (max-width: 474px){
    min-width: 0;
  }
`;

const SmallMeta = styled.div`
  font-size: 11px;
  color: #94a3b8;
  font-weight: 700;
  @media (max-width: 474px){
    font-size: 10px;
  }
`;

const DividerV = styled.span`
  width: 1px;
  height: 28px;
  background: #e5e7eb;
  display: inline-block;

  @media (max-width: 474px){
    display: none;         /* remove the vertical divider when stacked */
  }
`;

const TimeBadge = styled.div`
  background: #0b1324;
  color: #fff;
  font-weight: 800;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 13px;
  line-height: 1;

  @media (max-width: 474px){
    padding: 5px 8px;
    font-size: 12px;
  }
`;

// ensure blocks below the two-column header span full width
const FullWidth = styled.div`
  grid-column: 1 / -1;
`;

// Keep MyGuessBox but tighten
const MyGuessBox = styled.div`
  width: 100%;
  border: 1px solid #e5e7eb;
  border-top: 0;                 /* seamless joint to the card */
  background: #f9fafb;

  /* only bottom corners rounded; the card's bottom corners are flat */
  border-radius: 0 0 10px 10px;

  padding: 8px 10px;
  display: grid;
  gap: 6px;

  /* ensure it spans below the whole card row */
  grid-column: 1 / -1;

  strong { font-size: 11px; letter-spacing: .08em; }
`;

const GuessPair = styled.div`
  display: grid;
  grid-template-columns: 22px 1fr auto;
  gap: 8px;
  align-items: center;
  .score { font-weight: 900; }
`;
const When = styled.div`display:inline-flex; align-items:center; gap:10px; font-weight:800;`;
const ExpandBtn = styled.button`
  position: absolute;
  top: -1px;               /* align borders perfectly */
  right: -44px;            /* sit outside the card, attached */
  height: calc(100% + 2px);/* cover the card's full height */
  width: 44px;

  display: grid;
  place-items: center;
  cursor: pointer;

  background: #fff;
  color: #0f172a;
  border: 1px solid #e5e7eb;
  border-left: 0;          /* seamless connection to the card */

  /* rounded only on the outer-right side */
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;

  /* subtle hover */
  transition: background .15s ease;
  &:hover { background: #f9fafb; }
  svg { transition: transform .25s ease; }
  &[aria-expanded="true"] svg { transform: rotate(180deg); }
`;
// replaces your current ExpandArea
const ExpandArea = styled.div`
  grid-column: 1 / -1;
  display: grid;
  grid-template-rows: ${p => (p.$open ? "1fr" : "0fr")};
  transition: grid-template-rows .34s cubic-bezier(.22,.61,.36,1); /* smooth */
  will-change: grid-template-rows;
  cursor: default;
`;

// inner wrapper handles fade/slide + padding without affecting layout calc
const ExpandInner = styled.div`
  overflow: hidden;                 /* hide while collapsed */
  border-top: 1px dashed #e5e7eb;

  opacity: ${p => (p.$open ? 1 : 0)};
  transform: translateY(${p => (p.$open ? "0" : "-4px")});
  padding-top: ${p => (p.$open ? "10px" : "0")};

  transition:
    opacity .22s ease,
    transform .28s ease,
    padding-top .22s ease;
  will-change: opacity, transform;
`;
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
  th,td{ padding:6px 6px; border-bottom:1px solid #eef2f7; vertical-align:middle; }
  th{ text-align:left; font-weight:800; color:#111827; background:#f9fafb; }
`;
const Loading = styled.div`color:#64748b;`;
const Muted = styled.div`color:#64748b;`;
const Empty = styled.div`color:#64748b; font-weight:600;`;
const Pager = styled.div`display:flex; gap:10px; align-items:center; justify-content:center; margin-top:8px; 
  button{border:1px solid #e5e7eb; background:#fff; border-radius:8px; padding:6px 10px; cursor:pointer;}
`;

const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  display: grid;
  place-items: center;
  z-index: 1000;
  opacity: ${p => (p.$show ? 1 : 0)};
  transition: opacity 180ms ease-out;
  will-change: opacity;
  padding: 3vw;
`;
const ModalHeader = styled.div`display:flex; align-items:center; justify-content:space-between; h3{margin:0; font-size:16px; font-weight:900;}`;
const CloseX = styled.button`border:0; background:transparent; font-size:22px; color:#64748b; cursor:pointer; &:hover{color:#0f172a}`;
const Primary = styled.button`
  border: 0;
  border-radius: 10px;
  padding: 10px 14px;
  cursor: pointer;
  font-weight: 900;
  background: #1f6feb;
  color: #fff;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  width: auto;
  justify-self: center;

  transition: transform .18s ease, border-color .15s ease, box-shadow .15s ease, background .15s ease;

  
    &:hover {
      transform: translateY(-3px) scale(1.02);
      box-shadow: 0 8px 24px rgba(2,6,23,.12);
    }

    &:active {
      transform: translateY(-1px) scale(0.99);
    }
`;

const SubTitle = styled.div`
  font-size: 12px;
  letter-spacing: .12em;
  font-weight: 800;
  color: #0f172a;
  opacity: .7;
  text-transform: uppercase;
  margin-bottom: 6px;
`;

const LockedBadge = styled(TimeBadge)`
  background: #ce5b5bff; /* green */
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

const DoneBadge = styled(TimeBadge)`
  background: #16a34a; /* green */
  display: inline-flex;
  align-items: center;
  gap: 6px;
`;

// Stronger emphasis + green for met conditions returned as **...**
const CondText = styled.div`
  white-space: pre-wrap;
  font-size: 14px;
  strong {
    font-weight: 900;
  }
`;

// Finished "TAVO SPĖJIMAS" box with right-side points
const MyGuessBoxFinished = styled(MyGuessBox)`
  grid-template-columns: 1fr auto;
  align-items: start;

  & > div > strong {

   display: block;        /* force on its own line */
   margin-bottom: 6px;    /* spacing from the line below */
  }
`;

const PointsAside = styled.div`
  padding-left: 12px;
  margin-left: 12px;
  border-left: 1px dashed #e5e7eb;
  display: grid;
  gap: 6px;
  align-content: start;
`;

const PointsHeader = styled.div`
  font-size: 11px;
  letter-spacing: .08em;
  font-weight: 800;
  color: #0f172a;
  opacity: .8;
  text-transform: uppercase;
`;

const PointsValue = styled.div`
  font-size: 14px;
  display: inline-flex;
  gap: 6px;
  align-items: baseline;
`;

const CondRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const Flame = styled.span`
  display: inline-flex;
  align-items: center;
  line-height: 1;
  color: #ef4444;
`;


/* Modal sizing tweaks */
const ModalCard = styled.div`
  /* Fit within the Backdrop's padding so both sides have equal gap */
  width: min(100%, 720px);
  box-sizing: border-box;

  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: clamp(12px, 3vw, 22px);
  box-shadow: 0 16px 40px rgba(2, 6, 23, 0.2);
  display: grid;
  gap: clamp(10px, 2.5vw, 18px);

  opacity: ${p => (p.$show ? 1 : 0)};
  transform: ${p => (p.$show ? "scale(1) translateY(0)" : "scale(.985) translateY(6px)")};
  transition: opacity 220ms cubic-bezier(.22,.61,.36,1),
              transform 220ms cubic-bezier(.22,.61,.36,1);
  will-change: opacity, transform;

  max-height: 92vh;
  overflow: auto;
`;

const ModalGrid = styled.div`
  display: grid;
  /* keep the SAME 3-column layout at all widths */
  grid-template-columns: minmax(0,1fr) auto minmax(0,1fr);
  align-items: start;
  gap: clamp(12px, 3.5vw, 28px);
`;

const Side = styled.div`
  display: grid;
  gap: clamp(8px, 2.5vw, 14px);
  align-items: center;
  justify-items: center;
`;

const BigFlag = styled.span`
  display: inline-grid;
  place-items: center;
  line-height: 1;
  max-width: 100%;
`;

const ModalTeamName = styled.div`
  font-weight: 600;
  font-size: clamp(14px, 2.4vw, 18px);
  text-align: center;
  color: #0f172a;
`;

const BigScoreInput = styled.input`
  width: clamp(64px, 18vw, 110px);
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: clamp(8px, 1.8vw, 10px) clamp(10px, 2vw, 12px);
  text-align: center;
  font-weight: 800;
  font-size: clamp(16px, 3.5vw, 18px);
  &:focus {
    outline: none;
    border-color: #99b9ff;
    box-shadow: 0 0 0 4px rgba(31,111,235,.12);
  }
`;

/* Center column */
const MidCol = styled.div`
  display: grid;
  gap: 8px;
  align-content: start;
  justify-items: center;
  min-width: 0;                   /* allow center column to shrink */
  margin-top: clamp(0px, 2vw, 15px);
`;

const PhaseTiny = styled.div`
  font-size: clamp(10px, 2vw, 11px);
  letter-spacing: .12em;
  color: #6b7280;
  font-weight: 800;
  text-transform: uppercase;
  text-align: center;
`;

const TipoffDate = styled.div`
  font-size: clamp(11px, 2.2vw, 12px);
  color: #94a3b8;
  font-weight: 800;
  letter-spacing: .04em;
  text-align: center;
`;

const TipoffTime = styled.div`
  font-size: clamp(20px, 6vw, 28px);
  font-weight: 900;
  line-height: 1.1;
  color: #0f172a;
  text-align: center;
`;

const PreviewLineCenter = styled.div`
  margin-top: 6px;
  font-weight: 700;
  text-align: center;
  color: #0f172a;
  font-size: clamp(12px, 2.2vw, 14px);

  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  max-width: 100%;
`;

const HeaderCard = styled.div`
  position: relative; width: 100%; min-height: 220px; border-radius: 18px;
  overflow: hidden; background: #000; box-shadow: 0 8px 24px rgba(2,6,23,.12);
  cursor: default; pointer-events: none;
`;

const ImageLayer = styled.div`
  position: absolute; inset: 0;
  background: ${p => p.$bg || FALLBACK_IMG}; background-size: cover; background-position: center;
`;

const Overlay = styled.div`
  position: absolute; inset: 0; background: rgba(255,255,255,0.18); z-index: 1;
`;

const CardContent = styled.div`
  position: absolute; inset: 0; z-index: 2;
  padding: 12px; text-align: center; color: #fff;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const CardTitle = styled.div`
  font-size: clamp(35px, 2.3vw, 42px); font-weight: 900; letter-spacing: -0.01em;
  text-shadow: 0 2px 6px rgba(0,0,0,0.6);
`;

const CardDates = styled.div`
  font-weight: 700; text-shadow: 0 2px 8px rgba(0,0,0,0.7); font-size: clamp(16px, 2.3vw, 20px);
`;

const CardInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

/* ===== Leaderboard styles ===== */
const LeaderboardWrap = styled.section`
  border: 1px solid #e7eaf0;
  border-radius: 14px;
  overflow: hidden;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(2,6,23,.06);
  color: #0f172a;
`;
const LBHeader = styled.div`
  position: relative;
  display: grid;
  align-items: center;
  padding: 12px 14px;
  background: #ffffff;
  border-bottom: 1px solid #e7eaf0;
`;
const LBTitle = styled.h3`
  margin: 0;
  font-size: 13px;
  letter-spacing: .14em;
  font-weight: 900;
  color: #0f172a;
  opacity: .9;
`;
const LBExpand = styled.button`
  position: absolute; top:0; right:0; bottom:0; width:44px;
  border:0; background:#ffffff; color:#0f172a; cursor:pointer;
  display:grid; place-items:center; border-left:1px solid #e7eaf0;
  svg{ transition: transform .25s ease; }
  &[aria-expanded="true"] svg { transform: rotate(180deg); }
`;
const LBCollapse = styled.div`
  display:grid;
  grid-template-rows: ${p => (p.$open ? "1fr" : "0fr")};
  transition: grid-template-rows .34s cubic-bezier(.22,.61,.36,1);
`;
const LBCollapseInner = styled.div`
  overflow:hidden;
  opacity:${p => (p.$open ? 1 : 0)};
  transform: translateY(${p => (p.$open ? "0" : "-4px")});
  transition: opacity .22s ease, transform .28s ease;
  padding: ${p => (p.$open ? "14px" : "0 14px")};
  background: #f0f0f0ff;
`;
const LBEmpty = styled.div` color:#64748b; padding:16px 6px; text-align:center; `;

/* Podium */
const Podium = styled.div`
  display: grid;
  grid-template-columns: 1fr 1.2fr 1fr;
  align-items: end;
  gap: 18px;
  padding: 10px 6px 18px;
`;

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

/* STEP is now a positioned container with content inside it */
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
`;

const PodiumPoints = styled.div`
  font-weight: 900;
  font-size: 16px;
  color: ${p => (p.$highlight ? "#f59e0b" : "#16a34a")};
`;


/* List 4+ */
const LBList = styled.div`
  margin-top: 10px;
  background:#ffffff;
  border:1px solid #e7eaf0;
  border-radius:12px;
  overflow:hidden;
`;
const LBRow = styled.div`
  display:grid; grid-template-columns: 1fr auto; align-items:center;
  gap:8px; padding:12px;
  border-bottom:1px solid #e7eaf0;
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
const RowName = styled.div` font-weight:800; color:#0f172a; `;
const RowRight = styled.div` font-weight:900; color:#16a34a; `;

// reuse from leaderboard or define here if not exported
const UserCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const RowAvatar = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f3f4f6;
  background-image: ${p => (p.$img ? `url(${p.$img})` : "none")};
  background-size: cover;
  background-position: center;
  display: grid;
  place-items: center;
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  flex-shrink: 0;
`;

const UserName = styled.span`
  font-weight: 600;
  color: #0f172a;
`;

const WinnerWrap = styled.section`
  border: 1px solid #e7eaf0; border-radius: 14px; background: #fff;
  padding: 14px; box-shadow: 0 8px 24px rgba(2,6,23,.06);
`;
const WinnerGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
  @media (max-width: 560px){ grid-template-columns: 1fr; }
`;
const WinnerKicker = styled.div`
  font-size: 12px; letter-spacing: .12em; font-weight: 900; opacity: .8; margin-bottom: 6px;
`;
const WinnerTeam = styled.div`
  display: inline-grid; grid-auto-flow: column; align-items: center; gap: 10px;
  font-weight: 900; font-size: 18px; color: #0f172a;
`;
const WinnerUser = styled.div`
  display: grid; grid-template-columns: 34px 1fr; gap: 10px; align-items: center;
  .name{ font-weight: 900; color:#0f172a }
  .pts{ color:#16a34a; font-weight: 900; }
`;

const DayBarWrap = styled.div`
  position: relative;
  border: 1px solid #e7eaf0; border-radius: 14px; background: #fff;
  padding: 12px 44px;  /* space for arrows */
  overflow: hidden;
`;
const DayRail = styled.div`
  display: grid;
  grid-auto-flow: column;
  gap: 10px;
  overflow-x: auto;
  scroll-behavior: smooth;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 44px;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar{ display:none }
`;
const DayCard = styled.button`
  border: 0;
  cursor: pointer;
  user-select: none;

  /* a bit wider-than-tall to reduce height */
  width: clamp(86px, 9.5vw, 130px);
  aspect-ratio: 7 / 7;

  border-radius: 12px;
  background: #f1f3f6;
  color: #0f172a;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  align-content: start;
  padding: 8px 9px;
  text-align: center;
  box-shadow: inset 0 0 0 1px #e5e7eb;

  /* smaller typography */
  .year { font-size: 10px; font-weight: 800; opacity: .7; }
  .dow  { font-size: 11px; font-weight: 900; opacity: .9; letter-spacing: .02em; }
  .num  { font-size: 24px; font-weight: 900; line-height: 1.05; }
  .mon  { font-size: 11px; font-weight: 900; opacity: .85; letter-spacing: .04em; }

  /* animation */
  transition: transform .18s ease, box-shadow .18s ease, background .18s ease;

  scroll-snap-align: center;
  scroll-snap-stop: always;

  &:hover {
    transform: translateY(-2px) scale(1.02);
    background: #eef2f7;
    box-shadow: 0 6px 16px rgba(2,6,23,.10);
  }
  &:active {
    transform: translateY(0) scale(.98);
  }

  &[aria-pressed="true"]{
    background: #0f172a;
    color: #fff;
    box-shadow: 0 8px 18px rgba(2,6,23,.14);
  }
  ${p => p.$hasUpcoming && `
      background: #ecfdf5;                 /* light green backlight */
      box-shadow: inset 0 0 0 1px #86efac; /* subtle green border */
    `}

    &[aria-pressed="true"]{
      background: #0f172a;
      color: #fff;
      box-shadow: 0 8px 18px rgba(2,6,23,.14);

      /* Optional: keep a tiny green indicator even when selected */
      ${p => p.$hasUpcoming && `
        background-image: linear-gradient(to top, rgba(16,185,129,.6) 3px, transparent 3px);
        background-repeat: no-repeat;
        background-size: 100% 100%;
      `}
    }
`;
const DayArrow = styled.button`
  position: absolute; top: 0; bottom: 0; width: 36px;
  display: grid; place-items: center; border: 0; cursor: pointer;
  background: transparent; color: #0f172a; opacity: .7;
  &:hover { opacity: 1 }
  &:first-of-type { left: 6px; }
  &:last-of-type  { right: 6px; }
`;

const TableCard = styled.div`
  border: 1px solid #e7eaf0;
  border-radius: 12px;
  background: #fff;
  overflow: hidden;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  th, td { padding: 10px 12px; border-bottom: 1px solid #eef2f7; vertical-align: middle; }
  th { text-align: left; font-weight: 800; color: #111827; background: #f9fafb; }
`;

const NickButton = styled.button`
  background: none;
  border: 0;
  padding: 0;
  margin: 0;
  font: inherit;
  color: inherit;
  font-weight: inherit;
  cursor: pointer;
  text-align: left;
  outline: none;
  &:hover { text-decoration: underline; }
`;
const HowCard = styled.section`
  border: 1px solid #e7eaf0;
  border-radius: 14px;
  background: #ffffff;
  overflow: hidden;
`;

const HowHeader = styled.button`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;

  padding: 12px 14px;
  border: 0;
  background: #ffffff;
  border-bottom: 1px solid #e7eaf0;
  cursor: pointer;

  .lh {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    letter-spacing: .12em;
    font-weight: 900;
    color: #0f172a;
    text-transform: uppercase;
  }

  &:hover { background: #f9fafb; }
`;

const HowCaret = styled.span`
  display: grid;
  place-items: center;
  transition: transform .25s ease;
  svg { transform: rotate(${p => (p.$open ? "180deg" : "0deg")}); transition: transform .25s ease; }
`;

const HowCollapse = styled.div`
  display: grid;
  grid-template-rows: ${p => (p.$open ? "1fr" : "0fr")};
  transition: grid-template-rows .34s cubic-bezier(.22,.61,.36,1);
`;

const HowInner = styled.div`
  overflow: hidden;
  opacity: ${p => (p.$open ? 1 : 0)};
  transform: translateY(${p => (p.$open ? "0" : "-4px")});
  transition: opacity .22s ease, transform .28s ease;
  padding: ${p => (p.$open ? "14px" : "0 14px")};
  background: #ffffff;
`;

const HowBody = styled.div`
  display: grid;
  gap: 10px;
  color: #0f172a;
  font-size: 14px;

  p { margin: 0; }
  ul, ol { margin: 0; padding-left: 18px; }
  li { margin: 4px 0; }
`;

const HowH4 = styled.h4`
  margin: 6px 0 0;
  font-size: 12px;
  letter-spacing: .12em;
  font-weight: 900;
  color: #0f172a;
  text-transform: uppercase;
`;

const SmallNote = styled.div`
  font-size: 12px;
  color: #64748b;
  font-weight: 600;
`;
// Grid inside the existing RightCol:
// first row: [date] | | [BAIGTA]
// second row: condition spans across all three
const RightMetaGrid = styled.div`
  display: grid;
  grid-template-columns: auto 1px auto;
  align-items: center;
  column-gap: 12px;
  justify-items: end;

  /* the condition sits below, spanning all cols */
  .cond { grid-column: 1 / -1; margin-top: 6px; }

  @media (max-width: 474px){
    margin-left: 8px;
    grid-template-columns: auto;
    /* stack: date, BAIGTA, then condition */
    & > ${DividerV} { display: none; }
    .cond { grid-column: 1; }
  }

  /* keep divider height tidy in this context */
  & > ${DividerV} { height: 28px; }
`;

// Compact, right-aligned condition pill
// Ultra-min text-only condition line
// Ultra-min text, but unbreakable names won't blow the card
const ResultCondInline = styled.div`
  display: block;
  min-width: 0;
  max-width: 100%;
  padding-top: 6px;
  text-align: right;
  overflow-wrap: anywhere;
  word-break: break-word;
  hyphens: auto;

  ${CondText}{
    font-size: 12.5px;
    line-height: 1.25;
    
    font-variant-numeric: tabular-nums;
    letter-spacing: .01em;
    /* keep emphasis subtle */
    strong { font-weight: 800; }
  }
    @media (max-width: 474px){
    margin-bottom: 5px;
    text-align: right;
    ${CondText}.cond--desktop { display: none; }
  }
`;
const CondTwoLine = styled.div`
  display: none;
  @media (max-width: 474px){
    display: grid;
    grid-template-rows: auto auto auto;
    justify-items: end;
    text-align: right;
    gap: 2px;
    font-size: clamp(10px, 3.5vw, 12.5px);
    line-height: 1.25;
    font-variant-numeric: tabular-nums;

    .main{
      /* allow long team names to wrap nicely */
      overflow-wrap: anywhere;
      word-break: break-word;
    }
  }
`;