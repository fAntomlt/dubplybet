// client/pages/Profile.jsx
import { useEffect, useMemo, useState, useRef} from "react";
import styled, { keyframes } from "styled-components";
import { FiUser, FiHash, FiLock, FiEdit3, FiX, FiCheck, FiUpload, FiChevronDown } from "react-icons/fi";
import logoImg from "../assets/icriblogo.png";
import { useToast } from "../components/ToastProvider";
import { setAuth, getAuth } from "../store/auth";
import { flagForTeam } from "../lib/flags";
import { subroleFor } from "../lib/subroles";
import BadgePill from "../components/BadgePill.jsx";

// small helper
function roleLT(role) {
  return role === "admin" ? "Administratorius" : "Narys";
}

export default function Profile() {
  const toast = useToast();
  const API = import.meta.env.VITE_API_URL;

  const token = useMemo(() => localStorage.getItem("authToken") || "", []);
  const authHeader = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState("");

  const [me, setMe] = useState(null); // { id,email,username,discordUsername,role,avatarUrl? }
  const [edit, setEdit] = useState({ field: null }); // 'username' | 'discord' | 'password' | null

  // Discord: 2–32 chars, only a–z 0–9 _ . , no consecutive ".."
  const DISCORD_RE = /^(?!.*\.\.)[a-z0-9._]{2,32}$/;

  // controlled values for edits
  const [username, setUsername] = useState("");
  const [discord, setDiscord] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");

  // === Delete account modal state ===
// -- delete account state --
const [delPwd, setDelPwd] = useState("");
const [delBusy, setDelBusy] = useState(false);
const [delErr, setDelErr] = useState("");
const [delDone, setDelDone] = useState(false);
const [delOpen, setDelOpen] = useState(false);

async function requestAccountDeletion() {
  setDelErr("");
  if (!delPwd || delPwd.length < 8) {
    setDelErr("Įveskite slaptažodį (min. 8 simboliai).");
    return;
  }
  try {
    setDelBusy(true);
    const res = await fetch(`${API}/api/users/me/delete-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeader },
      body: JSON.stringify({ password: delPwd }),
    });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      setDelErr(data?.error || "Nepavyko inicijuoti ištrynimo.");
      return;
    }
    setDelDone(true);
    setDelPwd("");
    toast.success("Patvirtinimo laiškas išsiųstas.");
  } catch {
    setDelErr("Serverio klaida. Bandykite vėliau.");
  } finally {
    setDelBusy(false);
  }
}

  // --- password rule flags (live) ---
  const hasUpper = /[A-Z]/.test(newPwd);
  const hasLower = /[a-z]/.test(newPwd);
  const hasDigit = /[0-9]/.test(newPwd);
  const hasSymbol = /[!@#$%^&*()_\-+\=\[\]{};:'",.<>/?\\|`~]/.test(newPwd);
  const minLength = newPwd.length >= 8;
  const ALLOWED_SYMBOLS = `! @ # $ % ^ & * ( ) _ - + = [ ] { } ; : ' " , . < > / ? \\ | \``;

  // ===== Layout measuring (kept from your version) =====
  const rightRef = useRef(null);
  const [leftBaseMinH, setLeftBaseMinH] = useState(0);
  const collapseTimerRef = useRef(null);
  const COLLAPSE_MS = 350; // keep in sync with Expand transition

  const measureBaseHeights = () => {
    if (!rightRef.current) return;
    const h = rightRef.current.getBoundingClientRect().height;
    setLeftBaseMinH(h);
  };

  useEffect(() => {
    if (!loading && !serverError) {
      requestAnimationFrame(measureBaseHeights);
    }
  }, [loading, serverError]);

  useEffect(() => {
    const onResize = () => {
      if (edit.field === null) measureBaseHeights();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [edit.field]);

  useEffect(() => {
    if (edit.field === null) {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = setTimeout(() => {
        requestAnimationFrame(measureBaseHeights);
      }, COLLAPSE_MS);
    }
    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }
    };
  }, [edit.field]);

  // ===== Load profile =====
  useEffect(() => {
    document.title = "Profilis – DuBPlyBET";
    let alive = true;
    (async () => {
      setLoading(true);
      setServerError("");
      try {
        const res = await fetch(`${API}/api/users/me`, { headers: { ...authHeader } });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          setServerError(data?.error || "Nepavyko nuskaityti profilio.");
          setLoading(false);
          return;
        }
        if (!alive) return;
        setMe(data.user);
        setUsername(data.user.username || "");
        setDiscord(data.user.discordUsername || "");
      } catch {
        setServerError("Serverio klaida. Bandykite vėliau.");
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [API, authHeader]);

  const [isMobile, setIsMobile] = useState(window.matchMedia("(max-width: 441px)").matches);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 441px)");
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const startEdit = (field) => {
    setEdit({ field });
    setServerError("");
    setConfirmPwd("");
    setOldPwd("");
    setNewPwd("");
    setNewPwd2("");
  };
  const cancelEdit = () => {
    setUsername(me?.username || "");
    setDiscord(me?.discordUsername || "");
    setConfirmPwd("");
    setOldPwd("");
    setNewPwd("");
    setNewPwd2("");
    setEdit({ field: null });
  };

  // ===== Edit: username / discord =====
  const saveUsernameDiscord = async () => {
    if (!edit.field) return;
    setServerError("");

    try {
      const body = { currentPassword: confirmPwd };
      const currentUsername = me?.username || "";
      const currentDiscord = (me?.discordUsername || "").toLowerCase();

      if (edit.field === "username") {
        const newName = (username || "").trim();
        if (!newName) return setServerError("Slapyvardis negali būti tuščias.");
        if (newName === currentUsername) return setServerError("Naujas slapyvardis sutampa su dabartiniu.");
        if (!confirmPwd) return setServerError("Įveskite slaptažodį patvirtinimui.");
        body.username = newName;
      }

      if (edit.field === "discord") {
        const discordNormalized = (discord || "").trim().replace(/^@/, "").toLowerCase();
        if (!discordNormalized) return setServerError("Discord vardas negali būti tuščias.");
        if (!DISCORD_RE.test(discordNormalized)) return setServerError("Neteisingas Discord vardas (2–32, tik raidės/skaičiai, _ ir ., be '..').");
        if (discordNormalized === currentDiscord) return setServerError("Naujas Discord vardas sutampa su dabartiniu.");
        if (!confirmPwd) return setServerError("Įveskite slaptažodį patvirtinimui.");
        body.discordUsername = discordNormalized;
      }

      const res = await fetch(`${API}/api/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) return setServerError(data?.error || "Nepavyko išsaugoti pakeitimų.");

      const sanitizedUsername = data.user?.username ?? me?.username;
    const sanitizedDiscord  = data.user?.discordUsername ?? me?.discordUsername;
    const updated = { ...me, username: sanitizedUsername, discordUsername: sanitizedDiscord };
    setMe(updated);
    if (edit.field === "username") setUsername(sanitizedUsername);
    if (edit.field === "discord")  setDiscord(sanitizedDiscord);

      setConfirmPwd("");
      setEdit({ field: null });

      const { token: currentToken } = getAuth();
      setAuth({ user: updated, token: currentToken });

      toast.success("Pakeitimai išsaugoti");
    } catch {
      setServerError("Serverio klaida. Bandykite vėliau.");
    }
  };

  // ===== Edit: password =====
  const savePassword = async () => {
    setServerError("");

    if (!oldPwd || !newPwd || !newPwd2) return setServerError("Užpildykite visus laukus.");
    if (newPwd !== newPwd2) return setServerError("Slaptažodžiai nesutampa");
    if (newPwd === oldPwd) return setServerError("Naujas slaptažodis negali sutapti su senuoju.");

    try {
      const res = await fetch(`${API}/api/users/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ oldPassword: oldPwd, password: newPwd, confirmPassword: newPwd2 }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) return setServerError(data?.error || "Nepavyko atnaujinti slaptažodžio.");

      toast.success("Slaptažodis atnaujintas");
      setOldPwd(""); setNewPwd(""); setNewPwd2("");
      setEdit({ field: null });
    } catch {
      setServerError("Serverio klaida. Bandykite vėliau.");
    }
  };

  // ===== Avatar upload =====
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

  const avatarUrlAbs = (url) => {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    return `${API}${url}`;
    // If API returns relative avatar paths, this makes them absolute
  };

  const triggerFile = () => {
    if (uploading) return;
    fileRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    setServerError("");
    if (!file) return;

    if (!ACCEPT.includes(file.type)) {
      const msg = "Netinkamas formatas. Leidžiami: JPG, PNG, WEBP.";
      setServerError(msg); toast.error(msg); return;
    }
    if (file.size > MAX_SIZE) {
      const msg = "Failas per didelis. Maksimalus dydis: 2 MB.";
      setServerError(msg); toast.error(msg); return;
    }

    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch(`${API}/api/users/me/avatar`, {
        method: "POST",
        headers: { ...authHeader },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        const msg = data?.error || "Nepavyko įkelti avataro.";
        setServerError(msg); toast.error(msg); return;
      }
      const newUrl = `${data.url}?t=${Date.now()}`;
      const updated = { ...me, avatarUrl: newUrl };
      setMe(updated);
      const { token: currentToken } = getAuth();
      setAuth({ user: updated, token: currentToken });
      toast.success("Avataras atnaujintas");
    } catch {
      setServerError("Serverio klaida įkeliant avatarą. Bandykite vėliau.");
      toast.error("Serverio klaida įkeliant avatarą.");
    } finally {
      setUploading(false);
    }
  };

  // ===== Left card extra data: Teisingi spėjimai + Favoritas =====
  const [correctAllTime, setCorrectAllTime] = useState(null);
  const [favoriteTeam, setFavoriteTeam] = useState(null);
  const mySub = useMemo(() => subroleFor(Number(correctAllTime ?? 0)), [correctAllTime]);
  const [badges, setBadges] = useState([]);
  const [openBadgeId, setOpenBadgeId] = useState(null);
  useEffect(() => {
    if (!me?.id) return;
    (async () => {
      try {
        const res = await fetch(`${API}/api/users/${me.id}/badges`, { headers: { ...authHeader } });
        const d = await res.json();
        if (d?.ok) setBadges(d.badges || []);
      } catch {/* ignore */}
    })();
  }, [API, authHeader, me?.id]);

  // --- Registered date (užsiregistravo) ---
const [registeredAt, setRegisteredAt] = useState(null);

const fmtDate = (d) => {
  try { return new Date(d).toLocaleDateString(); }
  catch { return ""; }
};

// Pull from /me if present, else fetch from /public/:id
useEffect(() => {
  if (!me?.id) return;

  // prefer data from /me if backend already sends it
  if (me.registeredAt) {
    setRegisteredAt(me.registeredAt);
    return;
  }

  let cancel = false;
  (async () => {
    try {
      const res = await fetch(`${API}/api/users/public/${me.id}`, { headers: { ...authHeader } });
      const d = await res.json();
      if (!cancel && res.ok && d?.ok && d.user?.registeredAt) {
        setRegisteredAt(d.user.registeredAt);
      }
    } catch { /* ignore */ }
  })();

  return () => { cancel = true; };
}, [API, authHeader, me?.id, me?.registeredAt]);

  // Try to use me.correct... else fallback to all-time LB
  useEffect(() => {
    const val =
      me?.correct_guesses_all_time ??
      me?.correctGuessesAllTime ??
      null;
    if (val != null) {
      setCorrectAllTime(Number(val));
      return;
    }
    let cancel = false;
    (async () => {
      try {
        const res = await fetch(`${API}/api/leaderboards/all-time`);
        const d = await res.json();
        const uid = me?.id;
        if (res.ok && d?.leaderboard && uid) {
          const row = d.leaderboard.find(r => String(r.user_id) === String(uid));
          if (!cancel) setCorrectAllTime(row ? Number(row.correct_any ?? 0) : 0);
        }
      } catch {
        /* ignore; we’ll compute from correct list if needed */
      }
    })();
    return () => { cancel = true; };
  }, [API, me]);

  // Favoritas: user's winner pick for the active tournament (if any)
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const tr = await fetch(`${API}/api/tournaments`);
        const td = await tr.json();
        const list = td?.tournaments || [];
        const active = list.find(t => t.status === "active");
        if (!active) { if (!cancel) setFavoriteTeam(null); return; }
        const res = await fetch(`${API}/api/tournaments/${active.id}/winner-pick`, { headers: { ...authHeader } });
        const d = await res.json();
        if (!cancel) {
          if (res.ok && d?.ok && d.picked && d.team) setFavoriteTeam(d.team || null);
          else setFavoriteTeam(null);
        }
      } catch {
        if (!cancel) setFavoriteTeam(null);
      }
    })();
    return () => { cancel = true; };
  }, [API, authHeader]);

  // ===== Top-right card: correct guesses list (scrollable) =====
  const PAGE_SIZE = 5
  const FETCH_SIZE = 50;
  
  const [cg, setCg] = useState({
    items: [],
    loading: false,
    error: "",
    offset: 0,
    hasMore: true,
  });

  const [page, setPage] = useState(1);

  const prevPageRef = useRef(1);
  const [pageDir, setPageDir] = useState(1); // 1 = next/right, -1 = prev/left
  useEffect(() => {
    const dir = page > prevPageRef.current ? 1 : -1;
    setPageDir(dir);
    prevPageRef.current = page;
  }, [page]);

  const listRef = useRef(null);
  useEffect(() => {
    listRef.current?.scrollTo?.({ top: 0, behavior: "smooth" });
  }, [page]);

  const pageCount = Math.max(1, Math.ceil(cg.items.length / PAGE_SIZE));
  const startIdx = (page - 1) * PAGE_SIZE;
  const endIdx = startIdx + PAGE_SIZE;

  const loadMoreCorrect = async () => {
  if (cg.loading || !cg.hasMore) return;
  setCg(s => ({ ...s, loading: true, error: "" }));
  try {
    const res = await fetch(
      `${API}/api/games/finished?limit=${FETCH_SIZE}&offset=${cg.offset}`,
      { headers: { ...authHeader } }
    );
    const d = await res.json();
    if (!res.ok) throw new Error(d?.error || "Nepavyko užkrauti");

    const raw = Array.isArray(d?.games) ? d.games : [];

    const pageSeen = new Set();
    const next = raw
      .filter(g => g?.my_guess && Number(g.my_guess?.awarded_points ?? 0) > 0)
      .map(g => ({
        id: g.id,
        stage: g.stage,
        tipoff_at: g.tipoff_at,
        team_a: g.team_a,
        team_b: g.team_b,
        score_a: g.score_a,
        score_b: g.score_b,
        my: {
          a: g.my_guess.guess_a,
          b: g.my_guess.guess_b,
          pts: g.my_guess.awarded_points ?? 0,
        },
      }))
      .filter(it => (pageSeen.has(it.id) ? false : (pageSeen.add(it.id), true)));

    setCg(prev => {
      const seen = new Set(prev.items.map(i => i.id));
      const dedupNext = next.filter(n => !seen.has(n.id));
      const merged = [...prev.items, ...dedupNext];

      // if you still want the fallback counter:
      // if (correctAllTime == null) setCorrectAllTime(merged.length);

      return {
        ...prev,
        items: merged,
        loading: false,
        error: "",
        offset: prev.offset + FETCH_SIZE,
        hasMore: raw.length >= FETCH_SIZE, // stop when server sent fewer than batch size
      };
    });
  } catch (e) {
    setCg(s => ({ ...s, loading: false, error: e?.message || "Klaida kraunant sąrašą" }));
  }
};

const goToPage = (n) => {
  const clamped = Math.min(Math.max(1, n), pageCount);
  setPage(clamped);
};

const goNext = async () => {
  // If we’re not on the last *fetched* page, just advance
  if (page < pageCount) return setPage(p => p + 1);

  // We’re on the last fetched page. If server has more — fetch next batch, then advance if new items arrived
  if (cg.hasMore && !cg.loading) {
    await loadMoreCorrect();
    // After fetching, if pageCount increased, advance 1 page
    const newCount = Math.max(1, Math.ceil((cg.items.length) / PAGE_SIZE));
    setPage(p => Math.min(p + 1, newCount));
  }
};

const goPrev = () => {
  if (page > 1) setPage(p => p - 1);
};

  useEffect(() => {
    // initial page
    loadMoreCorrect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API, token]);

  if (loading) return <Load>Kraunama…</Load>;
  if (serverError && !me) return <Load role="alert">{serverError}</Load>;

  const name = me?.username || "Vartotojas";


  return (
    <Wrap>
      <Container>
        <PageTitle>Profilis</PageTitle>

        <Grid>
          {/* Left card */}
          <Left>
            <AvatarWrap onClick={triggerFile} role="button" title={uploading ? "Įkeliama…" : "Įkelti avatarą"}>
              <AvatarImage
                src={me?.avatarUrl ? avatarUrlAbs(me.avatarUrl) : logoImg}
                alt="Avatar"
                $uploading={uploading}
              />
              <Overlay>
                <OverlayInner>
                  <FiUpload />
                  <span>{uploading ? "Įkeliama…" : "Įkelti"}</span>
                </OverlayInner>
              </Overlay>
              <HiddenFile
                type="file"
                accept={ACCEPT.join(",")}
                onChange={handleAvatarChange}
                ref={fileRef}
                aria-label="Pasirinkti avataro failą"
              />
            </AvatarWrap>

            <NameRow>
              <Name title={name}>{name}</Name>
              <RolePill $admin={me?.role === "admin"}>{roleLT(me?.role)}</RolePill>
              {!!correctAllTime && (
                <RolePill as="span" style={{ color: mySub.fg, background: mySub.bg }}>
                  <mySub.Icon style={{ verticalAlign: "middle", marginRight: 6 }} />
                  {mySub.name}
                </RolePill>
              )}
            </NameRow>

            <Divider />

            <MetaBlockCol>
              <MetaItem>
                <MetaLabel>Užsiregistravo</MetaLabel>
                <MetaValue>{registeredAt ? fmtDate(registeredAt) : "—"}</MetaValue>
              </MetaItem>

              <MetaItem>
                <MetaLabel>Teisingi spėjimai</MetaLabel>
                <BigStat>{Number(correctAllTime ?? 0)}</BigStat>
              </MetaItem>

              <MetaItem>
                <MetaLabel>Favoritas</MetaLabel>
                <FavRow>
                  {favoriteTeam ? (
                    <>
                      <FlagDot>{flagForTeam(favoriteTeam, 18)}</FlagDot>
                      <span className="fav">{favoriteTeam}</span>
                    </>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </FavRow>
              </MetaItem>
            </MetaBlockCol>
          </Left>

          {/* Right side: two cards stacked */}
          <Right ref={rightRef}>
            {/* Top-right: correct guesses list */}
            <Card style={{ height: "100%", display: "flex", flexDirection: "column" }}>
              <CardTitle>MANO TEISINGI SPĖJIMAI</CardTitle>

              {cg.error ? <Alert role="alert">{cg.error}</Alert> : null}

              <CorrectViewport>
    <PageSlide key={page} $dir={pageDir}>
      <CorrectList ref={listRef}>
        {cg.items.length === 0 && !cg.loading ? (
          <Muted>Nėra teisingų spėjimų.</Muted>
        ) : (
          cg.items.slice(startIdx, endIdx).map((it, idx) => (
            <CorrectItem
              key={`${page}-${it.id}`}
              $delay={`${idx * 60}ms`}
            >
                      <TeamsMini>
                        <RowMini>
                          <FlagDot>{flagForTeam(it.team_a, 16)}</FlagDot>
                          <span className="name">{it.team_a}</span>
                          <span className="score">{it.score_a}</span>
                        </RowMini>
                        <RowMini>
                          <FlagDot>{flagForTeam(it.team_b, 16)}</FlagDot>
                          <span className="name">{it.team_b}</span>
                          <span className="score">{it.score_b}</span>
                        </RowMini>
                      </TeamsMini>
                      <GuessMini>
                        <span className="label">Tavo spėjimas</span>
                        <span className="val">{it.my.a}–{it.my.b}</span>
                      </GuessMini>
                      <PtsBadge title="Sukurti taškai">{it.my.pts}p</PtsBadge>
                    </CorrectItem>
                  ))
                )}
              </CorrectList>
              </PageSlide>
              </CorrectViewport>

              <CardActions>
                <Pager role="navigation" aria-label="Puslapių navigacija">
                  <PageBtn onClick={goPrev} disabled={page <= 1 || cg.loading}>Ankstesnis</PageBtn>

                  {/* Page numbers for fetched items */}
                  {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => (
                    <PageNumber
                      key={n}
                      $active={n === page}
                      onClick={() => goToPage(n)}
                      aria-current={n === page ? "page" : undefined}
                      disabled={cg.loading}
                    >
                      {n}
                    </PageNumber>
                  ))}

                  {/* If server still has more, show an affordance that Next may fetch */}
                  <PageBtn onClick={goNext} disabled={(!cg.hasMore && page >= pageCount) || cg.loading}>
                    Kitas{cg.hasMore && page >= pageCount ? " +" : ""}
                  </PageBtn>
                </Pager>
              </CardActions>
            </Card>
          </Right>

            <Card style={{ gridColumn: "1 / -1" }}>
              <CardTitle>ŽENKLELIAI</CardTitle>
              {badges.length === 0 ? (
                <Muted>Ženklelių nėra.</Muted>
              ) : (
                <>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {badges.map(b => (
                      <BadgePill
                        key={b.id}
                        badge={b}
                        onClick={() => setOpenBadgeId(openBadgeId === b.id ? null : b.id)}
                        title={`${b.name} – spustelk dėl aprašymo`}
                      />
                    ))}
                  </div>

                  {openBadgeId && (
                    <div style={{ marginTop: 10, padding: "10px 12px", border: "1px dashed #e5e7eb", borderRadius: 10 }}>
                      <strong>{badges.find(x => x.id === openBadgeId)?.name}:</strong>{" "}
                      {badges.find(x => x.id === openBadgeId)?.description}
                    </div>
                  )}
                </>
              )}
            </Card>
                <Card style={{ gridColumn: "1 / -1" }}>
              <CardTitle>PASKYROS NUSTATYMAI</CardTitle>
              {!!serverError && <Alert role="alert">{serverError}</Alert>}

              {/* USERNAME */}
              <Field>
                <Label>Slapyvardis</Label>
                <Row>
                  <InputWrap aria-invalid={false}>
                    <FiUser />
                    <Input
                      disabled={edit.field !== "username"}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Jūsų vardas"
                    />
                    {isMobile && edit.field !== "username" && (
                      <InnerEditBtn onClick={() => startEdit("username")} aria-label="Redaguoti">
                        <FiEdit3 />
                      </InnerEditBtn>
                    )}
                  </InputWrap>

                  {edit.field === "username"
                    ? (isMobile ? null : (
                      <BtnRow>
                        <IconBtn $variant="confirm" onClick={saveUsernameDiscord} aria-label="Išsaugoti"><FiCheck /></IconBtn>
                        <IconBtn $variant="cancel" onClick={cancelEdit} aria-label="Atšaukti"><FiX /></IconBtn>
                      </BtnRow>
                    ))
                    : (!isMobile && (
                      <IconBtn onClick={() => startEdit("username")} aria-label="Redaguoti"><FiEdit3 /></IconBtn>
                    ))
                  }
                </Row>

                <Expand $open={edit.field === "username"} aria-hidden={edit.field !== "username"}>
                  <SubLabel>Patvirtinkite slaptažodį</SubLabel>
                  <ExpandedInputWrap aria-invalid={false}>
                    <FiLock />
                    <Input
                      type="password"
                      value={confirmPwd}
                      onChange={(e) => setConfirmPwd(e.target.value)}
                      placeholder="●●●●●●●●"
                    />
                  </ExpandedInputWrap>
                  {isMobile && (
                    <ActionBar>
                      <IconBtn $variant="confirm" onClick={saveUsernameDiscord} aria-label="Išsaugoti"><FiCheck /></IconBtn>
                      <IconBtn $variant="cancel" onClick={cancelEdit} aria-label="Atšaukti"><FiX /></IconBtn>
                    </ActionBar>
                  )}
                </Expand>
              </Field>

              {/* DISCORD */}
              <Field>
                <Label>Discord Nick</Label>
                <Row>
                  <InputWrap aria-invalid={false}>
                    <FiHash />
                    <Input
                      disabled={edit.field !== "discord"}
                      value={discord}
                      onChange={(e) => setDiscord(e.target.value)}
                      placeholder="vardas"
                    />
                    {isMobile && edit.field !== "discord" && (
                      <InnerEditBtn onClick={() => startEdit("discord")} aria-label="Redaguoti">
                        <FiEdit3 />
                      </InnerEditBtn>
                    )}
                  </InputWrap>

                  {edit.field === "discord"
                    ? (isMobile ? null : (
                      <BtnRow>
                        <IconBtn $variant="confirm" onClick={saveUsernameDiscord} aria-label="Išsaugoti"><FiCheck /></IconBtn>
                        <IconBtn $variant="cancel" onClick={cancelEdit} aria-label="Atšaukti"><FiX /></IconBtn>
                      </BtnRow>
                    ))
                    : (!isMobile && (
                      <IconBtn onClick={() => startEdit("discord")} aria-label="Redaguoti"><FiEdit3 /></IconBtn>
                    ))
                  }
                </Row>

                <Expand $open={edit.field === "discord"} aria-hidden={edit.field !== "discord"}>
                  <SubLabel>Patvirtinkite slaptažodį</SubLabel>
                  <ExpandedInputWrap aria-invalid={false}>
                    <FiLock />
                    <Input
                      type="password"
                      value={confirmPwd}
                      onChange={(e) => setConfirmPwd(e.target.value)}
                      placeholder="●●●●●●●●"
                    />
                  </ExpandedInputWrap>
                  {isMobile && (
                    <ActionBar>
                      <IconBtn $variant="confirm" onClick={saveUsernameDiscord} aria-label="Išsaugoti"><FiCheck /></IconBtn>
                      <IconBtn $variant="cancel" onClick={cancelEdit} aria-label="Atšaukti"><FiX /></IconBtn>
                    </ActionBar>
                  )}
                </Expand>
              </Field>

              {/* PASSWORD */}
              <Field>
                <Label>Slaptažodis</Label>
                <Row>
                  <InputWrap aria-invalid={false}>
                    <FiLock />
                    <Input value="********" disabled />
                    {isMobile && edit.field !== "password" && (
                      <InnerEditBtn onClick={() => startEdit("password")} aria-label="Redaguoti">
                        <FiEdit3 />
                      </InnerEditBtn>
                    )}
                  </InputWrap>

                  {edit.field === "password"
                    ? (isMobile ? null : (
                      <BtnRow>
                        <IconBtn $variant="confirm" onClick={savePassword} aria-label="Išsaugoti"><FiCheck /></IconBtn>
                        <IconBtn $variant="cancel" onClick={cancelEdit} aria-label="Atšaukti"><FiX /></IconBtn>
                      </BtnRow>
                    ))
                    : (!isMobile && (
                      <IconBtn onClick={() => startEdit("password")} aria-label="Redaguoti"><FiEdit3 /></IconBtn>
                    ))
                  }
                </Row>

                <Expand $open={edit.field === "password"} aria-hidden={edit.field !== "password"}>
                  <SubLabel>Senas slaptažodis</SubLabel>
                  <ExpandedInputWrap aria-invalid={false}>
                    <FiLock />
                    <Input
                      type="password"
                      value={oldPwd}
                      onChange={(e) => setOldPwd(e.target.value)}
                      placeholder="●●●●●●●●"
                    />
                  </ExpandedInputWrap>

                  <SubLabel>Naujas slaptažodis</SubLabel>
                  <ExpandedInputWrap aria-invalid={false}>
                    <FiLock />
                    <Input
                      type="password"
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      placeholder="●●●●●●●●"
                    />
                  </ExpandedInputWrap>

                  <Rules aria-live="polite">
                    <Rule $ok={minLength}>Mažiausiai 8 simboliai</Rule>
                    <Rule $ok={hasUpper}>Bent viena didžioji raidė</Rule>
                    <Rule $ok={hasLower}>Bent viena mažoji raidė</Rule>
                    <Rule $ok={hasDigit}>Bent vienas skaičius</Rule>
                    <Rule $ok={hasSymbol}>
                      Bent vienas simbolis <Symbols>(leidžiami: {ALLOWED_SYMBOLS})</Symbols>
                    </Rule>
                  </Rules>

                  <SubLabel>Pakartokite naują slaptažodį</SubLabel>
                  <ExpandedInputWrap aria-invalid={false}>
                    <FiLock />
                    <Input
                      type="password"
                      value={newPwd2}
                      onChange={(e) => setNewPwd2(e.target.value)}
                      placeholder="●●●●●●●●"
                    />
                  </ExpandedInputWrap>
                  {isMobile && (
                    <ActionBar>
                      <IconBtn $variant="confirm" onClick={savePassword} aria-label="Išsaugoti"><FiCheck /></IconBtn>
                      <IconBtn $variant="cancel" onClick={cancelEdit} aria-label="Atšaukti"><FiX /></IconBtn>
                    </ActionBar>
                  )}
                </Expand>
              </Field>
            </Card>
            <Card style={{ gridColumn: "1 / -1" }}>
  <CardToggle
    onClick={() => setDelOpen(o => !o)}
    aria-expanded={delOpen}
    aria-controls="delete-section"
    $open={delOpen}
  >
    <CardTitle>PASKYROS IŠTRYNIMAS</CardTitle>
    <FiChevronDown aria-hidden="true" />
  </CardToggle>

  <Expand id="delete-section" $open={delOpen} aria-hidden={!delOpen}>
    <DangerNote>
      Šis veiksmas negrįžtamas. Įveskite slaptažodį ir gausite el. laišką su patvirtinimo nuoroda.
    </DangerNote>

    {!!delErr && <Alert role="alert">{delErr}</Alert>}

    {delDone ? (
      <SuccessBox>Patvirtinimo laiškas išsiųstas. Patikrinkite savo el. paštą.</SuccessBox>
    ) : (
      <Field>
        <Label>Slaptažodis</Label>
        <Row>
          <ExpandedInputWrap aria-invalid={!!delErr}>
            <FiLock />
            <Input
              type="password"
              value={delPwd}
              onChange={(e) => setDelPwd(e.target.value)}
              placeholder="●●●●●●●●"
            />
          </ExpandedInputWrap>

          <DangerAction
            type="button"
            onClick={requestAccountDeletion}
            disabled={delBusy}
            title="Siųsti patvirtinimą"
          >
            {delBusy ? "Siunčiama…" : "Siųsti patvirtinimą"}
          </DangerAction>
        </Row>
      </Field>
    )}
  </Expand>
</Card>
        </Grid>
      </Container>
    </Wrap>
  );
}

/* ===== styles  ===== */
const MOBILE_BP = 960;
const LEFT_BODY_SIZE = "14px";
const LEFT_BODY_WEIGHT = 800;
const GROUP_GAP = "20px";
const PAIR_GAP  = "6px";

const Wrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  min-height: calc(100vh - (var(--main-pad-y, 24px) * 2));
  width: 100%;
  box-sizing: border-box;
`;

const Container = styled.div`
  width: 100%;
  margin: 0 auto;
  gap: 16px;
`;

const PageTitle = styled.h1`
  margin: 0 0 30px 0;
  font-size: 30px;
  font-weight: 800;
  color: #0f172a;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: clamp(240px, 26vw, 360px) minmax(0, 1fr);
  gap: 24px;
  align-items: start;

  @media (max-width: ${MOBILE_BP - 1}px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const Left = styled.div`
  background: #fff;
  border: 1px solid #eceff3;
  border-radius: 24px;
  padding: 24px;
  display: grid;
  gap: 30px;
  align-self: start;

  /* Stop the vertical stretching that makes huge gaps */
  align-content: start;       /* key */
  grid-auto-rows: max-content;/* key */
`;

const Divider = styled.div`
  height: 1px;
  background: #eceff3;
`;

const NameRow = styled.div`
  display: flex;               /* was grid */
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 8px;                    /* was 10px */
`;

const Name = styled.h2`
  margin: 0;
  font-size: 22px;
  color: #0f172a;
  font-weight: 800;

  /* ensure single-line + ellipsis in flex row */
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 0 1 auto;  /* do NOT push the role pill away */
`;

const RolePill = styled.span`
  font-weight: ${LEFT_BODY_WEIGHT};
  font-size: ${LEFT_BODY_SIZE};
  padding: 6px 10px;
`;

const MetaBlockCol = styled.div`
  display: grid;
  gap: ${GROUP_GAP};        /* bigger gap between groups */
  .muted { color: #64748b; font-weight: ${LEFT_BODY_WEIGHT}; }
  .fav { font-weight: ${LEFT_BODY_WEIGHT}; color: #0f172a; }
`;

const MetaLabel = styled.div`
  font-size: 12px;           /* heading style – unchanged */
  letter-spacing: .12em;
  color: #6b7280;
  font-weight: 800;
  text-transform: uppercase;
`;

const BigStat = styled.div`
  font-size: ${LEFT_BODY_SIZE};      /* unify with other body text */
  font-weight: ${LEFT_BODY_WEIGHT};
  color: #0f172a;
`;

const FavRow = styled.div`
  display: flex;
  gap: 8px;                           /* same gap as elsewhere */
  font-size: ${LEFT_BODY_SIZE};       /* unify body text */
  font-weight: ${LEFT_BODY_WEIGHT};
`;

const Right = styled.div`
  display: grid;
  gap: 24px;
  align-self: stretch;   /* fill the full first row height */
`;

const Card = styled.section`
  background: #fff;
  border: 1px solid #eceff3;
  border-radius: 24px;
  padding: 18px;
  display: grid;
  gap: 14px;
  box-sizing: border-box;
  min-width: 0;
`;

const CardTitle = styled.h3`
  margin: 0;
  font-size: 13px;
  letter-spacing: .14em;
  font-weight: 900;
  color: #0f172a;
`;

const CardActions = styled.div`
  display: flex;
  justify-content: center;
`;

const SmallBtn = styled.button`
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 10px;
  padding: 8px 12px;
  font-weight: 800;
  cursor: pointer;
  &:disabled { opacity: .6; cursor: default; }
`;

const Alert = styled.div`
  background: #fff4f4;
  border: 1px solid #ffd4d4;
  color: #8b1f1f;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 14px;
  word-break: break-word;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
`;

const Label = styled.div`
  font-weight: 700;
  color: #0f172a;
  font-size: 15px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
  flex-wrap: wrap;
`;

const InputWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  height: 52px;
  padding: 0 16px;
  border: 1px solid ${({["aria-invalid"]: invalid}) => (invalid ? "#e11d48" : "#dfe5ec")};
  border-radius: 999px;
  background: #f6fbffff;
  flex: 1 1 auto;
  min-width: 0;
  position: relative;
  transition: border-color .15s ease, box-shadow .15s ease, background-color .15s ease;

  svg { color: #99a3b2; font-size: 18px; flex-shrink: 0; }
  input:disabled & { background: #f8fafc; }

  &:focus-within {
    border-color: #1f6feb;
    box-shadow: 0 0 0 3px #e8f1ff;
    background: #fff;
  }

  @media (max-width: 392px) {
    padding-right: 48px;
  }
`;

const ExpandedInputWrap = styled(InputWrap)`
  background: #fff;
  border-radius: 14px;
`;

const Input = styled.input`
  border: 0;
  outline: none;
  flex: 1;
  height: 100%;
  background: transparent;
  color: #0f172a;
  font-size: 15px;
  &::placeholder { color: #99a3b2; }
`;

const BtnRow = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
`;

const IconBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #eceff3;
  background: #fff;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;

  &:hover { background: #f8fafc; border-color: #d1d9e2; }
  svg { font-size: 16px; color: #64748b; }

  ${({ $variant }) =>
    $variant === "confirm" &&
    `
      border-color: #16a34a;
      background: #dcfce7;
      svg { color: #166534; }
      &:hover { background: #bbf7d0; border-color: #15803d; }
    `}
  ${({ $variant }) =>
    $variant === "cancel" &&
    `
      border-color: #dc2626;
      background: #fee2e2;
      svg { color: #991b1b; }
      &:hover { background: #fecaca; border-color: #b91c1c; }
    `}
`;

const Expand = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 16px;

  max-height: ${({ $open }) => ($open ? "1000px" : "0px")};
  padding: ${({ $open }) => ($open ? "16px" : "0 16px")};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transform: translateY(${({ $open }) => ($open ? "0" : "-6px")});
  overflow: hidden;
  pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
  transition: max-height .3s ease, padding .25s ease, opacity .2s ease, transform .25s ease;
`;

const SubLabel = styled.div`
  font-size: 12px;
  color: #475569;
  font-weight: 600;
`;

const Load = styled.div`
  padding: 24px;
  text-align: center;
  color: #64748b;
`;

const Rules = styled.ul`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid #e6ecf5;
  background: #f8fafc;
  list-style: none;
  gap: 4px;
`;

const Rule = styled.li`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  font-size: 13px;
  color: ${({ $ok }) => ($ok ? "#0d6c2f" : "#475569")};
  background: ${({ $ok }) => ($ok ? "#effaf1" : "transparent")};
  transition: background-color 0.15s ease, color 0.15s ease;

  &::before {
    content: ${({ $ok }) => ($ok ? "'✔'" : "'✖'")};
    font-weight: bold;
    color: ${({ $ok }) => ($ok ? "#0d6c2f" : "#e11d48")};
    flex-shrink: 0;
  }
`;

const Symbols = styled.span`
  color: #0f172a;
  word-break: break-all;
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 8px;
`;

const InnerEditBtn = styled.button`
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 30px;
  height: 30px;
  border-radius: 10px;
  border: 1px solid #eceff3;
  background: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background-color .15s ease, border-color .15s ease;

  svg { font-size: 18px; color: #64748b; }
  &:hover { background: #f8fafc; border-color: #d1d9e2; }

  @media (min-width: 442px) { display: none; }
`;

/* === Avatar with hover overlay (unchanged from yours) === */
const AvatarWrap = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  position: relative;
  overflow: hidden;
  background: #f6f8fc;
  border: 1px solid #e7edf6;
  cursor: pointer;

  /* NEW: center it */
  margin: 0 auto;

  &:hover {
    & > div[data-overlay="layer"] { opacity: 1; }
    img { filter: blur(2px) brightness(0.9); transform: scale(1.02); }
  }
`;
const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: filter .2s ease, transform .2s ease;
  pointer-events: none;
  opacity: ${({ $uploading }) => ($uploading ? 0.7 : 1)};
`;
const Overlay = styled.div.attrs({ "data-overlay": "layer" })`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.45);
  color: #fff;
  opacity: 0;
  transition: opacity .15s ease;
`;
const OverlayInner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-weight: 800;
  font-size: 12px;
  svg { font-size: 22px; }
`;
const HiddenFile = styled.input`
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
`;

/* ===== Correct guesses card styles ===== */
const CorrectList = styled.div`
  flex: 1 1 auto;   /* fill remaining height so the button stays at the bottom */
  min-height: 0;    /* allow the grid to scroll inside */
  overflow: auto;

  display: grid;
  gap: 10px;
  padding-right: 2px;

  /* key bits — prevent row stretch, leave empty gap at the bottom when few items */
  grid-auto-rows: max-content;  /* rows sized to their content */
  align-content: start;         /* pack rows at the top (don’t stretch to fill) */
  align-items: start;           /* don’t stretch individual cards vertically */
`;

const enterUp = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const CorrectItem = styled.div`
  border: 1px solid #e7eaf0;
  background: #fff;
  border-radius: 12px;
  padding: 10px;
  display: grid;
  grid-template-columns: 1fr auto;  /* left = teams, right = stack */
  grid-auto-rows: auto;
  gap: 10px 12px;
  align-items: center;;
  animation: ${enterUp} .22s ease both;
  animation-delay: ${({ $delay }) => $delay || "0ms"};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const TeamsMini = styled.div`
  grid-column: 1;
  grid-row: 1 / span 2;  /* occupy both rows on the left */
  display: grid;
  gap: 6px;
  min-width: 0;
`;

const FlagDot = styled.span`
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #f3f4f6;
  display: grid;
  place-items: center;
`;

const RowMini = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;           /* score sits just after the name */
  min-width: 0;

  /* flag circle stays first */
  & > ${FlagDot} { flex: 0 0 auto; }

  .name {
    font-weight: 700;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 0 1 auto;   /* don’t push score away */
  }
  .score {
    font-weight: 900;
    flex: 0 0 auto;
    white-space: nowrap;
  }
`;

const GuessMini = styled.div`
  grid-column: 2;
  grid-row: 1;           /* top of the right stack */
  display: grid;
  justify-items: end;
  gap: 2px;
  .label { font-size: 11px; color: #6b7280; font-weight: 800; text-transform: uppercase; }
  .val { font-weight: 900; white-space: nowrap; }
`;

const PtsBadge = styled.div`
  grid-column: 2;
  grid-row: 2;           /* under the guess */
  justify-self: end;

  background: #16a34a;
  color: #fff;
  font-weight: 900;
  border-radius: 10px;
  padding: 6px 0;        /* vertical padding only */
  font-size: 13px;
  line-height: 1;

  /* fixed width pill, no responsive stretching */
  width: 64px;
  min-width: 64px;
  text-align: center;
  flex-shrink: 0;
`;

const Muted = styled.div`
  color: #64748b;
  font-weight: 700;
`;

const MetaValue = styled.div`
  font-size: ${LEFT_BODY_SIZE};
  font-weight: ${LEFT_BODY_WEIGHT};
  color: #0f172a;
`;

const MetaItem = styled.div`
  display: grid;
  gap: ${PAIR_GAP};         /* tight gap inside each pair */
`;

const DangerNote = styled.div`
  background: #fff7f7;
  border: 1px solid #ffe1e1;
  color: #7f1d1d;
  padding: 10px 12px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
`;

const SuccessBox = styled.div`
  background:#effaf1;
  border:1px solid #c9efd1;
  color:#0d6c2f;
  padding:10px 12px;
  border-radius:12px;
  font-size:14px;
  font-weight:700;
`;
// Clickable title row for collapsing/expanding
const CardToggle = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 4px 6px;
  border: 0;
  background: transparent;
  cursor: pointer;
  border-radius: 12px;
  transition: background-color .15s ease;

  
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px #e8f1ff;
  }

  svg {
    transition: transform .2s ease, color .15s ease;
    transform: rotate(${({ $open }) => ($open ? "180deg" : "0deg")});
    color: #64748b;
  }
`;
// Hover polish for the danger button (inspired by other buttons here)
const DangerAction = styled.button`
  border: 1px solid #fecaca;
  background: #fee2e2;
  color: #991b1b;
  font-weight: 800;
  border-radius: 12px;
  padding: 12px 16px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color .15s ease, border-color .15s ease, transform .05s ease;

  &:hover { background: #fecaca; border-color: #fca5a5; }
  &:active { transform: translateY(1px); }
  &:disabled { opacity: .6; cursor: default; }
`;

const Pager = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`;

const PageBtn = styled.button`
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 10px;
  padding: 8px 12px;
  font-weight: 800;
  cursor: pointer;
  &:disabled { opacity: .6; cursor: default; }
`;

const PageNumber = styled(PageBtn)`
  min-width: 40px;
  text-align: center;
  ${({ $active }) =>
    $active &&
    `
      border-color: #1f6feb;
      box-shadow: 0 0 0 3px #e8f1ff;
    `}
`;

const slideInRight = keyframes`
  from { opacity: 0; transform: translateX(16px); }
  to   { opacity: 1; transform: translateX(0); }
`;
const slideInLeft = keyframes`
  from { opacity: 0; transform: translateX(-16px); }
  to   { opacity: 1; transform: translateX(0); }
`;

const CorrectViewport = styled.div`
  position: relative;
  overflow: hidden;      /* hide slide edges */
  flex: 1 1 auto;
  min-height: 0;
  display: grid;         /* keeps your layout consistent */
`;

const PageSlide = styled.div`
  will-change: transform, opacity;
  animation: ${({ $dir }) => ($dir === -1 ? slideInLeft : slideInRight)} .54s ease both;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;