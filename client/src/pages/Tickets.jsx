// src/pages/Tickets.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import styled, { keyframes } from "styled-components";
import { api } from "../lib/api";
import { getAuth } from "../store/auth";
import { useToast } from "../components/ToastProvider";
import { ConfirmModal } from "../components/Modal";
import UserCardPopover from "../components/UserCardPopover.jsx";

const MOBILE = 860;
const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const joinApi = (p) => (p?.startsWith("/uploads") ? `${API_ORIGIN}${p}` : p || "");

// --------- utils ---------
const ltState = (s) => (s === "open" ? "ATIDARYTA" : s === "accepted" ? "PRIIMTA" : "UŽDARYTA");
const stateTone = {
  open:    { bg: "#E6F9EE", text: "#15803D", ring: "#A7F3D0" },     // green
  accepted:{ bg: "#FEF9E8", text: "#A16207", ring: "#FDE68A" },     // amber
  closed:  { bg: "#FDECEC", text: "#B91C1C", ring: "#FCA5A5" },     // red
};
const fmt = (d) => {
  if (!d) return "";
  if (typeof d === "string" && d.includes(" ")) return d.slice(0, 16).replace("T", " ");
  try {
    return new Date(d).toLocaleString("lt-LT", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return String(d); }
};
const initials = (name = "") =>
  name.trim().split(/\s+/).slice(0, 2).map(s => s[0]?.toUpperCase() || "").join("");

// =================================== PAGE ===================================
export default function Tickets() {
  useEffect(() => { document.title = "Ticketai – DuBPlyBET"; }, []);
  const [view, setView] = useState("list");   // "create" | "list" | "detail"
  const [selectedId, setSelectedId] = useState(null);

  const pageRef = useRef(null);

// Popover state
const [cardOpen, setCardOpen] = useState(false);
const [anchorEl, setAnchorEl] = useState(null);
const [cardUser, setCardUser] = useState(null);
const [cardLoading, setCardLoading] = useState(false);
const [cardError, setCardError] = useState("");
const token = useMemo(() => localStorage.getItem("authToken"), []);

// Load public user for popover (same idea as Home)
async function fetchUserPublic(userId) {
  if (!userId) return;
  setCardLoading(true);
  setCardError("");
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(`${API_ORIGIN}/api/users/public/${userId}`, { headers });
    const data = await res.json();
    if (!res.ok || !data?.ok) {
      setCardError(data?.error || "Nepavyko užkrauti profilio");
      return;
    }
    setCardUser(data.user || null);
  } catch {
    setCardError("Serverio klaida įkeliant profilį");
  } finally {
    setCardLoading(false);
  }
}

/**
 * Open the popover.
 * Accepts either a numeric/string ID OR a partial user object ({ id|user_id|userId, username, role, avatarUrl }).
 */
function openCard(userInfo, e) {
  const el = e.currentTarget;
  // Extract id
  const id =
    typeof userInfo === "object"
      ? (userInfo.user_id ?? userInfo.id ?? userInfo.userId ?? null)
      : userInfo;

  // Seed with what we already know for instant UI
  setCardUser(typeof userInfo === "object" ? userInfo : null);

  setAnchorEl(el);
  setCardOpen(true);
  fetchUserPublic(id);
}

function closeCard() {
  setCardOpen(false);
  setAnchorEl(null);
  setCardError("");
}

  return (
    <Shell ref={pageRef}>
      <Sidebar>
        <Brand>
          <BrandDot />
          <div>
            <h1>Support</h1>
            <small>DuBPlyBET</small>
          </div>
        </Brand>

        <SideGroup>
          <SideTitle>Ticketai</SideTitle>
          <SideAction
            $primary
            onClick={() => { setView("create"); setSelectedId(null); }}
          >
            + Sukurti ticketą
          </SideAction>
          <SideAction
            $ghost
            onClick={() => { setView("list"); setSelectedId(null); }}
          >
            Mano ticketai
          </SideAction>
        </SideGroup>

        <SideDivider />
        <SideGroup>
          <SideTitle>Pagalba</SideTitle>
          <SideHint>Trumpai aprašykite problemą ir, jei galima, pridėkite veiksmus kaip atkartoti.</SideHint>
        </SideGroup>
      </Sidebar>

      <Content>
        {view === "create" && (
          <CreateTicket
            onCreated={(id) => { setSelectedId(id); setView("detail"); }}
          />
        )}

        {view === "list" && (
          <MyTickets onOpen={(id) => { setSelectedId(id); setView("detail"); }} />
        )}

        {view === "detail" && selectedId && (
        <TicketDetail id={selectedId} onBack={() => setView("list")} onUserClick={openCard} />
        )}
      </Content>
      <UserCardPopover
        open={cardOpen}
        anchorEl={anchorEl}
        onClose={closeCard}
        user={cardUser}
        loading={cardLoading && !cardUser}
        error={cardError}
        apiOrigin={API_ORIGIN}
        containerEl={pageRef.current}
        />
    </Shell>
  );
}

// ================================= CREATE ===================================
function CreateTicket({ onCreated }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const valid = title.trim().length >= 3 &&
                title.trim().length <= 50 &&
                text.trim().length >= 3 &&
                text.trim().length <= 2000;

  async function submit() {
    if (!valid) return;
    try {
      setSaving(true);
      const d = await api("/api/tickets", {
        method: "POST",
        json: { title: title.trim(), content: text.trim() },
      });
      toast.success("Ticketas sukurtas");
      onCreated?.(d.id);
    } catch (e) {
      toast.error(e?.message || "Nepavyko sukurti");
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  }

  return (
    <Panel>
      <PanelHead>
        <PanelTitle>Naujas ticketas</PanelTitle>
        <Actions>
          <PrimaryButton
            disabled={!valid || saving}
            onClick={() => setConfirmOpen(true)}
          >
            {saving ? "Siunčiama…" : "Siųsti"}
          </PrimaryButton>
        </Actions>
      </PanelHead>

      <FormGrid>
        <FormField>
          <Label>Pavadinimas <em>(3–50)</em></Label>
          <Input
            placeholder="Trumpas pavadinimas"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={50}
          />
        </FormField>
        <FormField $span2>
          <Label>Turinys <em>(3–2000)</em></Label>
          <TextArea
            placeholder="Aprašykite klaidą / idėją…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
          />
        </FormField>
      </FormGrid>

      <ConfirmModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={submit}
        title="Patvirtinti siuntimą?"
      >
        <ModalP>Ar tikrai norite išsiųsti šį ticketą?</ModalP>
      </ConfirmModal>
    </Panel>
  );
}

// ================================== LIST ====================================
function MyTickets({ onOpen }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState("all"); // open | accepted | closed | all
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const d = await api(`/api/tickets/mine?state=${encodeURIComponent(stateFilter)}`);
      setRows(d.tickets || []);
    } catch (e) {
      toast.error(e?.message || "Nepavyko užkrauti");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, [stateFilter]); // eslint-disable-line

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(r => String(r.title || "").toLowerCase().includes(needle));
  }, [rows, q]);

  return (
    <Panel>
      <Toolbar>
        <LeftGroup>
          <ToolbarTitle>Ticketai</ToolbarTitle>
          <MiniSep />
          <FilterSelect value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
            <option value="all">Visi</option>
            <option value="open">Atidaryta</option>
            <option value="accepted">Priimta</option>
            <option value="closed">Uždaryta</option>
          </FilterSelect>
        </LeftGroup>

        <RightGroup>
          <SearchInput
            placeholder="Paieška pavadinime…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <GhostButton onClick={load}>{loading ? "Kraunama…" : "Atnaujinti"}</GhostButton>
        </RightGroup>
      </Toolbar>

      <TableWrap role="region" aria-label="Mano ticketai">
        <Table>
          <thead>
            <tr>
              <th style={{width: "80px"}}>#</th>
              <th>Issue</th>
              <th style={{width: "170px"}}>Sukurta</th>
              <th style={{width: "160px"}}>Būsena</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <TRMuted>
                <td colSpan={4}><Muted>Įkeliama…</Muted></td>
              </TRMuted>
            )}
            {!loading && filtered.map(r => (
              <TR key={r.id} onClick={() => onOpen?.(r.id)} role="button">
                <td>#{r.id}</td>
                <td className="title">{r.title}</td>
                <td>{fmt(r.created_at)}</td>
                <td>
                  <Status $state={r.state}>{ltState(r.state)}</Status>
                </td>
              </TR>
            ))}
            {!loading && !filtered.length && (
              <TRMuted>
                <td colSpan={4}><Muted>Nėra įrašų</Muted></td>
              </TRMuted>
            )}
          </tbody>
        </Table>
      </TableWrap>
    </Panel>
  );
}

// ================================ DETAIL =====================================
function TicketDetail({ id, onBack, onUserClick }) {
  const toast = useToast();
  const { user } = getAuth() || {};
  const [meta, setMeta] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const token = useMemo(() => localStorage.getItem("authToken"), []); // 👈 add this

  const isClosed = meta?.state === "closed";
  const isAdmin = user?.role === "admin";

  async function load() {
    try {
      const d = await api(`/api/tickets/${id}`);
      const baseMsgs = d.messages || [];

      // collect user_ids that need avatars
      const need = Array.from(
        new Set(
          baseMsgs
            .filter(m => !m.avatarUrl && (m.user_id ?? m.sender_id ?? m.author_id ?? m.account_id ?? m.owner_id))
            .map(m => m.user_id ?? m.sender_id ?? m.author_id ?? m.account_id ?? m.owner_id)
        )
      );

      let avatarMap = {};
      if (need.length) {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const pairs = await Promise.all(
          need.map(async (uid) => {
            try {
              const res = await fetch(`${API_ORIGIN}/api/users/public/${uid}`, { headers });
              const data = await res.json();
              const url = data?.user?.avatarUrl || null;
              return [uid, url];
            } catch {
              return [uid, null];
            }
          })
        );
        avatarMap = Object.fromEntries(pairs);
      }

      const merged = baseMsgs.map(m => {
        const uid = m.user_id ?? m.sender_id ?? m.author_id ?? m.account_id ?? m.owner_id ?? null;
        return {
          ...m,
          avatarUrl: m.avatarUrl || (uid ? avatarMap[uid] : null),
        };
      });

      setMeta(d.ticket);
      setMsgs(merged);
    } catch (e) {
      toast.error(e?.message || "Nepavyko užkrauti");
    }
  }
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  async function send() {
    const content = text.trim();
    if (!content) return;
    try {
      setSending(true);
      await api(`/api/tickets/${id}/messages`, {
        method: "POST",
        json: { content },
      });
      setText("");
      await load();
    } catch (e) {
      toast.error(e?.message || "Nepavyko išsiųsti");
    } finally {
      setSending(false);
    }
  }

  return (
    <Panel $fill>
      <DetailHeader>
        <Back onClick={onBack}>↩</Back>
        <HeaderText>
          <h3>{meta?.title || "—"}</h3>
          <small>#{id} • {meta ? fmt(meta.created_at) : "—"}</small>
        </HeaderText>
        <Status $state={meta?.state || "open"}>{ltState(meta?.state || "open")}</Status>
      </DetailHeader>

      <MessageList>
  {msgs.map(m => (
    <Message key={m.id} $admin={m.sender_role === "admin"}>
      <Avatar
        $img={m.avatarUrl ? joinApi(m.avatarUrl) : null}
        role="button"
        tabIndex={0}
        title={m.username}
        onClick={(e) => {
          const uid = m.user_id ?? m.sender_id ?? m.author_id ?? m.account_id ?? m.owner_id ?? null;
          if (!uid) return;
          onUserClick?.({ id: uid, username: m.username, role: m.sender_role }, e);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            const uid = m.user_id ?? m.sender_id ?? m.author_id ?? m.account_id ?? m.owner_id ?? null;
            if (!uid) return;
            onUserClick?.({ id: uid, username: m.username, role: m.sender_role }, e);
          }
        }}
      >
        {!m.avatarUrl ? initials(m.username) : null}
      </Avatar>

      <Bubble $admin={m.sender_role === "admin"}>
        <BubbleMeta>
          <strong
            role="button"
            tabIndex={0}
            style={{ cursor: "pointer" }}
            title={m.username}
            onClick={(e) => {
              const uid = m.user_id ?? m.sender_id ?? m.author_id ?? m.account_id ?? m.owner_id ?? null;
              if (!uid) return;
              onUserClick?.({ id: uid, username: m.username, role: m.sender_role }, e);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                const uid = m.user_id ?? m.sender_id ?? m.author_id ?? m.account_id ?? m.owner_id ?? null;
                if (!uid) return;
                onUserClick?.({ id: uid, username: m.username, role: m.sender_role }, e);
              }
            }}
          >
            {m.username}
          </strong>
          {m.sender_role === "admin" && <Role>ADMIN</Role>}
          <time>{fmt(m.created_at)}</time>
        </BubbleMeta>
        <BubbleText>{m.content}</BubbleText>
      </Bubble>
    </Message>
  ))}
</MessageList>

      {isClosed ? (
        <ClosedNote>Negalima atsakyti į uždarytą ticketą. Sukurkite naują ticketą kairėje.</ClosedNote>
        ) : (
        <Composer>
            <ComposerInput
            placeholder="Jūsų žinutė…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={2000}
            />
            <PrimaryButton disabled={!text.trim() || sending} onClick={send}>
            {sending ? "Siunčiama…" : "Siųsti"}
            </PrimaryButton>
        </Composer>
        )}
    </Panel>
  );
}

// =============================== STYLES ======================================

/** --- Layout (left dark panel + right content) --- */
const Shell = styled.div`
  --radius: 14px;
  --shadow-1: 0 6px 18px rgba(17, 24, 39, .08);
  --ring: 0 0 0 4px rgba(31, 111, 235, .10);

  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  padding: 18px;
  min-height: calc(100vh - 36px);
  background: #F5F7FB;

  @media (max-width: ${MOBILE}px) {
    grid-template-columns: 1fr;
    padding: 12px;
  }
`;

const Sidebar = styled.aside`
  background: radial-gradient(1200px 400px at -100px -200px, #234 0%, #0E1527 60%, #0B1220 100%);
  color: #E6EDF7;
  border-radius: var(--radius);
  box-shadow: var(--shadow-1);
  padding: 18px;
  display: grid;
  align-content: start;
  gap: 18px;
  min-width: 0;

  @media (max-width: ${MOBILE}px) {
    border-radius: 12px;
  }
`;

const Brand = styled.div`
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 10px;
  align-items: center;

  h1 { margin: 0; font-size: 18px; font-weight: 800; letter-spacing: .01em; }
  small { color: #B8C1D9; }
`;
const BrandDot = styled.div`
  width: 36px; height: 36px; border-radius: 10px;
  background: linear-gradient(135deg, #69F 0%, #3AA6FF 100%);
  box-shadow: 0 8px 24px rgba(58, 166, 255, .35), inset 0 0 0 2px rgba(255,255,255,.15);
`;

const SideGroup = styled.div`display: grid; gap: 10px;`;
const SideTitle = styled.div`font-weight: 800; font-size: 12px; letter-spacing: .08em; color: #9FB0D1;`;
const SideHint = styled.p`margin: 0; color: #AFC2E0; font-size: 13px; line-height: 1.45;`;
const SideDivider = styled.div`height: 1px; background: rgba(255,255,255,.08);`;

const SideAction = styled.button`
  height: 36px;
  border-radius: 10px;
  border: 1px solid ${p => p.$primary ? "transparent" : "rgba(255,255,255,.15)"};
  background: ${p => p.$primary
    ? "linear-gradient(180deg, #2D6BEA 0%, #1F6FEB 100%)"
    : "rgba(255,255,255,.04)"};
  color: ${p => p.$primary ? "#fff" : "#E6EDF7"};
  font-weight: 800;
  font-size: 13px;
  cursor: pointer;
  padding: 0 12px;
  text-align: left;
  box-shadow: ${p => p.$primary ? "0 6px 18px rgba(31,111,235,.35)" : "none"};
  transition: transform .05s ease, background .2s ease, box-shadow .2s ease;

  &:hover { transform: translateY(0); background: ${p => p.$primary ? "#1f67e8" : "rgba(255,255,255,.08)"}; }
  &:active { transform: translateY(1px); }
`;


/** --- Modal text --- */
const ModalP = styled.p`margin: 0; color: #0F172A;`;

// --- RIGHT SIDE ONLY: Content, Panel, toolbars, table, detail, composer ---

const Content = styled.main`
   display: grid;
   align-content: start;
   gap: 16px;
   min-width: 0;         /* 👈 critical for grid responsiveness */
   max-width: 100%;
 `;

/* panel with subtle surface + border accents */
const Panel = styled.section`
  background:
    radial-gradient(1800px 240px at 0 -120px, #ffffff 0%, #fdfefe 60%, #f8fbff 100%);
  border: 1px solid #E6EAF1;
  border-radius: var(--radius);
  box-shadow: 0 10px 28px rgba(9,17,33,.06);
  /* padding: 0;  <-- remove this */
  padding-bottom: 12px;       /* keeps bottom scrollbar visible */
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: ${p => (p.$fill ? "560px" : "auto")};
  min-width: 0;
  max-width: 100%;

  @media (max-width: ${MOBILE}px) {
    border-radius: 12px;
  }
`;

/* unified panel header */
const PanelHead = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #E6EAF1;
  background: linear-gradient(180deg, #ffffff 0%, #f9fbff 100%);
`;
const PanelTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: .01em;
  color: #0F172A;
`;
const Actions = styled.div`display:flex; gap:8px;`;

/* toolbar that sticks inside the panel */
const Toolbar = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #EEF2F7;
`;

const LeftGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1 1 280px;
`;

const RightGroup = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 1 1 320px;
  justify-content: flex-end;
`;

const ToolbarTitle = styled.div`
  font-weight: 900;
  color: #0F172A;
  white-space: nowrap;
`;

const MiniSep = styled.div`
  width: 1px;
  align-self: stretch;
  background: #E6EAF1;
  flex: 0 0 1px;
`;

const FilterSelect = styled.select`
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid #E5E7EB;
  background: #fff;
  font-weight: 700;
  min-width: 0;
  width: auto;
  max-width: clamp(120px, 30vw, 220px);
`;

/* inputs & buttons (unchanged) */
const Label = styled.label`
  font-size: 13px; color: #6B7280; display: inline-block;
  em { color: #94A3B8; font-style: normal; font-weight: 600; }
`;
const InputBase = `
  border: 1px solid #E5E7EB;
  background: #fff;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 14px;
  outline: none;
  transition: border-color .15s ease, box-shadow .15s ease;
  &:focus { border-color: #99B9FF; box-shadow: var(--ring); }
`;
const Input = styled.input`${InputBase}`;
const TextArea = styled.textarea`${InputBase}; min-height: 140px; resize: vertical;`;
const ComposerInput = styled.textarea`${InputBase}; min-height: 96px; resize: vertical;`;

const SearchInput = styled.input`
  height: 32px;
  padding: 0 10px;
  border-radius: 8px;
  border: 1px solid #E5E7EB;
  min-width: 0;        /* critical: let input shrink below intrinsic width */
  width: 100%;         /* fill the 1fr column */
`;

const ButtonBase = `
  border: 0;
  border-radius: 10px;
  padding: 9px 12px;
  cursor: pointer;
  font-weight: 800;
  font-size: 13px;
  transition: transform .05s ease, background .15s ease, box-shadow .15s ease, color .15s ease;
  &:active { transform: translateY(1px); }
`;
const PrimaryButton = styled.button`
  ${ButtonBase};
  background: linear-gradient(180deg, #2D6BEA 0%, #1F6FEB 100%);
  color: #fff;
  box-shadow: 0 8px 18px rgba(31,111,235,.28);
  &:hover { background:#1f67e8; }
  &:disabled { opacity:.6; cursor:not-allowed; box-shadow:none; }
`;
const GhostButton = styled.button`
  ${ButtonBase};
  background: #F3F6FC;
  color: #0F172A;
  border: 1px solid #E6EAF1;
  flex: 0 0 auto;
  &:hover { background: #EAF0FB; }
`;

/* create form grid (unchanged) */
const FormGrid = styled.div`
  display:grid; grid-template-columns: 1fr 1fr; gap:14px;
  padding: 16px;
  @media (max-width:${MOBILE}px){ grid-template-columns:1fr; }
`;
const FormField = styled.div`
  display:grid; gap:6px;
  ${p => p.$span2 && `grid-column:1 / -1;`}
`;

/* TABLE: sticky header, zebra rows, id chip, row hover elevation */
const TableWrap = styled.div`
  margin: 0;
  padding: 0 0 16px;   /* no left/right padding */
  border: 1px solid #E6EAF1;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 6px 16px rgba(2,6,23,.04);

  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  
`;



const Table = styled.table`
  width: max-content;       /* allow growth to content */
  min-width: 100%;

  border-collapse: separate;
  border-spacing: 0;
  font-size: 14px;

  thead th {
    position: sticky; top: 0; z-index: 1;
    text-align: left;
    font-weight: 800;
    color: #0F172A;
    background: #F7F9FC;
    border-bottom: 1px solid #E6EAF1;
    padding: 11px 12px;
    white-space: nowrap;
  }

  tbody td {
    padding: 12px;
    border-bottom: 1px solid #F0F3F9;
    color: #0F172A;
    vertical-align: middle;
    white-space: nowrap;     /* rows stay single-line; wrapper scrolls */
  }

  tbody tr:nth-child(even) td { background: #FCFEFF; }

  /* Issue column: no clipping, no fixed max */
  .title {
    font-weight: 700;
    white-space: nowrap;
    overflow: visible;
    text-overflow: clip;
    max-width: none;
  }

  /* Give Issue column breathing room so it doesn’t compress away */
  th:nth-child(2), td:nth-child(2) { min-width: 420px; }

  .id-chip {
    display: inline-flex; align-items: center; justify-content: center;
    height: 26px; min-width: 52px; padding: 0 8px; border-radius: 8px;
    background: #F3F6FC; border: 1px solid #E6EAF1;
    font-weight: 800; font-size: 12px; color: #0F172A;
  }
`;

const TR = styled.tr`
  cursor: pointer;
  transition: background .12s ease, transform .06s ease, box-shadow .12s ease;
  &:hover td { background:#FAFCFF; }
  &:hover { transform: translateY(-1px); }
`;
const TRMuted = styled.tr` td { text-align:center; padding:18px; }`;
const Muted = styled.div`color:#6B7280;`;

/* status chip with tiny dot */
const Status = styled.span`
  display:inline-flex; align-items:center; gap:8px;
  height:28px; padding:0 10px; border-radius:999px;
  font-weight:900; font-size:12px;
  background: ${({ $state }) => stateTone[$state || "open"].bg};
  color: ${({ $state }) => stateTone[$state || "open"].text};
  box-shadow: 0 0 0 1px ${({ $state }) => stateTone[$state || "open"].ring} inset;

  &::before{
    content:"";
    width:8px; height:8px; border-radius:999px;
    background: currentColor; opacity:.9;
  }
`;

/* DETAIL: premium header + clearer bubbles + sticky composer */
const DetailHeader = styled.div`
  display:grid;
  grid-template-columns: auto 1fr auto;
  gap:12px; align-items:center;
  padding: 14px 16px;
  border-bottom: 1px solid #E6EAF1;
  background: linear-gradient(180deg, #ffffff 0%, #f7faff 100%);

  h3{ margin:0; font-size:18px; font-weight:900; }
  small{ color:#6B7280; }
`;
const Back = styled.button`
  ${ButtonBase};
  background:#F3F6FC;
  border:1px solid #E6EAF1;
  color:#0F172A;
  width:36px; height:36px; border-radius:10px;
  display:grid; place-items:center;
`;

const HeaderText = styled.div`display:grid; gap:2px;`;

const MessageList = styled.div`
  display: grid;
  gap: 20px;                 /* was 12px */
  padding: 10px 12px;       /* a bit tighter */
  max-height: 60vh;
  overflow: auto;
  overflow-x: hidden;       /* prevent sideways scroll */
  padding-right: 2px;
  background: linear-gradient(180deg, #ffffff 0%, #fbfdff 28%, #ffffff 100%);
`;

const Message = styled.div`
  display: grid;
  grid-template-columns: 36px 1fr;
  gap: 8px;                 /* was 10px */
  align-items: start;
`;
const Avatar = styled.div`
  width:36px; height:36px; border-radius:10px;
  display:grid; place-items:center;
  font-weight:800; font-size:12px;
  color:#0F172A;
  background:${p => p.$img ? `url(${p.$img}) center/cover no-repeat` : "#E8EEF8"};
  border:1px solid #E6EAF1;
  cursor: pointer;
`;

const Bubble = styled.div`
  background: #fff;
  border: 1px solid #E6EAF1;
  border-radius: 12px;
  padding: 8px 10px;        /* was 10px 12px */
  box-shadow: 0 2px 10px rgba(2,6,23,.04);
  display: grid;
  gap: 4px;                 /* was 6px */
  max-width: 100%;          /* never overflow panel */

  /* subtle tint for admin */
  ${p => p.$admin && `
    background: #F5F9FF;
    border-color: #D7E6FF;
  `}
`;
const BubbleMeta = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;                 /* was 8px */
  strong { font-weight: 900; color: #0F172A; }
  time   { color: #6B7280; font-size: 12px; }
`;
const Role = styled.span`
  background:#ECF2FF; color:#1F6FEB; border:1px solid #DBE8FF;
  border-radius:999px; font-size:10px; font-weight:900; padding:3px 6px;
`;
const BubbleText = styled.div`
  white-space: pre-wrap;
  overflow-wrap: anywhere;  /* break long segments with no spaces */
  word-break: break-word;
`;

const ClosedNote = styled.div`
  margin: 0 16px 12px;
  border:1px solid #FEE2E2; background:#FFF7F7; color:#B91C1C;
  padding:12px; border-radius:12px; font-weight:700;
`;

const Composer = styled.div`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 12px 16px;
  border-top: 1px solid #E6EAF1;
  background: linear-gradient(180deg, #ffffff 0%, #fafcff 100%);
`;