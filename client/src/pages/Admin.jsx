import { useEffect, useMemo, useState } from "react";
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
                <Small danger onClick={() => del(t.id)}>Trinti</Small>
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

  // create/edit form
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");
  const [tipoff, setTipoff] = useState(""); // "YYYY-MM-DDTHH:mm" -> will convert

  useEffect(() => {
    (async () => {
      try {
        const data = await api(`/api/admin/tournaments`);
        setTournaments(data.tournaments || []);
        if (data.tournaments?.[0]) setTid(String(data.tournaments[0].id));
      } catch (e) {
        // do nothing; section still usable once user picks another
      }
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
    const iso = new Date(tipoff).toISOString().slice(0, 19).replace("T", " ");
    try {
      await api(`/api/admin/games`, {
        method: "POST",
        json: { tournament_id: Number(tid), team_a: teamA, team_b: teamB, tipoff_at: iso },
      });
      setTeamA(""); setTeamB(""); setTipoff("");
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
          title="UTC or your local — server expects a proper date string"
        />
        <button onClick={createGame}>Sukurti</button>
      </Flex>

      <Divider />

      <BlockTitle>Rungtynės {selected ? `— ${selected.name}` : ""}</BlockTitle>

      {loading ? <p>Kraunama…</p> : (
        <Table>
          <thead>
            <tr>
                <th>ID</th><th>Komandos</th><th>Pradžia</th><th>Statusas</th>
                <th>Rez.</th><th>Sąlyga</th><th>Veiksmai</th>
            </tr>
          </thead>
          <tbody>
            {games.map(g => (
                <tr key={g.id}>
                <td>{g.id}</td>
                <td>{g.team_a} — {g.team_b}</td>
                <td>{fmt(g.tipoff_at)}</td>
                <td>{g.status}{g.stage ? ` / ${g.stage}` : ""}</td>
                <td>{g.score_a == null ? "—" : g.score_a} : {g.score_b == null ? "—" : g.score_b}</td>
                <td>{conditionText(g)}</td>
                <td>
                    {g.status !== "finished" && (
                        <>
                        <Small onClick={() => setStatus(g.id, "scheduled")}>Į „scheduled“</Small>{" "}
                        <Small onClick={() => setStatus(g.id, "locked")}>Užrakinti</Small>{" "}
                        <Small onClick={() => finishGame(g.id)}>Užbaigti</Small>{" "}
                        </>
                    )}
                    <Small danger onClick={() => del(g.id)}>Trinti</Small>
                </td>
                </tr>
            ))}
            {!games.length && (
                <tr><td colSpan={7} style={{textAlign:"center", color:"#64748b"}}>Nėra rungtynių</td></tr>
            )}
           </tbody>
        </Table>
      )}
    </Section>
  );
}

/* ===================== utils & styles ===================== */
function fmt(d) {
  try {
    return new Date(d).toLocaleString();
  } catch { return d; }
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
    // Just in case of a tie (shouldn’t happen in basketball, but safe-guard):
    return `Lygiosios [${diff} pt.] (${score_a}–${score_b})`;
  }
}

const Wrap = styled.div` display: grid; gap: 14px; `;
const Header = styled.div`
  display:flex; align-items:baseline; gap:12px;
  h1{ margin:0; font-size:22px; }
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
  color:${p=>p.danger ? "#dc2626" : "#0f172a"}; font-weight:700; font-size:12px;
`;