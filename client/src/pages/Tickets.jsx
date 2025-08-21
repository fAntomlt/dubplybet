import { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/ToastProvider";
import { getAuth } from "../store/auth";
import { api } from "../lib/api";

function ltState(s) {
  return s === "open" ? "ATIDARYTA" : s === "accepted" ? "PRIIMTA" : "UZDARYTA";
}
function stateColor(s) {
  return s === "open" ? "#16a34a" : s === "accepted" ? "#eab308" : "#dc2626";
}

export default function Tickets() {
  useEffect(() => { document.title = "Ticketai – DuBPlyBET"; }, []);
  const [view, setView] = useState("create"); // "create" | "list" | "detail"
  const [selectedId, setSelectedId] = useState(null);

  return (
    <Wrap>
      <BigCard>
        <LeftCol>
          <Section>
            <SecTitle>SUKURTI TICKETĄ</SecTitle>
            <Primary onClick={() => { setView("create"); setSelectedId(null); }}>Pranešti</Primary>
          </Section>
          <Divider />
          <Section>
            <SecTitle>MANO TICKETAI</SecTitle>
            <Ghost onClick={() => { setView("list"); setSelectedId(null); }}>Peržiūrėti</Ghost>
          </Section>
        </LeftCol>

        <RightCol>
          {view === "create" && (
            <CreateTicket
              onCreated={(id) => { setSelectedId(id); setView("detail"); }}
              onCancel={() => setView("list")}
            />
          )}
          {view === "list" && (
            <MyTickets onOpen={(id) => { setSelectedId(id); setView("detail"); }} />
          )}
          {view === "detail" && selectedId && (
            <TicketDetail id={selectedId} onBack={() => setView("list")} />
          )}
        </RightCol>
      </BigCard>
    </Wrap>
  );
}

function CreateTicket({ onCreated }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [openConfirm, setOpenConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const valid = title.trim().length >= 3 && title.trim().length <= 50 && text.trim().length >= 3 && text.trim().length <= 2000;

  const submit = async () => {
    if (!valid) return;
    try {
      setSaving(true);
      const d = await api("/api/tickets", { method: "POST", json: { title: title.trim(), content: text.trim() } });
      toast.success("Ticketas sukurtas");
      onCreated?.(d.id);
    } catch (e) {
      toast.error(e?.message || "Nepavyko sukurti");
    } finally {
      setSaving(false);
      setOpenConfirm(false);
    }
  };

  return (
    <Pane>
      <PaneTitle>Naujas ticketas</PaneTitle>
      <Field>
        <Label>Pavadinimas <span>(3–50)</span></Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={50} placeholder="Trumpas pavadinimas" />
      </Field>
      <Field>
        <Label>Turinys <span>(3–2000)</span></Label>
        <TextArea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Aprašykite klaidą / idėją…" />
      </Field>
      <Row>
        <Primary disabled={!valid || saving} onClick={() => setOpenConfirm(true)}>{saving ? "Siunčiama…" : "Siųsti"}</Primary>
      </Row>

      <ConfirmModal
        open={openConfirm}
        title="Patvirtinti siuntimą?"
        onClose={() => setOpenConfirm(false)}
        onConfirm={submit}
      >
        <p>Ar tikrai norite išsiųsti šį ticketą?</p>
      </ConfirmModal>
    </Pane>
  );
}

function MyTickets({ onOpen }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const d = await api("/api/tickets/mine?state=all");
        setRows(d.tickets || []);
      } catch (e) {
        toast.error(e?.message || "Nepavyko užkrauti");
      } finally { setLoading(false); }
    })();
  }, []); // eslint-disable-line

  return (
    <Pane>
      <PaneTitle>MANO TICKETAI</PaneTitle>
      {loading ? <Muted>Kraunama…</Muted> : null}
      {!loading && !rows.length ? <Muted>Dar neturite ticketų</Muted> : null}

      {!!rows.length && (
        <Sheet role="list">
          {rows.map((r) => (
            <RowItem key={r.id} role="button" onClick={() => onOpen?.(r.id)}>
              <StateWrap>
                <Dot $color={stateColor(r.state)} />
                <StateName $color={stateColor(r.state)}>{ltState(r.state)}</StateName>
              </StateWrap>
              <TitleCell title={r.title}>{r.title}</TitleCell>
              <DateCell>{fmt(r.created_at)}</DateCell>
            </RowItem>
          ))}
        </Sheet>
      )}
    </Pane>
  );
}

export function TicketDetail({ id, onBack }) {
  const toast = useToast();
  const API = import.meta.env.VITE_API_URL;
  const { user } = getAuth() || {};

  const [meta, setMeta] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const isClosed = meta?.state === "closed";

  const load = async () => {
    try {
      const path = (user?.role === "admin") ? `/api/admin/tickets/${id}` : `/api/tickets/${id}`;
      const d = await api(path);
      setMeta(d.ticket);
      setMsgs(d.messages || []);
    } catch (e) {
      toast.error(e?.message || "Nepavyko užkrauti");
    }
  };

  useEffect(() => { load(); /* initial */ }, [id]); // eslint-disable-line

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    try {
      setSending(true);
      const path = (user?.role === "admin") ? `/api/admin/tickets/${id}/messages` : `/api/tickets/${id}/messages`;
      await api(path, { method: "POST", json: { content } });
      setText("");
      await load();
    } catch (e) {
      toast.error(e?.message || "Nepavyko išsiųsti");
    } finally { setSending(false); }
  };

  const closeTicket = async () => {
    try {
      await api(`/api/admin/tickets/${id}/close`, { method: "PATCH" });
      toast.success("Ticketas uždarytas");
      await load();
    } catch (e) { toast.error(e?.message || "Nepavyko uždaryti"); }
  };

  return (
    <Pane $detail>
      <TopBar>
        <BackBtn onClick={onBack}>← Atgal</BackBtn>
        <StatePill $bg={stateColor(meta?.state || "open")}>{ltState(meta?.state || "open")}</StatePill>
        <TicketTitle title={meta?.title || ""}>{meta?.title || ""}</TicketTitle>
        {user?.role === "admin" && meta && meta.state !== "closed" && (
          <Danger onClick={closeTicket}>UZDARYTI TICKETĄ</Danger>
        )}
      </TopBar>

      {/* messages */}
      <MsgList>
        {msgs.map(m => (
          <Msg key={m.id}>
            {m.avatar ? (
              <AvatarImg src={abs(API, m.avatar)} alt="" />
            ) : (
              <AvatarFallback>{initials(m.username)}</AvatarFallback>
            )}
            <MsgBody>
              <MsgHead>
                {m.sender_role === "admin" && <RoleBadge>ADMINISTRATORIUS</RoleBadge>}
                <strong>{m.username}</strong>
                <span className="time">{fmt(m.created_at)}</span>
              </MsgHead>
              <div className="text">{m.content}</div>
            </MsgBody>
          </Msg>
        ))}
      </MsgList>

      {/* composer */}
      {isClosed ? (
        <ClosedNote>
          ATSAKYTI I UZDARYTA TICKETA NEGALIMA. {user?.role !== "admin" && (
            <>ISKILUS PAPILDOMIEMS KLAUSIMAMS, <a onClick={(e) => e.preventDefault()} href="#" role="button" onMouseDown={(e)=>e.preventDefault()} onClickCapture={(e)=>e.preventDefault()}></a></>
          )}
          {user?.role !== "admin" && (
            <a href="/ticketai" onClick={(e)=>{ e.preventDefault(); window.history.pushState({}, "", "/ticketai"); window.dispatchEvent(new PopStateEvent("popstate")); }}>KURKITE NAUJĄ TICKETĄ</a>
          )}
        </ClosedNote>
      ) : (
        <Composer>
          <TextArea
            placeholder="Jūsų žinutė…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
          />
          <Primary disabled={!text.trim() || sending} onClick={send}>{sending ? "Siunčiama…" : "Siųsti"}</Primary>
        </Composer>
      )}
    </Pane>
  );
}

/* ===================== styled-components for Tickets.jsx ===================== */

const MOBILE_BP = 610;

const Wrap = styled.div`
  display: flex;
  justify-content: center;
  padding: 16px;
  width: 100%;
  box-sizing: border-box;
`;

const BigCard = styled.div`
  width: 100%;
  max-width: 1100px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  box-shadow: 0 4px 10px rgba(17,24,39,0.06);
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 0;
  overflow: hidden;

  @media (max-width: ${MOBILE_BP}px) {
    grid-template-columns: 1fr;
  }
`;

const LeftCol = styled.aside`
  border-right: 1px solid #eef2f7;
  padding: 16px;
  display: grid;
  gap: 12px;

  @media (max-width: ${MOBILE_BP}px) {
    border-right: 0;
    border-bottom: 1px solid #eef2f7;
  }
`;

const RightCol = styled.main`
  padding: 16px;
  min-width: 0;
`;

const Section = styled.div`
  display: grid;
  gap: 8px;
`;

const SecTitle = styled.div`
  font-weight: 900;
  font-size: 12px;
  letter-spacing: .06em;
  color: #64748b;
`;

const Divider = styled.div`
  height: 1px;
  background: #eef2f7;
`;

const buttonBase = `
  border: 0;
  border-radius: 10px;
  padding: 10px 12px;
  cursor: pointer;
  font-weight: 800;
  font-size: 13px;
  transition: transform .05s ease, box-shadow .15s ease, background .15s ease, color .15s ease;
  &:active { transform: translateY(1px) }
`;

const Primary = styled.button`
  ${buttonBase};
  background: #1f6feb;
  color: #fff;
  box-shadow: 0 2px 6px rgba(31,111,235,.25);
  &:hover { background: #195bcc; }
  &:disabled { opacity: .6; cursor: not-allowed; box-shadow: none; }
`;

const Ghost = styled.button`
  ${buttonBase};
  background: #f3f6fc;
  color: #0f172a;
  &:hover { background: #e8eefb; }
`;

const Danger = styled.button`
  ${buttonBase};
  background: #fee2e2;
  color: #b91c1c;
  &:hover { background: #fde3e3; }
`;

/* --- panes & forms --- */

const Pane = styled.div`
  display: grid;
  gap: 12px;

  ${p => p.$detail && `
    grid-template-rows: auto 1fr auto;
    min-height: 420px;
  `}
`;

const PaneTitle = styled.div`
  font-weight: 900;
  font-size: 16px;
  color: #0f172a;
`;

const Field = styled.label`
  display: grid;
  gap: 6px;
`;

const Label = styled.span`
  font-size: 13px;
  color: #6b7280;

  span { color: #94a3b8; font-weight: 600; }
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

const Input = styled.input`${inputBase}`;
const TextArea = styled.textarea`
  ${inputBase};
  min-height: 120px;
  resize: vertical;
`;

const Row = styled.div`
  display: flex;
  gap: 8px;
  justify-content: flex-end;
`;

const Muted = styled.div`
  color: #64748b;
  font-size: 13px;
`;

/* --- list (MyTickets) --- */

const Sheet = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;
`;

const RowItem = styled.div`
  display: grid;
  grid-template-columns: 160px 1fr 160px;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border-bottom: 1px solid #f2f4f8;
  cursor: pointer;
  &:hover { background: #fafcff; }

  &:last-child { border-bottom: 0; }

  @media (max-width: ${MOBILE_BP}px) {
    grid-template-columns: 1fr;
    gap: 6px;
    align-items: start;
  }
`;

const StateWrap = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
`;

const Dot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: ${p => p.$color || "#64748b"};
`;

const StateName = styled.span`
  font-size: 12px;
  font-weight: 800;
  color: ${p => p.$color || "#0f172a"};
`;

const TitleCell = styled.div`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 700;
`;

const DateCell = styled.div`
  justify-self: end;
  color: #64748b;
  font-size: 13px;

  @media (max-width: ${MOBILE_BP}px) {
    justify-self: start;
  }
`;

/* --- detail (TicketDetail) --- */

const TopBar = styled.div`
  display: grid;
  grid-template-columns: auto auto 1fr auto;
  gap: 10px;
  align-items: center;
`;

const BackBtn = styled.button`
  ${buttonBase};
  background: #f3f6fc;
  color: #0f172a;
  padding: 8px 10px;
  border-radius: 8px;
  height: 32px;
`;

const StatePill = styled.span`
  padding: 6px 10px;
  height: 32px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  color: #fff;
  background: ${p => p.$bg || "#64748b"};
  display: inline-flex;
  align-items: center;
`;

const TicketTitle = styled.div`
  min-width: 0;
  font-weight: 900;
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const MsgList = styled.div`
  display: grid;
  gap: 10px;
  overflow: auto;
  padding-right: 2px; /* avoid scrollbar overlaying content */
`;

const Msg = styled.div`
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 10px;
  align-items: start;
  padding: 8px 0;
  border-bottom: 1px solid #f2f4f8;

  &:last-child { border-bottom: 0; }
`;

const AvatarImg = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 999px;
  object-fit: cover;
  border: 1px solid #e5e7eb;
`;

const AvatarFallback = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: #e5e7eb;
  color: #0f172a;
  font-weight: 800;
  font-size: 12px;
  display: grid;
  place-items: center;
`;

const MsgBody = styled.div`
  display: grid;
  gap: 6px;

  .text { white-space: pre-wrap; }
`;

const MsgHead = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;

  .time {
    color: #64748b;
    font-size: 12px;
  }
`;

const RoleBadge = styled.span`
  background: #f1f5ff;
  color: #1f6feb;
  border: 1px solid #dbe8ff;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 900;
  padding: 3px 6px;
`;

const ClosedNote = styled.div`
  margin-top: 8px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #fee2e2;
  background: #fff7f7;
  color: #b91c1c;

  a {
    color: #1f6feb;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
  }
`;

const Composer = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
`;