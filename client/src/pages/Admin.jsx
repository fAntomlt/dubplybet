import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
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
        <h1>Admin</h1>
        <span>Valdymas: vartotojai, turnyrai ir rungtynės</span>
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
        <TabButton $active={tab === "users"} onClick={() => setTab("users")}>Vartotojai</TabButton>
        <TabButton $active={tab === "tournaments"} onClick={() => setTab("tournaments")}>Turnyrai</TabButton>
        <TabButton $active={tab === "games"} onClick={() => setTab("games")}>Rungtynės</TabButton>
      </TabRow>

      <Card>
        {tab === "users" && <AdminUsers />}
        {tab === "tournaments" && <AdminTournaments />}
        {tab === "games" && <AdminGames />}
      </Card>
    </>
  );
}

/* ===================== Users ===================== */
function AdminUsers() {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

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

  useEffect(() => { load(); /* initial */ }, []); // eslint-disable-line

  return (
    <Section>
      <Flex>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Paieška (el. paštas, vardas, Discord)…"
        />
        <button onClick={load} disabled={loading}>{loading ? "Kraunama…" : "Ieškoti"}</button>
      </Flex>

      <Table>
        <thead>
          <tr>
            <th>ID</th><th>El. paštas</th><th>Vardas</th><th>Discord</th>
            <th>Rolė</th><th>Patvirtintas</th><th>Sukurta</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(u => (
            <tr key={u.id}>
              <td>{u.id}</td>
              <td>{u.email}</td>
              <td>{u.username}</td>
              <td>{u.discord_username}</td>
              <td>{u.role}</td>
              <td>{u.email_verified ? "Taip" : "Ne"}</td>
              <td>{fmt(u.created_at)}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr><td colSpan={7} style={{textAlign:"center", color:"#64748b"}}>Nėra rezultatų</td></tr>
          )}
        </tbody>
      </Table>
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

  useEffect(() => { load(); }, []); // eslint-disable-line

  async function createTournament() {
    try {
      if (!name || !start || !end) return toast.error("Užpildykite laukus");
      await api(`/api/admin/tournaments`, {
        method: "POST",
        json: { name, start_date: start, end_date: end },
      });
      setName(""); setStart(""); setEnd("");
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

  async function finish(id) {
    const winner_team = prompt("Nugalėtojo komanda:");
    if (!winner_team) return;
    try {
      await api(`/api/admin/tournaments/${id}/finish`, { method: "POST", json: { winner_team } });
      toast.success("Turnyras užbaigtas");
      load();
    } catch (e) {
      toast.error(e.message || "Nepavyko užbaigti");
    }
  }

  async function del(id) {
    if (!confirm("Ištrinti turnyrą?")) return;
    try {
      await api(`/api/admin/tournaments/${id}`, { method: "DELETE" });
      toast.success("Ištrinta");
      load();
    } catch (e) {
      toast.error(e.message || "Nepavyko ištrinti");
    }
  }

  return (
    <Section>
      <BlockTitle>Naujas turnyras</BlockTitle>
      <Flex>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Pavadinimas" />
        <input type="date" value={start} onChange={e => setStart(e.target.value)} />
        <input type="date" value={end} onChange={e => setEnd(e.target.value)} />
        <button onClick={createTournament}>Sukurti</button>
      </Flex>

      <Divider />

      <BlockTitle>Turnyrai</BlockTitle>
      <Table>
        <thead>
          <tr>
            <th>ID</th><th>Pavadinimas</th><th>Data</th><th>Statusas</th><th>Laimėtojas</th><th>Veiksmai</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(t => (
            <tr key={t.id}>
              <td>{t.id}</td>
              <td>{t.name}</td>
              <td>{t.start_date} – {t.end_date}</td>
              <td>{t.status}</td>
              <td>{t.winner_team || "—"}</td>
              <td>
                <Small onClick={() => setStatus(t.id, "draft")}>Į „draft“</Small>{" "}
                <Small onClick={() => setStatus(t.id, "active")}>Aktyvus</Small>{" "}
                <Small onClick={() => finish(t.id)}>Užbaigti</Small>{" "}
                <Small $danger onClick={() => del(t.id)}>Trinti</Small>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr><td colSpan={6} style={{textAlign:"center", color:"#64748b"}}>Nėra duomenų</td></tr>
          )}
        </tbody>
      </Table>
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

  useEffect(() => {
    (async () => {
      try {
        const data = await api(`/api/admin/tournaments`);
        setTournaments(data.tournaments || []);
        if (data.tournaments?.[0]) setTid(String(data.tournaments[0].id));
      } catch { /* ignore */ }
    })();
  }, []);

  const selected = useMemo(
    () => tournaments.find(t => String(t.id) === String(tid)) || null,
    [tournaments, tid]
  );

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

  useEffect(() => { loadGames(); }, [tid]); // eslint-disable-line

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
      setTeamA(""); setTeamB(""); setTipoff(""); setStage("group");
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

  async function finishGame(id) {
    const scoreA = prompt("Komandos A taškai:");
    if (scoreA == null) return;
    const scoreB = prompt("Komandos B taškai:");
    if (scoreB == null) return;
    try {
      await api(`/api/admin/games/${id}/finish`, {
        method: "POST",
        json: { score_a: Number(scoreA), score_b: Number(scoreB) },
      });
      toast.success("Užskaityta ir įvertinta");
      loadGames();
    } catch (e) {
      toast.error(e.message || "Nepavyko užbaigti");
    }
  }

  async function del(id) {
    if (!confirm("Ištrinti rungtynes?")) return;
    try {
      await api(`/api/admin/games/${id}`, { method: "DELETE" });
      toast.success("Ištrinta");
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
    setETeamA(""); setETeamB(""); setETipoff("");
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
    if (!confirm("Ištrinti šį spėjimą?")) return;
    try {
      await api(`/api/admin/guesses/${guessId}`, { method: "DELETE" });
      loadGuesses(gameId);
    } catch (e) {
      toast.error(e.message || "Nepavyko ištrinti spėjimo");
    }
  }

  // Build condition text for a guess. If the game is finished and flags are present,
  // bold only the qualified parts (winner/direction and margin band). Exact score not bolded.
  // Build condition text for a guess. Middle shows the *guessed point difference*.
// When finished, we bold winner+band if cond_ok and the margin bracket if diff_ok.
// Shows: "<Winner> <band> [<margin> pt.] (<A>–<B>)"
// Bold parts that are correct once the game is finished:
// - cond_ok  -> winner+band
// - diff_ok  -> margin bracket
// - exact_ok -> exact score
function guessConditionText(game, guess) {
  const { team_a, team_b, status } = game;
  const { guess_a, guess_b, cond_ok, diff_ok, exact_ok, awarded_points } = guess;

  const winner =
    guess_a > guess_b ? team_a :
    guess_b > guess_a ? team_b : "Lygiosios";

  const diff = Math.abs(guess_a - guess_b);
  const band = diff > 5 ? "> 5" : diff === 5 ? "= 5" : "< 5";

  const finished = status === "finished";
  const b = (content, on) => (on ? <strong>{content}</strong> : content);

  const firstPart  = `${winner} ${band}`;
  const middlePart = `[${diff} pt.]`;
  const finalPart  = `(${guess_a}–${guess_b})`;

  return (
    <>
      {b(firstPart,  finished && cond_ok)}{" "}
      {b(middlePart, finished && diff_ok)}{" "}
      {b(finalPart,  finished && exact_ok)}
      {/* Optional: show awarded points after finish */}
      {finished && awarded_points != null ? (
        <span style={{ color:"#64748b" }}> [{awarded_points}p]</span>
      ) : null}
    </>
  );
}

  return (
    <Section>
      <Flex>
        <select value={tid} onChange={e => setTid(e.target.value)}>
          {tournaments.map(t => (
            <option key={t.id} value={t.id}>
              #{t.id} — {t.name} ({t.start_date}–{t.end_date})
            </option>
          ))}
        </select>
      </Flex>

      <BlockTitle>Naujos rungtynės</BlockTitle>
      <Flex>
        <input value={teamA} onChange={e => setTeamA(e.target.value)} placeholder="Komanda A" />
        <input value={teamB} onChange={e => setTeamB(e.target.value)} placeholder="Komanda B" />
        <input
          type="datetime-local"
          value={tipoff}
          onChange={e => setTipoff(e.target.value)}
          title="Pasirinkite vietinį laiką (saugomas tiesiogiai DB)"
        />
        <select value={stage} onChange={e => setStage(e.target.value)}>
          <option value="group">Group</option>
          <option value="playoff">Playoff</option>
        </select>
        <button onClick={createGame}>Sukurti</button>
      </Flex>

      <Divider />

      <BlockTitle>Rungtynės {selected ? `— ${selected.name}` : ""}</BlockTitle>

      {loading ? <p>Kraunama…</p> : (
        <Table>
          <thead>
            <tr>
              <th style={{width:36}}></th>
              <th>ID</th><th>Komandos</th><th>Pradžia</th><th>Statusas</th>
              <th>Rez.</th><th>Sąlyga</th><th>Etapas</th><th>Veiksmai</th>
            </tr>
          </thead>
          <tbody>
            {games.map(g => {
              const isEditing = editId === g.id && g.status !== "finished";
              return (
                <React.Fragment key={`row-${g.id}`}>
                  <tr>
                    <td>
                      <button
                        onClick={() => toggleExpand(g.id)}
                        aria-label={expandedRows.has(g.id) ? "Slėpti spėjimus" : "Rodyti spėjimus"}
                        style={{ border:"1px solid #e5e7eb", borderRadius:8, padding:"2px 6px", background:"#fff", cursor:"pointer" }}
                      >
                        {expandedRows.has(g.id) ? "▾" : "▸"}
                      </button>
                    </td>
                    <td>{g.id}</td>

                    {/* Teams */}
                    <td>
                      {isEditing ? (
                        <div style={{display:"grid", gap:6}}>
                          <input value={eTeamA} onChange={e=>setETeamA(e.target.value)} placeholder="Komanda A" />
                          <input value={eTeamB} onChange={e=>setETeamB(e.target.value)} placeholder="Komanda B" />
                        </div>
                      ) : (
                        `${g.team_a} — ${g.team_b}`
                      )}
                    </td>

                    {/* Tipoff */}
                    <td>
                      {isEditing ? (
                        <input
                          type="datetime-local"
                          value={eTipoff}
                          onChange={e=>setETipoff(e.target.value)}
                        />
                      ) : (
                        fmt(g.tipoff_at)
                      )}
                    </td>

                    {/* Status */}
                    <td>{g.status}</td>

                    {/* Score */}
                    <td>{g.score_a == null ? "—" : g.score_a} : {g.score_b == null ? "—" : g.score_b}</td>

                    {/* Condition */}
                    <td>{conditionText(g)}</td>

                    {/* Stage */}
                    <td>
                      {g.status === "finished" ? (
                        g.stage || "group"
                      ) : isEditing ? (
                        <span style={{color:"#64748b"}}>{g.stage || "group"}</span>
                      ) : (
                        <select
                          value={g.stage || "group"}
                          onChange={(e) => updateStage(g.id, e.target.value)}
                        >
                          <option value="group">group</option>
                          <option value="playoff">playoff</option>
                        </select>
                      )}
                    </td>

                    {/* Actions */}
                    <td>
                      {g.status !== "finished" && (
                        isEditing ? (
                          <>
                            <Small onClick={() => saveEdit(g.id)}>Išsaugoti</Small>{" "}
                            <Small onClick={cancelEdit}>Atšaukti</Small>{" "}
                          </>
                        ) : (
                          <>
                            <Small onClick={() => startEdit(g)}>Redaguoti</Small>{" "}
                            <Small onClick={() => setStatus(g.id, "scheduled")}>Į „scheduled“</Small>{" "}
                            <Small onClick={() => setStatus(g.id, "locked")}>Užrakinti</Small>{" "}
                            <Small onClick={() => finishGame(g.id)}>Užbaigti</Small>{" "}
                          </>
                        )
                      )}
                      <Small $danger onClick={() => del(g.id)}>Trinti</Small>
                    </td>
                  </tr>

                  {expandedRows.has(g.id) && (
                    <tr key={`${g.id}-guesses`}>
                      <td colSpan={9} style={{ background:"#fafbff", padding:0 }}>
                        <div style={{ padding:"10px 8px", display:"grid", gap:8 }}>
                          <div style={{fontWeight:800}}>Spėjimai</div>

                          {(!guessesByGame[g.id] || guessesByGame[g.id]?.loading) && (
                            <div style={{color:"#64748b"}}>Kraunama…</div>
                          )}

                          {guessesByGame[g.id] && !guessesByGame[g.id].loading && (
                            guessesByGame[g.id].items.length ? (
                              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:14 }}>
                                <thead>
                                  <tr>
                                    <th style={{textAlign:"left", borderBottom:"1px solid #eef2f7", padding:"6px"}}>Vartotojas</th>
                                    <th style={{textAlign:"left", borderBottom:"1px solid #eef2f7", padding:"6px"}}>Sąlyga</th>
                                    <th style={{textAlign:"left", borderBottom:"1px solid #eef2f7", padding:"6px"}}>Veiksmai</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {guessesByGame[g.id].items.map(gu => (
                                    <tr key={gu.id}>
                                      <td style={{borderBottom:"1px solid #eef2f7", padding:"6px"}}>
                                        {gu.user_name || gu.username || gu.email || `#${gu.user_id}`}
                                      </td>
                                      <td style={{borderBottom:"1px solid #eef2f7", padding:"6px"}}>
                                        {guessConditionText(g, gu)}
                                      </td>
                                      <td style={{borderBottom:"1px solid #eef2f7", padding:"6px"}}>
                                        {g.status === "finished" ? (
                                          <span style={{ color:"#64748b" }}>—</span>
                                        ) : (
                                          <Small onClick={() => deleteGuess(gu.id, g.id, g.status === "finished")}>
                                            Trinti
                                          </Small>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <div style={{color:"#64748b"}}>Spėjimų nėra</div>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {!games.length && (
              <tr><td colSpan={9} style={{textAlign:"center", color:"#64748b"}}>Nėra rungtynių</td></tr>
            )}
          </tbody>
        </Table>
      )}
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
        minute: "2-digit"
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
    const pad = (n) => String(n).padStart(2, "0");
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

const Wrap = styled.div` 
  display: flex; 
  gap: 14px; 
  min-height: 100vh;
  flex-direction: column;
  justify-content: center;
`;
const Header = styled.div`
  display:flex; align-items:baseline; gap:12px;
  h1{ margin:0; font-size:30px; font-weight: 800}
  span{ color:#64748b; font-size:14px; }
`;
const TabRow = styled.div` display:flex; gap:8px; `;
const TabButton = styled.button`
  padding:8px 12px; border-radius:10px; border:1px solid #e5e7eb; cursor:pointer;
  background:${p=>p.$active ? "#e8f1ff" : "#fff"}; color:${p=>p.$active ? "#1f6feb" : "#0f172a"};
  font-weight:700;
`;
const Card = styled.div`
  border:1px solid #e5e7eb; border-radius:14px; padding:14px; background:#fff;
  display:grid; gap:12px;
`;
const Section = styled.div` display:grid; gap:12px; `;
const Flex = styled.div`
  display:flex; gap:8px; flex-wrap:wrap;
  input, select { border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; }
  button { padding:8px 12px; border-radius:10px; border:1px solid #e5e7eb; background:#fff; cursor:pointer; font-weight:700; }
`;
const BlockTitle = styled.div` font-weight:800; color:#0f172a; `;
const Divider = styled.div` height:1px; background:#e5e7eb; margin:4px 0; `;
const Table = styled.table`
  width:100%; border-collapse: collapse; font-size:14px;
  th, td { border-bottom:1px solid #eef2f7; padding:8px 6px; text-align:left; }
  thead th { font-weight:800; color:#0f172a; }
`;
const Small = styled.button`
  border:1px solid #e5e7eb; background:#fff; border-radius:8px; padding:6px 8px; cursor:pointer;
  color:${p=>p.$danger ? "#dc2626" : "#0f172a"}; font-weight:700; font-size:12px;
`;