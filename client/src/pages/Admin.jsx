import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { api } from "../lib/api";
import { getAuth } from "../store/auth";
import { useToast } from "../components/ToastProvider";

/**
 * Self-guarded Admin page:
 * - If not logged in or role !== 'admin' => redirect to "/"
 * - Keeps your Sidebar/MainLayout intact (no router changes needed)
 */

export default function Admin() {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, token } = getAuth() || {};

  // ---- guard ----
  useEffect(() => {
    if (!token || !user || user.role !== "admin") {
      toast.error("Neturite prieigos.");
      navigate("/", { replace: true });
    }
  }, [token, user, navigate, toast]);

  // Render nothing while the redirect happens if not admin
  if (!token || !user || user.role !== "admin") return null;

  return (
    <Wrap>
      <Header>
        <div>
          <h1>Admin</h1>
          <p>Valdymas: vartotojai, turnyrai ir rungtynės</p>
        </div>
      </Header>

      <Tabs />
    </Wrap>
  );
}

/* ===================== Tabs (Users / Tournaments / Games) ===================== */
function Tabs() {
  const [tab, setTab] = useState("users");
  return (
    <>
      <TabRow role="tablist" aria-label="Admin skyriai">
        <TabButton $active={tab === "users"} onClick={() => setTab("users")}>
          Vartotojai
        </TabButton>
        <TabButton $active={tab === "tournaments"} onClick={() => setTab("tournaments")}>
          Turnyrai
        </TabButton>
        <TabButton $active={tab === "games"} onClick={() => setTab("games")}>
          Rungtynės
        </TabButton>
      </TabRow>

      <Card>{tab === "users" && <AdminUsers />}{tab === "tournaments" && <AdminTournaments />}{tab === "games" && <AdminGames />}</Card>
    </>
  );
}

/* ===================== Users ===================== */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DISCORD_RE = /^(?!.*\.\.)[a-z0-9._]{2,32}$/; // same rule you use on backend

function AdminUsers() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  // inline edit state (single-row edit)
  const [editId, setEditId] = useState(null);
  const [eEmail, setEEmail] = useState("");
  const [eUsername, setEUsername] = useState("");
  const [eDiscord, setEDiscord] = useState("");
  const [savingId, setSavingId] = useState(null);

  // delete modal
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [deleteUserIsAdmin, setDeleteUserIsAdmin] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const data = await api(`/api/admin/users?search=${encodeURIComponent(q)}&limit=50&offset=0`);
      setRows(data.users || []);
    } catch (e) {
      toast.error(e.message || "Nepavyko užkrauti vartotojų");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(); /* initial */
  }, []); // eslint-disable-line

  function startEdit(u) {
    setEditId(u.id);
    setEEmail(String(u.email || "").trim());
    setEUsername(String(u.username || "").trim());
    setEDiscord(String(u.discord_username || "").trim().toLowerCase());
  }
  function cancelEdit() {
    setEditId(null);
    setEEmail("");
    setEUsername("");
    setEDiscord("");
    setSavingId(null);
  }

  async function saveEdit(id) {
    const email = eEmail.trim().toLowerCase();
    const username = eUsername.trim();
    const discord = eDiscord.trim().toLowerCase();

    if (!username || username.length < 3 || username.length > 50) {
      return toast.error("Vardas turi būti 3–50 simbolių");
    }
    if (!EMAIL_RE.test(email) || email.length > 191) {
      return toast.error("Neteisingas el. pašto formatas");
    }
    if (!DISCORD_RE.test(discord)) {
      return toast.error("Neteisingas Discord vardas (2–32 simboliai, mažosios raidės, taškai ir pabraukimai; be dviejų taškų iš eilės)");
    }

    try {
      setSavingId(id);
      await api(`/api/admin/users/${id}`, {
        method: "PATCH",
        json: {
          email,
          username,
          discord_username: discord,
        },
      });
      toast.success("Vartotojas atnaujintas");
      // optimistic update
      setRows(prev => prev.map(r => (r.id === id ? { ...r, email, username, discord_username: discord } : r)));
      cancelEdit();
    } catch (e) {
      toast.error(e?.message || "Nepavyko atnaujinti");
      setSavingId(null);
    }
  }

  function askDeleteUser(id, isAdmin) {
    setDeleteUserId(id);
    setDeleteUserIsAdmin(!!isAdmin);
  }

  async function confirmDeleteUser() {
    const id = deleteUserId;
    if (!id) return;
    try {
      await api(`/api/admin/users/${id}`, { method: "DELETE" });
      toast.success("Paskyra ištrinta");
      setRows(prev => prev.filter(r => r.id !== id));
      if (editId === id) cancelEdit();
    } catch (e) {
      toast.error(e?.message || "Nepavyko ištrinti");
    } finally {
      setDeleteUserId(null);
      setDeleteUserIsAdmin(false);
    }
  }

  return (
    <Section>
      <Flex>
        <SearchInput
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Paieška (el. paštas, vardas, Discord)…"
        />
        <Primary onClick={load} disabled={loading}>
          {loading ? "Kraunama…" : "Ieškoti"}
        </Primary>
      </Flex>

      <TableCard>
        <Table>
          <thead>
            <tr>
              <th>ID</th>
              <th>El. paštas</th>
              <th>Vardas</th>
              <th>Discord</th>
              <th>Rolė</th>
              <th>Patvirtintas</th>
              <th>Sukurta</th>
              <th style={{ textAlign: "right" }}>Veiksmai</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(u => {
              const isEditing = editId === u.id;
              return (
                <tr key={u.id}>
                  <td>{u.id}</td>

                  {/* Email */}
                  <td>
                    {isEditing ? (
                      <InputSmall
                        value={eEmail}
                        onChange={e => setEEmail(e.target.value)}
                        placeholder="el. paštas"
                      />
                    ) : (
                      u.email
                    )}
                  </td>

                  {/* Username */}
                  <td>
                    {isEditing ? (
                      <InputSmall
                        value={eUsername}
                        onChange={e => setEUsername(e.target.value)}
                        placeholder="vartotojo vardas"
                      />
                    ) : (
                      u.username
                    )}
                  </td>

                  {/* Discord */}
                  <td>
                    {isEditing ? (
                      <InputSmall
                        value={eDiscord}
                        onChange={e => setEDiscord(e.target.value)}
                        placeholder="discord"
                      />
                    ) : (
                      u.discord_username
                    )}
                  </td>

                  <td>{u.role}</td>
                  <td>{u.email_verified ? "Taip" : "Ne"}</td>
                  <td>{fmt(u.created_at)}</td>

                  {/* Actions */}
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {isEditing ? (
                      <>
                        <Primary onClick={() => saveEdit(u.id)} disabled={savingId === u.id}>
                          {savingId === u.id ? "Saugojama…" : "Išsaugoti"}
                        </Primary>{" "}
                        <Ghost onClick={cancelEdit}>Atšaukti</Ghost>{" "}
                        <Danger onClick={() => askDeleteUser(u.id, u.role === "admin")}>Trinti</Danger>
                      </>
                    ) : (
                      <>
                        <Ghost onClick={() => startEdit(u)}>Redaguoti</Ghost>{" "}
                        <Danger onClick={() => askDeleteUser(u.id, u.role === "admin")}>Trinti</Danger>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", color: "#6b7280", padding: 20 }}>
                  Nėra rezultatų
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </TableCard>

      {/* Delete user modal */}
      <ConfirmModal
        open={!!deleteUserId}
        title="Ištrinti paskyrą?"
        confirmText="Ištrinti"
        onClose={() => setDeleteUserId(null)}
        onConfirm={confirmDeleteUser}
        danger
      >
        {deleteUserIsAdmin ? (
          <p><strong>Dėmesio:</strong> šis vartotojas yra administratorius. Ar tikrai norite tęsti?</p>
        ) : (
          <p>Ar tikrai norite <strong>negrįžtamai</strong> ištrinti šią paskyrą?</p>
        )}
      </ConfirmModal>
    </Section>
  );
}

/* ===================== Tournaments ===================== */
function AdminTournaments() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  // Modals
  const [finishId, setFinishId] = useState(null);
  const [winnerTeam, setWinnerTeam] = useState("");
  const [deleteId, setDeleteId] = useState(null);

  async function load() {
    try {
      setLoading(true);
      const data = await api(`/api/admin/tournaments`);
      setRows(data.tournaments || []);
    } catch (e) {
      toast.error(e.message || "Nepavyko užkrauti turnyrų");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line

  async function createTournament() {
    try {
      if (!name || !start || !end) return toast.error("Užpildykite laukus");
      await api(`/api/admin/tournaments`, {
        method: "POST",
        json: { name, start_date: start, end_date: end },
      });
      setName("");
      setStart("");
      setEnd("");
      toast.success("Sukurta");
      load();
    } catch (e) {
      toast.error(e.message || "Nepavyko sukurti");
    }
  }

  async function setStatus(id, status) {
    try {
      await api(`/api/admin/tournaments/${id}`, { method: "PATCH", json: { status } });
      toast.success("Atnaujinta");
      load();
    } catch (e) {
      toast.error(e.message || "Klaida atnaujinant");
    }
  }

  function openFinish(id) {
    setFinishId(id);
    setWinnerTeam("");
  }

  async function confirmFinish() {
    if (!finishId) return;
    if (!winnerTeam.trim()) return toast.error("Įveskite laimėtojo komandos pavadinimą");
    try {
      await api(`/api/admin/tournaments/${finishId}/finish`, {
        method: "POST",
        json: { winner_team: winnerTeam.trim() },
      });
      toast.success("Turnyras užbaigtas");
      setFinishId(null);
      setWinnerTeam("");
      load();
    } catch (e) {
      toast.error(e.message || "Nepavyko užbaigti");
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await api(`/api/admin/tournaments/${deleteId}`, { method: "DELETE" });
      toast.success("Ištrinta");
      setDeleteId(null);
      load();
    } catch (e) {
      toast.error(e.message || "Nepavyko ištrinti");
    }
  }

  return (
    <Section>
      <BlockTitle>Naujas turnyras</BlockTitle>
      <Flex>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Pavadinimas" />
        <Input type="date" value={start} onChange={e => setStart(e.target.value)} />
        <Input type="date" value={end} onChange={e => setEnd(e.target.value)} />
        <Primary onClick={createTournament}>Sukurti</Primary>
      </Flex>

      <Divider />

      <BlockTitle>Turnyrai</BlockTitle>

      <TableCard>
        <Table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Pavadinimas</th>
              <th>Data</th>
              <th>Statusas</th>
              <th>Laimėtojas</th>
              <th style={{ textAlign: "right" }}>Veiksmai</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(t => (
              <tr key={t.id} style={{
                backgroundColor:
                  t.status === "draft" ? "#f9fafb" :
                  t.status === "active" ? "#ecfdf5" :
                  t.status === "archived" ? "#fef2f2" : ""
              }}>
                <td>{t.id}</td>
                <td>{t.name}</td>
                <td>
                  {t.start_date} – {t.end_date}
                </td>
                <td>{t.status}</td>
                <td>{t.winner_team || "—"}</td>
                <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <Ghost onClick={() => setStatus(t.id, "draft")}>Į „draft“</Ghost>{" "}
                  <Ghost onClick={() => setStatus(t.id, "active")}>Aktyvus</Ghost>{" "}
                  <Primary onClick={() => openFinish(t.id)}>Užbaigti</Primary>{" "}
                  <Danger onClick={() => setDeleteId(t.id)}>Trinti</Danger>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "#6b7280", padding: 20 }}>
                  Nėra duomenų
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </TableCard>

      {/* Finish modal */}
      <Modal open={!!finishId} onClose={() => setFinishId(null)} title="Užbaigti turnyrą">
        <div style={{ display: "grid", gap: 10 }}>
          <label style={{ fontSize: 13, color: "#6b7280" }}>Nugalėtojo komanda</label>
          <Input value={winnerTeam} onChange={e => setWinnerTeam(e.target.value)} placeholder="Komanda" />
          <ModalActions>
            <Ghost onClick={() => setFinishId(null)}>Atšaukti</Ghost>
            <Primary onClick={confirmFinish}>Patvirtinti</Primary>
          </ModalActions>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Ištrinti turnyrą?"
        confirmText="Ištrinti"
        danger
      >
        <p>Ar tikrai norite <strong>negrįžtamai</strong> ištrinti šį turnyrą?</p>
      </ConfirmModal>
    </Section>
  );
}

/* ===================== Games ===================== */
function AdminGames() {
  const toast = useToast();
  const [tournaments, setTournaments] = useState([]);
  const [tid, setTid] = useState("");
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);

  // create form
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [tipoff, setTipoff] = useState(""); // "YYYY-MM-DDTHH:mm"
  const [stage, setStage] = useState("group");

  // inline edit state
  const [editId, setEditId] = useState(null);
  const [eTeamA, setETeamA] = useState("");
  const [eTeamB, setETeamB] = useState("");
  const [eTipoff, setETipoff] = useState(""); // "YYYY-MM-DDTHH:mm"
  const [expandedRows, setExpandedRows] = useState(new Set()); // Set<number>
  const [guessesByGame, setGuessesByGame] = useState({}); // { [gameId]: { loading: bool, items: Guess[] } }

  // modals
  const [finishGameId, setFinishGameId] = useState(null);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");
  const [deleteGameId, setDeleteGameId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api(`/api/admin/tournaments`);
        setTournaments(data.tournaments || []);
        if (data.tournaments?.[0]) setTid(String(data.tournaments[0].id));
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const selected = useMemo(() => tournaments.find(t => String(t.id) === String(tid)) || null, [tournaments, tid]);

  async function loadGames() {
    if (!tid) return setGames([]);
    try {
      setLoading(true);
      const d = await api(`/api/admin/tournaments/${tid}/games`);
      setGames(d.games || []);
    } catch (e) {
      toast.error(e.message || "Nepavyko užkrauti rungtynių");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGames();
  }, [tid]); // eslint-disable-line

  async function createGame() {
    if (!tid || !teamA || !teamB || !tipoff) return toast.error("Užpildykite laukus");
    const sqlTs = tipoffToSQL(tipoff);
    try {
      await api(`/api/admin/games`, {
        method: "POST",
        json: {
          tournament_id: Number(tid),
          team_a: teamA,
          team_b: teamB,
          tipoff_at: sqlTs,
          stage,
        },
      });
      setTeamA("");
      setTeamB("");
      setTipoff("");
      setStage("group");
      toast.success("Rungtynės sukurtos");
      loadGames();
    } catch (e) {
      toast.error(e.message || "Nepavyko sukurti");
    }
  }

  async function setStatus(id, status) {
    try {
      await api(`/api/admin/games/${id}`, { method: "PATCH", json: { status } });
      toast.success("Būsena atnaujinta");
      loadGames();
    } catch (e) {
      toast.error(e.message || "Klaida");
    }
  }

  async function updateStage(id, newStage) {
    try {
      await api(`/api/admin/games/${id}`, { method: "PATCH", json: { stage: newStage } });
      toast.success("Etapas atnaujintas");
      loadGames();
    } catch (e) {
      toast.error(e.message || "Nepavyko atnaujinti etapo");
    }
  }

  function openFinishGame(id) {
    setFinishGameId(id);
    setScoreA("");
    setScoreB("");
  }

  async function confirmFinishGame() {
    if (!finishGameId) return;
    const a = Number(scoreA);
    const b = Number(scoreB);
    if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) {
      return toast.error("Neteisingi taškai");
    }
    try {
      await api(`/api/admin/games/${finishGameId}/finish`, {
        method: "POST",
        json: { score_a: a, score_b: b },
      });
      toast.success("Užskaityta ir įvertinta");
      setFinishGameId(null);
      setScoreA("");
      setScoreB("");
      loadGames();
    } catch (e) {
      toast.error(e.message || "Nepavyko užbaigti");
    }
  }

  async function del(id) {
    setDeleteGameId(id); // open confirm modal
  }

  async function confirmDeleteGame() {
    try {
      await api(`/api/admin/games/${deleteGameId}`, { method: "DELETE" });
      toast.success("Ištrinta");
      setDeleteGameId(null);
      loadGames();
    } catch (e) {
      toast.error(e.message || "Nepavyko ištrinti");
    }
  }

  // ---- inline edit handlers ----
  function startEdit(g) {
    if (g.status === "finished") return;
    setEditId(g.id);
    setETeamA(g.team_a || "");
    setETeamB(g.team_b || "");
    setETipoff(sqlToLocalInput(g.tipoff_at));
  }
  function cancelEdit() {
    setEditId(null);
    setETeamA("");
    setETeamB("");
    setETipoff("");
  }
  async function saveEdit(id) {
    if (!eTeamA || !eTeamB || !eTipoff) return toast.error("Užpildykite laukus");
    const sqlTs = tipoffToSQL(eTipoff);
    try {
      await api(`/api/admin/games/${id}`, {
        method: "PATCH",
        json: { team_a: eTeamA, team_b: eTeamB, tipoff_at: sqlTs },
      });
      toast.success("Rungtynės atnaujintos");
      cancelEdit();
      loadGames();
    } catch (e) {
      toast.error(e.message || "Nepavyko atnaujinti");
    }
  }

  function toggleExpand(gameId) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(gameId)) next.delete(gameId);
      else next.add(gameId);
      return next;
    });
    if (!guessesByGame[gameId]) loadGuesses(gameId);
  }

  async function loadGuesses(gameId) {
    setGuessesByGame(prev => ({ ...prev, [gameId]: { loading: true, items: prev[gameId]?.items || [] } }));
    try {
      const d = await api(`/api/admin/games/${gameId}/guesses`);
      setGuessesByGame(prev => ({ ...prev, [gameId]: { loading: false, items: d.guesses || [] } }));
    } catch (e) {
      toast.error(e.message || "Nepavyko užkrauti spėjimų");
      setGuessesByGame(prev => ({ ...prev, [gameId]: { loading: false, items: prev[gameId]?.items || [] } }));
    }
  }

  async function deleteGuess(guessId, gameId, isFinished) {
    if (isFinished) return; // safeguard: no deletes after finished
    setDeleteGameId(null); // not related, just ensure stale state not shown
    // keep per-row delete for guesses (no confirm needed as per your previous UX)
    try {
      await api(`/api/admin/guesses/${guessId}`, { method: "DELETE" });
      loadGuesses(gameId);
    } catch (e) {
      toast.error(e.message || "Nepavyko ištrinti spėjimo");
    }
  }

  // Guess condition text with bolding
  function guessConditionText(game, guess) {
    const { team_a, team_b, status } = game;
    const { guess_a, guess_b, cond_ok, diff_ok, exact_ok, awarded_points } = guess;

    const winner = guess_a > guess_b ? team_a : guess_b > guess_a ? team_b : "Lygiosios";
    const diff = Math.abs(guess_a - guess_b);
    const band = diff > 5 ? "> 5" : diff === 5 ? "= 5" : "< 5";

    const finished = status === "finished";
    const b = (content, on) => (on ? <strong>{content}</strong> : content);

    const firstPart = `${winner} ${band}`;
    const middlePart = `[${diff} pt.]`;
    const finalPart = `(${guess_a}–${guess_b})`;

    return (
      <>
        {b(firstPart, finished && cond_ok)}{" "}
        {b(middlePart, finished && diff_ok)}{" "}
        {b(finalPart, finished && exact_ok)}
        {finished && awarded_points != null ? <span style={{ color: "#64748b" }}> [{awarded_points}p]</span> : null}
      </>
    );
  }

  return (
    <Section>
      <Flex>
        <Select value={tid} onChange={e => setTid(e.target.value)}>
          {tournaments.map(t => (
            <option key={t.id} value={t.id}>
              #{t.id} — {t.name} ({t.start_date}–{t.end_date})
            </option>
          ))}
        </Select>
      </Flex>

      <BlockTitle>Naujos rungtynės</BlockTitle>
      <Flex>
        <Input value={teamA} onChange={e => setTeamA(e.target.value)} placeholder="Komanda A" />
        <Input value={teamB} onChange={e => setTeamB(e.target.value)} placeholder="Komanda B" />
        <Input
          type="datetime-local"
          value={tipoff}
          onChange={e => setTipoff(e.target.value)}
          title="Pasirinkite vietinį laiką (saugomas tiesiogiai DB)"
        />
        <Select value={stage} onChange={e => setStage(e.target.value)}>
          <option value="group">Group</option>
          <option value="playoff">Playoff</option>
        </Select>
        <Primary onClick={createGame}>Sukurti</Primary>
      </Flex>

      <Divider />

      <BlockTitle>Rungtynės {selected ? `— ${selected.name}` : ""}</BlockTitle>

      {loading ? (
        <p style={{ color: "#6b7280" }}>Kraunama…</p>
      ) : (
        <TableCard>
          <Table>
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                <th>ID</th>
                <th>Komandos</th>
                <th>Pradžia</th>
                <th>Statusas</th>
                <th>Rez.</th>
                <th>Sąlyga</th>
                <th>Etapas</th>
                <th style={{ textAlign: "right" }}>Veiksmai</th>
              </tr>
            </thead>
            <tbody>
              {games.map(g => {
                const isEditing = editId === g.id && g.status !== "finished";
                return (
                  <React.Fragment key={`row-${g.id}`}>
                    <tr style={{
  backgroundColor:
    g.status === "scheduled" ? "#ecfdf5" :   // light green
    g.status === "locked" ? "#fefce8" :      // light yellow
    g.status === "finished" ? "#f9fafb" : "" // light gray
}}>
                      <td>
                        <IconButton
                          onClick={() => toggleExpand(g.id)}
                          aria-label={expandedRows.has(g.id) ? "Slėpti spėjimus" : "Rodyti spėjimus"}
                        >
                          {expandedRows.has(g.id) ? "▾" : "▸"}
                        </IconButton>
                      </td>
                      <td>{g.id}</td>

                      {/* Teams */}
                      <td>
                        {isEditing ? (
                          <div style={{ display: "grid", gap: 6 }}>
                            <InputSmall value={eTeamA} onChange={e => setETeamA(e.target.value)} placeholder="Komanda A" />
                            <InputSmall value={eTeamB} onChange={e => setETeamB(e.target.value)} placeholder="Komanda B" />
                          </div>
                        ) : (
                          `${g.team_a} — ${g.team_b}`
                        )}
                      </td>

                      {/* Tipoff */}
                      <td>
                        {isEditing ? (
                          <InputSmall type="datetime-local" value={eTipoff} onChange={e => setETipoff(e.target.value)} />
                        ) : (
                          fmt(g.tipoff_at)
                        )}
                      </td>

                      {/* Status */}
                      <td>{g.status}</td>

                      {/* Score */}
                      <td>
                        {g.score_a == null ? "—" : g.score_a} : {g.score_b == null ? "—" : g.score_b}
                      </td>

                      {/* Condition */}
                      <td>{conditionText(g)}</td>

                      {/* Stage */}
                      <td>
                        {g.status === "finished" ? (
                          g.stage || "group"
                        ) : isEditing ? (
                          <span style={{ color: "#64748b" }}>{g.stage || "group"}</span>
                        ) : (
                          <SelectSmall value={g.stage || "group"} onChange={e => updateStage(g.id, e.target.value)}>
                            <option value="group">group</option>
                            <option value="playoff">playoff</option>
                          </SelectSmall>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        {g.status !== "finished" && (isEditing ? (
                          <>
                            <Primary onClick={() => saveEdit(g.id)}>Išsaugoti</Primary>{" "}
                            <Ghost onClick={cancelEdit}>Atšaukti</Ghost>{" "}
                          </>
                        ) : (
                          <>
                            <Ghost onClick={() => startEdit(g)}>Redaguoti</Ghost>{" "}
                            <Ghost onClick={() => setStatus(g.id, "scheduled")}>Į „scheduled“</Ghost>{" "}
                            <Ghost onClick={() => setStatus(g.id, "locked")}>Užrakinti</Ghost>{" "}
                            <Primary onClick={() => openFinishGame(g.id)}>Užbaigti</Primary>{" "}
                          </>
                        ))}
                        <Danger onClick={() => del(g.id)}>Trinti</Danger>
                      </td>
                    </tr>

                    {expandedRows.has(g.id) && (
                      <tr key={`${g.id}-guesses`}>
                        <td colSpan={9} style={{ background: "#f9fafb", padding: 0 }}>
                          <div style={{ padding: "10px 8px", display: "grid", gap: 8 }}>
                            <div style={{ fontWeight: 800 }}>Spėjimai</div>

                            {(!guessesByGame[g.id] || guessesByGame[g.id]?.loading) && (
                              <div style={{ color: "#64748b" }}>Kraunama…</div>
                            )}

                            {guessesByGame[g.id] && !guessesByGame[g.id].loading && (guessesByGame[g.id].items.length ? (
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                                <thead>
                                  <tr>
                                    <th style={{ textAlign: "left", borderBottom: "1px solid #eef2f7", padding: "6px" }}>
                                      Vartotojas
                                    </th>
                                    <th style={{ textAlign: "left", borderBottom: "1px solid #eef2f7", padding: "6px" }}>
                                      Sąlyga
                                    </th>
                                    <th style={{ textAlign: "left", borderBottom: "1px solid #eef2f7", padding: "6px" }}>
                                      Veiksmai
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {guessesByGame[g.id].items.map(gu => (
                                    <tr key={gu.id}>
                                      <td style={{ borderBottom: "1px solid #eef2f7", padding: "6px" }}>
                                        {gu.user_name || gu.username || gu.email || `#${gu.user_id}`}
                                      </td>
                                      <td style={{ borderBottom: "1px solid #eef2f7", padding: "6px" }}>
                                        {guessConditionText(g, gu)}
                                      </td>
                                      <td style={{ borderBottom: "1px solid #eef2f7", padding: "6px" }}>
                                        {g.status === "finished" ? (
                                          <span style={{ color: "#64748b" }}>—</span>
                                        ) : (
                                          <GhostSmall onClick={() => deleteGuess(gu.id, g.id, g.status === "finished")}>
                                            Trinti
                                          </GhostSmall>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div style={{ color: "#64748b" }}>Spėjimų nėra</div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {!games.length && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", color: "#64748b", padding: 20 }}>
                    Nėra rungtynių
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </TableCard>
      )}

      {/* Finish game modal */}
      <Modal open={!!finishGameId} onClose={() => setFinishGameId(null)} title="Užbaigti rungtynes">
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, color: "#6b7280" }}>Komandos A taškai</label>
            <Input
              inputMode="numeric"
              value={scoreA}
              onChange={e => setScoreA(e.target.value)}
              placeholder="0"
            />
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            <label style={{ fontSize: 13, color: "#6b7280" }}>Komandos B taškai</label>
            <Input
              inputMode="numeric"
              value={scoreB}
              onChange={e => setScoreB(e.target.value)}
              placeholder="0"
            />
          </div>
          <ModalActions>
            <Ghost onClick={() => setFinishGameId(null)}>Atšaukti</Ghost>
            <Primary onClick={confirmFinishGame}>Patvirtinti</Primary>
          </ModalActions>
        </div>
      </Modal>

      {/* Delete game confirm */}
      <ConfirmModal
        open={!!deleteGameId}
        onClose={() => setDeleteGameId(null)}
        onConfirm={confirmDeleteGame}
        title="Ištrinti rungtynes?"
        confirmText="Ištrinti"
        danger
      >
        <p>Ar tikrai norite <strong>negrįžtamai</strong> ištrinti šias rungtynes?</p>
      </ConfirmModal>
    </Section>
  );
}

/* ===================== utils & styles ===================== */

// Show a human-friendly time without shifting it unintentionally.
// If value is "YYYY-MM-DD HH:mm:ss" (MySQL DATETIME), show "YYYY-MM-DD HH:mm" as-is.
// If it’s ISO, fall back to toLocaleString.
function fmt(d) {
  if (!d) return "";
  if (typeof d === "string" && d.includes(" ")) {
    // likely "YYYY-MM-DD HH:mm:ss"
    return d.slice(0, 16).replace("T", " ");
  }
  try {
    return new Date(d).toLocaleString("lt-LT", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(d);
  }
}

// Convert "YYYY-MM-DDTHH:mm" (from <input type="datetime-local">) to "YYYY-MM-DD HH:mm:00"
// Store exactly what admin picked (no timezone math).
function tipoffToSQL(input) {
  if (!input) return "";
  return input.replace("T", " ") + ":00";
}

// Convert DB "YYYY-MM-DD HH:mm:ss" to "YYYY-MM-DDTHH:mm" for <input type="datetime-local">, no timezone shift.
function sqlToLocalInput(value) {
  if (!value) return "";
  if (typeof value === "string") {
    // "YYYY-MM-DD HH:mm:ss" -> "YYYY-MM-DDTHH:mm"
    if (value.includes(" ")) return value.replace(" ", "T").slice(0, 16);
    // already ISO-like -> trim to minutes
    if (value.includes("T")) return value.slice(0, 16);
  }
  // Fallback: try to format a Date object without applying any extra logic
  try {
    const dt = new Date(value);
    const pad = n => String(n).padStart(2, "0");
    const yyyy = dt.getFullYear();
    const mm = pad(dt.getMonth() + 1);
    const dd = pad(dt.getDate());
    const hh = pad(dt.getHours());
    const mi = pad(dt.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  } catch {
    return "";
  }
}

function conditionText(g) {
  const { team_a, team_b, score_a, score_b } = g;
  if (score_a == null || score_b == null) return "—";

  const diff = Math.abs(score_a - score_b);
  const band = diff > 5 ? "> 5" : diff === 5 ? "= 5" : "< 5";

  if (score_a > score_b) {
    return `${team_a} ${band} [${diff} pt.] (${score_a}–${score_b})`;
  } else if (score_b > score_a) {
    return `${team_b} ${band} [${diff} pt.] (${score_a}–${score_b})`;
  } else {
    return `Lygiosios [${diff} pt.] (${score_a}–${score_b})`;
  }
}

/* ===================== Minimal UI kit (styled-components) ===================== */
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

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 30px;

  h1 {
    margin: 0;
    font-size: 30px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  p {
    margin: 4px 0 0;
    color: #6b7280;
    font-size: 14px;
  }
    @media (max-width: ${MOBILE_BP}px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
`;

const Small = styled.button`
  border:1px solid #e5e7eb;
  background:#fff;
  border-radius:6px;
  padding:2px 5px;
  cursor:pointer;
  color:${p=>p.$danger ? "#dc2626" : "#0f172a"};
  font-weight:600;
  font-size: 12px;
  height: 24px;
  line-height: 1.2;
`;

const TabRow = styled.div`
  display: inline-flex;
  padding: 4px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  gap: 20px;
  box-shadow: 0 1px 2px rgba(16,24,40,0.05);

  @media (max-width: ${MOBILE_BP}px) {
    display: flex;
    width: 100%;
    gap: 8px;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  @media (max-width: ${MOBILE_BP}px) and (pointer: coarse) {
    &::-webkit-scrollbar { display: none; }
  }
`;

const TabButton = styled.button`
  height: 28px;
  padding:3px 8px;
  border-radius:8px;
  border:1px solid #e5e7eb;
  cursor:pointer;
  background:${p=>p.$active ? "#e8f1ff" : "#fff"};
  color:${p=>p.$active ? "#1f6feb" : "#0f172a"};
  font-weight:700;
  font-size: 13px;
  line-height: 1.2;

  @media (max-width: ${MOBILE_BP}px) {
    flex: 0 0 auto;
    padding: 6px 10px;
    height: 34px;
    font-size: 10px;
  }
`;

const Card = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 16px;
  background: #fff;
  gap: 16px;
  box-shadow: 0 4px 10px rgba(17,24,39,0.06);

  @media (max-width: ${MOBILE_BP}px) {
    border-radius: 12px;
    padding: 12px;
    gap: 12px;
  }
`;

const Section = styled.div`
  display: grid;
  gap: 12px;
`;

const BlockTitle = styled.div`
  font-weight: 800;
  color: #0f172a;
  font-size: 16px;
`;

const Divider = styled.div`
  height: 1px;
  background: #eef2f7;
  margin: 6px 0;
`;

const TableCard = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
  max-width: 100%;
  background: #fff;
  box-shadow: 0 4px 10px rgba(17,24,39,0.04);

  @media (max-width: 610px) {
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }

  @media (max-width: ${MOBILE_BP}px) {
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

  thead th {
    text-align: left;
    font-weight: 800;
    color: #111827;
    background: #f9fafb;
    border-bottom: 1px solid #eef2f7;
    padding: 10px 10px;
  }

  tbody td {
    border-bottom: 1px solid #f2f4f8;
    padding: 10px 10px;
  }

  tbody tr:hover td {
    background: #fafcff;
  }

  @media (max-width: ${MOBILE_BP}px) {
    
    font-size: 13px;
    thead th, tbody td { padding: 8px 8px; }
  }
`;

const Flex = styled.div`
  display:flex; gap:8px; flex-wrap:wrap;
  min-width: 0;
  width: 100%;
  input, select {
    border:1px solid #e5e7eb;
    border-radius:8px;
    padding:3px 6px;
    height: 28px;
    font-size: 13px;
    line-height: 1.2;
  }
  button {
    padding:3px 8px;
    border-radius:8px;
    border:1px solid #e5e7eb;
    cursor:pointer;
    font-weight:700;
    font-size: 13px;
    height: 28px;
    line-height: 1.2;
  }

  @media (max-width: ${MOBILE_BP}px) {
    gap: 10px;
    input, select, button {
      flex: 1 1 100%;
      height: 36px;
      font-size: 14px;
    }
  }
`;

const inputBase = `
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 12px;
  background: #fff;
  outline: none;
  font-size: 14px;
  transition: border-color .15s ease, box-shadow .15s ease;
  &:focus {
    border-color: #99b9ff;
    box-shadow: 0 0 0 4px rgba(31,111,235,.12);
  }
`;

const Input = styled.input`${inputBase};`;
const InputSmall = styled.input`
  ${inputBase};
  padding: 8px 10px;
  width: 100%;
  max-width: 220px;

  @media (max-width: ${MOBILE_BP}px) {
    max-width: 100%;
    height: 40px;
    font-size: 14px;
  }
`;
const SearchInput = styled(Input)`
  min-width: 260px;
`;
const Select = styled.select`
${inputBase};
min-width: 0;
`;
const SelectSmall = styled.select`
  ${inputBase};
  padding: 8px 10px;

  @media (max-width: ${MOBILE_BP}px) {
    height: 40px;
    font-size: 14px;
  }
`;

const buttonBase = `
  border: 0;
  border-radius: 10px;
  padding: 9px 12px;
  cursor: pointer;
  font-weight: 800;
  font-size: 13px;
  transition: transform .05s ease, box-shadow .15s ease, background .15s ease, color .15s ease;
  &:active { transform: translateY(1px) }
`;

const Primary = styled.button`
  ${buttonBase};
  background: #1f6feb;
  color: white;
  box-shadow: 0 2px 6px rgba(31,111,235,.25);
  &:hover { background: #195bcc }
  &:disabled { opacity: .6; cursor: not-allowed; box-shadow: none; }

  @media (max-width: ${MOBILE_BP}px) {
    height: 40px;
    font-size: 14px;
  }
`;

const Ghost = styled.button`
  ${buttonBase};
  background: #f3f6fc;
  color: #0f172a;
  &:hover { background: #e8eefb; }

  @media (max-width: ${MOBILE_BP}px) {
    height: 40px;
    font-size: 14px;
  }
`;

const GhostSmall = styled(Ghost)`
  padding: 6px 8px;
  border-radius: 8px;
`;

const Danger = styled.button`
  ${buttonBase};
  background: #fee2e2;
  color: #b91c1c;
  &:hover { background: #fde3e3; }

  @media (max-width: ${MOBILE_BP}px) {
    height: 40px;
    font-size: 14px;
  }
`;

const IconButton = styled.button`
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 8px;
  padding: 2px 6px;
  cursor: pointer;
  &:hover { background: #f3f6fc; }

  @media (max-width: ${MOBILE_BP}px) {
    padding: 6px 10px;
  }
`;

/* ===================== Modals ===================== */

const fadeIn = keyframes`
  from { opacity: 0 } to { opacity: 1 }
`;
const slideUp = keyframes`
  from { transform: translateY(12px); opacity: .98 }
  to { transform: translateY(0); opacity: 1 }
`;

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <ModalRoot role="dialog" aria-modal="true" onClick={onClose}>
      <ModalCard onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <h3>{title}</h3>
          <CloseX onClick={onClose} aria-label="Uždaryti">×</CloseX>
        </ModalHeader>
        <div>{children}</div>
      </ModalCard>
    </ModalRoot>
  );
}

function ConfirmModal({ open, onClose, onConfirm, title, confirmText = "Patvirtinti", danger, children }) {
  if (!open) return null;
  return (
    <ModalRoot role="dialog" aria-modal="true" onClick={onClose}>
      <ModalCard onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <h3>{title}</h3>
          <CloseX onClick={onClose} aria-label="Uždaryti">×</CloseX>
        </ModalHeader>
        <div style={{ display: "grid", gap: 12 }}>
          <div>{children}</div>
          <ModalActions>
            <Ghost onClick={onClose}>Atšaukti</Ghost>
            {danger ? <Danger onClick={onConfirm}>{confirmText}</Danger> : <Primary onClick={onConfirm}>{confirmText}</Primary>}
          </ModalActions>
        </div>
      </ModalCard>
    </ModalRoot>
  );
}

const ModalRoot = styled.div`
  position: fixed; inset: 0; display: grid; place-items: center;
  background: rgba(15, 23, 42, .45);
  animation: ${fadeIn} .12s ease;
  z-index: 1000;
`;

const ModalCard = styled.div`
  width: 100%; max-width: 460px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 14px;
  box-shadow: 0 16px 40px rgba(2,6,23,.2);
  animation: ${slideUp} .16s ease;
  display: grid; gap: 12px;

  @media (max-width: ${MOBILE_BP}px) {
    max-width: 92vw;
    padding: 12px;
    border-radius: 12px;
    gap: 10px;
  }
`;

const ModalHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  h3 { margin: 0; font-size: 16px; font-weight: 900; }
`;

const CloseX = styled.button`
  border: 0; background: transparent; font-size: 22px; line-height: 1; cursor: pointer;
  color: #64748b;
  &:hover { color: #0f172a; }
`;

const ModalActions = styled.div`
  display: flex; gap: 8px; justify-content: flex-end;
`;