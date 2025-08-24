// src/pages/AdminRoadmap.jsx
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "../lib/api";
import { useToast } from "../components/ToastProvider";


/* ------------------------------------------------------------------ */
/* Trello-like board statuses                                          */
/* ------------------------------------------------------------------ */
const STATUSES = [
  { key: "backlog", label: "Backlog" },
  { key: "planned", label: "Planuojama" },
  { key: "upcoming", label: "Artimiausia" },
  { key: "in_progress", label: "Vykdoma" },
  { key: "done", label: "Išleista" },
];

/* ------------------------------------------------------------------ */
/* Sortable wrapper (dnd-kit)                                          */
/* ------------------------------------------------------------------ */
function SortableCard({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Subtasks block                                                      */
/* ------------------------------------------------------------------ */
function Subtasks({ feature, onAdd, onToggle, onRemove }) {
  const [q, setQ] = useState("");
  const total = feature.subtasks?.length || 0;
  const done = feature.subtasks?.filter((s) => s.done)?.length || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <SubBox>
      <Progress>
        <Bar style={{ width: `${pct}%` }} />
      </Progress>
      <ul>
        {(feature.subtasks || []).map((s) => (
          <li key={s.id} aria-checked={!!s.done}>
            <input type="checkbox" checked={!!s.done} onChange={() => onToggle(s)} />
            <span>{s.title}</span>
            <button onClick={() => onRemove(s.id)}>✕</button>
          </li>
        ))}
      </ul>
      <AddRow
        onSubmit={(e) => {
          e.preventDefault();
          onAdd(feature.id, q);
          setQ("");
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nauja užduotis…"
        />
        <button type="submit">Pridėti</button>
      </AddRow>
    </SubBox>
  );
}

/* ------------------------------------------------------------------ */
/* Main Admin Roadmap                                                  */
/* ------------------------------------------------------------------ */
export default function AdminRoadmap() {
  const toast = useToast();
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(false);

  const [newFeature, setNewFeature] = useState({
    title: "",
    description: "",
    status: "backlog",
    color: "#1f6feb",
    icon: "📌",
    is_public: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Fetch board columns
  async function load() {
    setLoading(true);
    try {
      const d = await api("/api/admin/roadmap/board");
      setBoard(d?.columns || {});
    } catch (e) {
      toast.error(e?.message || "Nepavyko įkelti lentos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Helper to update columns and immediately persist snapshot
  function updateColumns(mutator) {
    setBoard((prev) => {
      const next = { ...(prev || {}) };
      for (const s of STATUSES) {
        next[s.key] = Array.isArray(next[s.key]) ? [...next[s.key]] : [];
      }
      mutator(next);
      // Persist *after* state is computed, using this snapshot
      queueMicrotask(() => persistOrderFrom(next));
      return next;
    });
  }

  async function createFeature() {
    const { title } = newFeature;
    if (!title.trim()) return toast.error("Įveskite pavadinimą");
    try {
      await api("/api/admin/roadmap/features", {
        method: "POST",
        json: newFeature,
      });
      setNewFeature((s) => ({ ...s, title: "", description: "" }));
      load();
    } catch (e) {
      toast.error(e?.message || "Nepavyko sukurti funkcijos");
    }
  }

  // Drag end handler
  function onDragEnd(evt) {
    const { active, over } = evt;
    if (!active?.id || !over?.id) return;

    const [fromCol, fromId] = String(active.id).split(":");
    const [toCol, toId] = String(over.id).split(":");
    if (!fromCol || !toCol) return;

    if (fromCol === toCol) {
      // reorder within column
      updateColumns((cols) => {
        const list = cols[toCol] || [];
        const oldIndex = list.findIndex((x) => `${toCol}:${x.id}` === active.id);
        const newIndex = list.findIndex((x) => `${toCol}:${x.id}` === over.id);
        cols[toCol] = arrayMove(list, oldIndex, newIndex);
      });
    } else {
      // move across columns
      updateColumns((cols) => {
        const from = cols[fromCol] || [];
        const to = cols[toCol] || [];
        const idxFrom = from.findIndex((x) => String(x.id) === String(fromId));
        const item = from[idxFrom];
        if (!item) return;
        from.splice(idxFrom, 1);
        const overIndex = to.findIndex((x) => `${toCol}:${x.id}` === over.id);
        to.splice(
          overIndex < 0 ? to.length : overIndex,
          0,
          { ...item, status: toCol }
        );
      });
    }
  }

  async function persistOrderFrom(boardState) {
    try {
      const cols = {};
      for (const s of STATUSES) {
        cols[s.key] = (boardState?.[s.key] || []).map((x) => x.id);
      }
      await api("/api/admin/roadmap/reorder", {
        method: "POST",
        json: { columns: cols },
      });
    } catch (e) {
      toast.error(e?.message || "Nepavyko išsaugoti eiliškumo");
      load();
    }
  }

  async function addSub(featureId, title) {
    if (!title.trim()) return;
    try {
      await api(`/api/admin/roadmap/features/${featureId}/subtasks`, {
        method: "POST",
        json: { title },
      });
      load();
    } catch (e) {
      toast.error(e?.message || "Nepavyko pridėti užduoties");
    }
  }

  async function toggleSub(s) {
    try {
      await api(`/api/admin/roadmap/subtasks/${s.id}`, {
        method: "PATCH",
        json: { done: !s.done },
      });
      load();
    } catch (e) {
      toast.error(e?.message || "Nepavyko atnaujinti užduoties");
    }
  }

  async function removeSub(sid) {
    try {
      await api(`/api/admin/roadmap/subtasks/${sid}`, { method: "DELETE" });
      load();
    } catch (e) {
      toast.error(e?.message || "Nepavyko pašalinti užduoties");
    }
  }

  async function deleteFeature(id) {
    try {
      await api(`/api/admin/roadmap/features/${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      toast.error(e?.message || "Nepavyko ištrinti funkcijos");
    }
  }

  async function saveFeatureMeta(id, patch) {
    try {
      await api(`/api/admin/roadmap/features/${id}`, {
        method: "PATCH",
        json: patch,
      });
      // Optimistic; reload not strictly necessary
    } catch (e) {
      toast.error(e?.message || "Nepavyko išsaugoti");
      load();
    }
  }

  if (loading && !board) return (
    <Wrap><Hint>Kraunama…</Hint></Wrap>
  );

  return (
    <Wrap>
      <Header>
        <h3>Roadmap (Admin)</h3>
        <span>Tempkite korteles tarp stulpelių. Redaguokite subtasks vietoje.</span>
      </Header>

      {/* Create feature */}
      <CreateRow>
        <input
          value={newFeature.title}
          onChange={(e) => setNewFeature((s) => ({ ...s, title: e.target.value }))}
          placeholder="Naujos funkcijos pavadinimas"
        />
        <select
          value={newFeature.status}
          onChange={(e) => setNewFeature((s) => ({ ...s, status: e.target.value }))}
        >
          {STATUSES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <input
          value={newFeature.icon}
          onChange={(e) => setNewFeature((s) => ({ ...s, icon: e.target.value }))}
          style={{ width: 64 }}
          title="Emoji icon"
        />
        <input
          value={newFeature.color}
          onChange={(e) => setNewFeature((s) => ({ ...s, color: e.target.value }))}
          style={{ width: 110 }}
          title="Hex color"
        />
        <label>
          <input
            type="checkbox"
            checked={newFeature.is_public}
            onChange={(e) =>
              setNewFeature((s) => ({ ...s, is_public: e.target.checked }))
            }
          />
          Vieša
        </label>
        <button onClick={createFeature}>Sukurti</button>
      </CreateRow>

      <DescEdit
        rows={3}
        placeholder="Trumpas aprašymas (optional)"
        value={newFeature.description}
        onChange={(e) =>
          setNewFeature((s) => ({ ...s, description: e.target.value }))
        }
      />

      {board && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <Board>
            {STATUSES.map((col) => {
              const items = board[col.key] || [];
              return (
                <Column key={col.key}>
                  <ColHeader>{col.label}</ColHeader>
                  <SortableContext
                    items={items.map((i) => `${col.key}:${i.id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <Stack>
                      {items.map((card) => (
                        <SortableCard
                          key={`${col.key}:${card.id}`}
                          id={`${col.key}:${card.id}`}
                        >
                          <Card style={{ borderColor: "#e7eaf0" }}>
                            <CardTop>
                              <Dot style={{ background: card.color || "#1f6feb" }}>
                                {card.icon || "📌"}
                              </Dot>
                              <input
                                className="title"
                                value={card.title}
                                onChange={(e) =>
                                  saveFeatureMeta(card.id, { title: e.target.value })
                                }
                              />
                            </CardTop>

                            <DescEdit
                              placeholder="Aprašymas…"
                              defaultValue={card.description || ""}
                              onBlur={(e) =>
                                saveFeatureMeta(card.id, {
                                  description: e.target.value,
                                })
                              }
                            />

                            <MetaRow>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={!!card.is_public}
                                  onChange={(e) =>
                                    saveFeatureMeta(card.id, {
                                      is_public: e.target.checked,
                                    })
                                  }
                                />
                                Vieša
                              </label>
                              <button
                                className="danger"
                                onClick={() => deleteFeature(card.id)}
                              >
                                Trinti
                              </button>
                            </MetaRow>

                            <Subtasks
                              feature={card}
                              onAdd={addSub}
                              onToggle={toggleSub}
                              onRemove={removeSub}
                            />
                          </Card>
                        </SortableCard>
                      ))}
                      {!items.length && <Empty>—</Empty>}
                    </Stack>
                  </SortableContext>
                </Column>
              );
            })}
          </Board>
        </DndContext>
      )}
    </Wrap>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */
const Wrap = styled.div`
  display: grid; gap: 12px;
`;
const Header = styled.div`
  display: flex; align-items: baseline; gap: 12px;
  h3 { margin: 0; font-weight: 900; }
`;
const Hint = styled.div`
  color: #64748b;
`;
const CreateRow = styled.div`
  display:flex; gap:8px; flex-wrap:wrap;
  input,select,button,label{border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; height:36px;}
  button{background:#1f6feb; color:#fff; font-weight:900; border:0;}
  label{display:inline-flex; gap:8px; align-items:center;}
`;
const Board = styled.div`
  display:grid; grid-template-columns: repeat(5, minmax(260px, 1fr)); gap:12px; align-items:start;
  @media (max-width:1100px){ grid-template-columns: repeat(3, minmax(260px,1fr)); }
  @media (max-width:720px){ grid-template-columns: 1fr; }
`;
const Column = styled.section`
  border:1px solid #e7eaf0; border-radius:12px; background:#fff; overflow:hidden; display:grid; grid-template-rows:auto 1fr;
`;
const ColHeader = styled.div`
  padding:10px 12px; background:#f9fafb; border-bottom:1px solid #e7eaf0; font-weight:900; font-size:13px; letter-spacing:.12em;
`;
const Stack = styled.div`
  display:grid; gap:10px; padding:10px;
`;
const Empty = styled.div`
  color:#94a3b8; font-weight:700; text-align:center; padding:12px 0;
`;
const Card = styled.article`
  border:1px solid #e7eaf0; border-radius:12px; padding:10px; background:#fff; display:grid; gap:8px; box-shadow:0 2px 8px rgba(2,6,23,.04);
`;
const CardTop = styled.div`
  display:grid; grid-template-columns:auto 1fr; gap:8px; align-items:center;
  .title{border:1px solid #e5e7eb; border-radius:8px; padding:6px 8px; font-weight:800;}
`;
const Dot = styled.div`
  width:26px; height:26px; border-radius:8px; display:grid; place-items:center; font-size:14px; color:#fff; background:#1f6feb;
`;
const DescEdit = styled.textarea`
  min-height:50px; border:1px solid #e5e7eb; border-radius:10px; padding:8px 10px; font-size:13px; resize:vertical;
`;
const MetaRow = styled.div`
  display:flex; justify-content:space-between; align-items:center;
  .danger{ background:#fee2e2; color:#b91c1c; border:0; border-radius:8px; padding:6px 8px; }
`;
const SubBox = styled.div`
  border-top:1px dashed #e7eaf0; padding-top:8px; display:grid; gap:8px;
  ul{list-style:none; margin:0; padding:0; display:grid; gap:6px;}
  li{display:grid; grid-template-columns:16px 1fr auto; gap:8px; align-items:center;}
  li[aria-checked="true"] span{ text-decoration: line-through; color:#94a3b8; }
`;
const Progress = styled.div`
  height:6px; background:#eef2f7; border-radius:6px; overflow:hidden;
`;
const Bar = styled.div`
  height:100%; background:#1f6feb;
`;
const AddRow = styled.form`
  display:grid; grid-template-columns:1fr auto; gap:8px;
  input,button{border:1px solid #e5e7eb; border-radius:8px; padding:6px 8px;}
  button{background:#f3f6fc; font-weight:800;}
`;