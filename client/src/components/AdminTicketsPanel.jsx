// src/components/AdminTicketsPanel.jsx
import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { api } from "../lib/api";
import { useToast } from "./ToastProvider";
import { getAuth } from "../store/auth";

const MOBILE = 610;
const ltState = s => (s === "open" ? "ATIDARYTA" : s === "accepted" ? "PRIIMTA" : "UZDARYTA");
const stateColor = s => (s === "open" ? "#16a34a" : s === "accepted" ? "#eab308" : "#dc2626");
const fmt = (d) => {
  if (!d) return "";
  if (typeof d === "string" && d.includes(" ")) return d.slice(0,16).replace("T"," ");
  try { return new Date(d).toLocaleString("lt-LT",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});}
  catch { return String(d); }
};

export default function AdminTicketsPanel() {
  const toast = useToast();
  const { user } = getAuth() || {};
  const [filter, setFilter] = useState("open"); // open | accepted | closed | all
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedId, setSelectedId] = useState(null);
  const [meta, setMeta] = useState(null);
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  const canReply = !!selectedId && meta?.state !== "closed";

  async function loadList() {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (["open","accepted","closed"].includes(filter)) q.set("state", filter);
      const d = await api(`/api/admin/tickets?${q.toString()}`);
      setList(d.tickets || []);
    } catch (e) { toast.error(e?.message || "Nepavyko užkrauti bilietų"); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ loadList(); },[filter]); // eslint-disable-line

  async function loadDetail(id) {
    setSelectedId(id);
    try {
      const d = await api(`/api/admin/tickets/${id}`);
      setMeta(d.ticket);
      setMessages(d.messages || []);
    } catch (e) {
      toast.error(e?.message || "Nepavyko užkrauti detalių");
      setSelectedId(null);
      setMeta(null);
      setMessages([]);
    }
  }

  async function sendMessage(text) {
    if (!selectedId) return;
    const content = String(text || msg || "").trim();
    if (!content) return;
    try {
      setSending(true);
      await api(`/api/admin/tickets/${selectedId}/messages`, { method:"POST", json:{ content } });
      setMsg("");
      await Promise.all([loadDetail(selectedId), loadList()]);
    } catch (e) { toast.error(e?.message || "Nepavyko išsiųsti"); }
    finally { setSending(false); }
  }

  async function acceptTicket() {
    // accepting = sending a short admin message (endpoint auto-assigns & sets 'accepted')
    await sendMessage("Priimta");
  }

  async function closeTicket() {
    if (!selectedId) return;
    try {
      await api(`/api/admin/tickets/${selectedId}/close`, { method:"PATCH" });
      toast.success("Uždaryta");
      await Promise.all([loadDetail(selectedId), loadList()]);
    } catch (e) { toast.error(e?.message || "Nepavyko uždaryti"); }
  }

  async function deleteTicket(id) {
    try {
      await api(`/api/admin/tickets/${id}`, { method:"DELETE" });
      toast.success("Ištrinta");
      if (selectedId === id) { setSelectedId(null); setMeta(null); setMessages([]); }
      await loadList();
    } catch (e) { toast.error(e?.message || "Nepavyko ištrinti"); }
  }

  const selectedRow = useMemo(()=> list.find(t => t.id === selectedId) || null, [list, selectedId]);

  return (
    <Wrap>
      <Header>
        <BlockTitle>Bilietai</BlockTitle>
        <Filters>
          <Select value={filter} onChange={(e)=>setFilter(e.target.value)}>
            <option value="open">open</option>
            <option value="accepted">accepted</option>
            <option value="closed">closed</option>
            <option value="all">all</option>
          </Select>
        </Filters>
      </Header>

      <Grid>
        <TableCard>
          <Table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Pavadinimas</th>
                <th>Vartotojas</th>
                <th>Priskirtas adminas</th>
                <th>Būsena</th>
                <th>Sukurta</th>
                <th>Veiksmai</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7}><Muted>Kraunama…</Muted></td></tr>
              ) : list.length ? (
                list.map(t => (
                  <Tr key={t.id} $selected={t.id===selectedId}>
                    <td>#{t.id}</td>
                    <td><RowLink onClick={()=>loadDetail(t.id)}>{t.title}</RowLink></td>
                    <td>{t.user_name || "—"}</td>
                    <td>{t.admin_name || "—"}</td>
                    <td><State $bg={stateColor(t.state)}>{ltState(t.state)}</State></td>
                    <td>{fmt(t.created_at)}</td>
                    <td>
                      <Actions>
                        <Ghost onClick={()=>loadDetail(t.id)}>Atidaryti</Ghost>
                        <Danger onClick={()=>deleteTicket(t.id)}>Trinti</Danger>
                      </Actions>
                    </td>
                  </Tr>
                ))
              ) : (
                <tr><td colSpan={7}><Muted>Nėra bilietų</Muted></td></tr>
              )}
            </tbody>
          </Table>
        </TableCard>

        <Detail>
          <BlockTitle>Detalės</BlockTitle>
          <DetailCard>
            {!selectedId || !meta ? (
              <Muted>Pasirinkite bilietą kairėje.</Muted>
            ) : (
              <>
                <MetaBar>
                  <div>
                    <Title>{meta.title}</Title>
                    <MetaLine>#{meta.id} • {meta.user_name} • sukurta {fmt(meta.created_at)}</MetaLine>
                  </div>
                  <State $bg={stateColor(meta.state)}>{ltState(meta.state)}</State>
                </MetaBar>

                <Divider />

                <Msgs>
                  {messages.map(m => (
                    <Msg key={m.id}>
                      <MsgHead>
                        <strong>{m.username}</strong>
                        <Time>{fmt(m.created_at)}</Time>
                        {m.sender_role === "admin" && <RoleBadge>ADMIN</RoleBadge>}
                      </MsgHead>
                      <MsgBody>{m.content}</MsgBody>
                    </Msg>
                  ))}
                  {!messages.length && <Muted>Žinučių nėra</Muted>}
                </Msgs>

                <Divider />

                <ActionsRow>
                  {meta.state !== "closed" ? (
                    <>
                      <Ghost onClick={acceptTicket}>Priimti</Ghost>
                      <Primary onClick={closeTicket}>Uždaryti</Primary>
                    </>
                  ) : (
                    <Muted>Uždaryta</Muted>
                  )}
                </ActionsRow>

                {meta.state !== "closed" && (
                  <>
                    <Composer>
                      <TextArea value={msg} onChange={(e)=>setMsg(e.target.value)} placeholder="Atsakykite vartotojui…" maxLength={2000}/>
                      <Primary disabled={!msg.trim() || sending} onClick={()=>sendMessage()}>{sending ? "Siunčiama…" : "Siųsti"}</Primary>
                    </Composer>
                  </>
                )}
              </>
            )}
          </DetailCard>
        </Detail>
      </Grid>
    </Wrap>
  );
}

/* ===== styled ===== */
const Wrap = styled.div`display:grid; gap:12px;`;
const Header = styled.div`display:flex; align-items:center; justify-content:space-between;`;
const Filters = styled.div`display:flex; gap:8px;`;
const Grid = styled.div`
  display:grid; grid-template-columns:1.4fr 1fr; gap:12px;
  @media (max-width:${MOBILE}px){ grid-template-columns:1fr; }
`;
const TableCard = styled.div`
  border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; background:#fff; box-shadow:0 4px 10px rgba(17,24,39,.04);
`;
const Detail = styled.div`display:grid; gap:8px;`;
const DetailCard = styled.div`
  border:1px solid #e5e7eb; border-radius:12px; background:#fff; padding:12px; box-shadow:0 4px 10px rgba(17,24,39,.04);
  display:grid; gap:10px;
`;

const BlockTitle = styled.div`font-weight:800; color:#0f172a; font-size:16px;`;
const Divider = styled.div`height:1px; background:#eef2f7;`;
const Muted = styled.div`color:#64748b; font-size:13px;`;

const Table = styled.table`
  width:100%; border-collapse:collapse; font-size:14px;
  thead th{ text-align:left; font-weight:800; color:#111827; background:#f9fafb; border-bottom:1px solid #eef2f7; padding:10px; }
  tbody td{ border-bottom:1px solid #f2f4f8; padding:10px; }
  tbody tr:hover td{ background:#fafcff; }
`;
const Tr = styled.tr`background:${p=>p.$selected ? "#f1f5ff" : "transparent"};`;

const RowLink = styled.button`
  all: unset; cursor: pointer; color:#1f6feb; font-weight:700;
`;

const State = styled.span`
  display:inline-flex; align-items:center; height:24px; padding:0 10px; border-radius:999px; color:#fff; font-size:12px; font-weight:900;
  background:${p=>p.$bg || "#64748b"};
`;

const Actions = styled.div`display:flex; gap:8px;`;
const buttonBase = `
  border: 0; border-radius: 10px; padding: 8px 10px; cursor:pointer;
  font-weight:800; font-size:13px;
  transition: transform .05s ease, box-shadow .15s ease, background .15s ease, color .15s ease;
  &:active { transform: translateY(1px) }
`;
const Primary = styled.button`${buttonBase}; background:#1f6feb; color:#fff; box-shadow:0 2px 6px rgba(31,111,235,.25); &:hover{background:#195bcc};`;
const Ghost   = styled.button`${buttonBase}; background:#f3f6fc; color:#0f172a; &:hover{background:#e8eefb};`;
const Danger  = styled.button`${buttonBase}; background:#fee2e2; color:#b91c1c; &:hover{background:#fde3e3};`;

const MetaBar = styled.div`display:flex; align-items:center; justify-content:space-between; gap:12px;`;
const Title = styled.div`font-weight:900; font-size:16px;`;
const MetaLine = styled.div`color:#64748b; font-size:13px;`;

const Msgs = styled.div`display:grid; gap:8px;`;
const Msg = styled.div`border:1px solid #e5e7eb; border-radius:10px; padding:8px; background:#fff;`;
const MsgHead = styled.div`display:flex; align-items:center; gap:8px;`;
const Time = styled.span`color:#64748b; font-size:12px;`;
const RoleBadge = styled.span`background:#f1f5ff; color:#1f6feb; border:1px solid #dbe8ff; border-radius:999px; font-size:10px; font-weight:900; padding:3px 6px;`;
const MsgBody = styled.div`white-space:pre-wrap;`;

const ActionsRow = styled.div`display:flex; gap:8px;`;
const Composer = styled.div`display:grid; grid-template-columns:1fr auto; gap:8px; align-items:center;`;
const TextArea = styled.textarea`
  border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px; background:#fff; outline:none; font-size:14px; min-height:100px; resize:vertical;
  &:focus{ border-color:#99b9ff; box-shadow:0 0 0 4px rgba(31,111,235,.12); }
`;
const Select = styled.select`
  border:1px solid #e5e7eb; border-radius:8px; padding:6px 8px; height:32px; font-size:13px;
  background:#fff; outline:none;
  &:focus{ border-color:#99b9ff; box-shadow:0 0 0 4px rgba(31,111,235,.12); }
`;