import React, { useEffect, useState, useMemo } from "react";
import styled from "styled-components";
import { api } from "../lib/api";

const STATUSES = [
  { key: "backlog",      label: "Backlog" },
  { key: "planned",      label: "Planned" },
  { key: "upcoming",     label: "Upcoming" },
  { key: "in_progress",  label: "In progress" },
  { key: "done",         label: "Released" },
];

export default function Roadmap() {
  const [cols, setCols] = useState(null);
  useEffect(() => { document.title = "Roadmap – DuBPlyBET"; }, []);
  useEffect(() => {
    (async () => {
      const d = await api("/api/roadmap/board");
      setCols(d.columns || {});
    })();
  }, []);

  if (!cols) return <Wrap><Loading>Kraunama…</Loading></Wrap>;

  return (
    <Wrap>
      <Title>Roadmap</Title>
      <Hint>Viešas planų sąrašas</Hint>
      <Board>
        {STATUSES.map(col => (
          <Column key={col.key}>
            <ColHeader>{col.label}</ColHeader>
            <Stack>
              {(cols[col.key] || []).map(card => <FeatureCard key={card.id} f={card} />)}
              {!((cols[col.key] || []).length) && <Empty>—</Empty>}
            </Stack>
          </Column>
        ))}
      </Board>
    </Wrap>
  );
}

function FeatureCard({ f }) {
  const total = f.subtasks?.length || 0;
  const done = f.subtasks?.filter(s => s.done)?.length || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <Card>
      <Top>
        <Dot style={{ background: f.color || "#1f6feb" }}>{f.icon || "📌"}</Dot>
        <CardTitle>{f.title}</CardTitle>
      </Top>
      {f.description ? <Desc dangerouslySetInnerHTML={{ __html: escapeHtml(f.description) }} /> : null}
      <Progress aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <Bar style={{ width: `${pct}%` }} />
      </Progress>
      <Meta>{done}/{total} subtasks</Meta>
      {total > 0 && (
        <Tasks>
          {f.subtasks.map(s => (
            <li key={s.id} aria-checked={!!s.done}>
              <input type="checkbox" checked={!!s.done} readOnly />
              <span>{s.title}</span>
            </li>
          ))}
        </Tasks>
      )}
    </Card>
  );
}

function escapeHtml(s=""){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

/* styles */
const Wrap = styled.div`display:grid; gap:10px;`;
const Title = styled.h1`margin:0; font-weight:900; letter-spacing:-.01em;`;
const Hint = styled.div`color:#64748b; font-weight:600;`;
const Board = styled.div`
  display:grid; grid-template-columns: repeat(5, minmax(240px, 1fr));
  gap:12px; align-items:start;
  @media (max-width:1100px){ grid-template-columns: repeat(3, minmax(240px,1fr)); }
  @media (max-width:720px){ grid-template-columns: 1fr; }
`;
const Column = styled.section`
  border:1px solid #e7eaf0; border-radius:12px; background:#fff; overflow:hidden;
  display:grid; grid-template-rows:auto 1fr; min-height:160px;
`;
const ColHeader = styled.div`
  padding:10px 12px; font-weight:900; font-size:13px; letter-spacing:.12em; background:#f9fafb; border-bottom:1px solid #e7eaf0;
`;
const Stack = styled.div`display:grid; gap:10px; padding:10px; min-height:0;`;
const Empty = styled.div`color:#94a3b8; font-weight:700; text-align:center; padding:12px 0;`;
const Card = styled.article`
  border:1px solid #e7eaf0; border-radius:12px; padding:10px; background:#fff; display:grid; gap:8px;
  box-shadow:0 2px 8px rgba(2,6,23,.04);
`;
const Top = styled.div`display:grid; grid-template-columns:auto 1fr; gap:8px; align-items:center;`;
const Dot = styled.div`
  width:26px; height:26px; border-radius:8px; display:grid; place-items:center; font-size:14px; color:#fff; background:#1f6feb;
`;
const CardTitle = styled.h3`margin:0; font-size:15px; font-weight:900; color:#0f172a;`;
const Desc = styled.div`color:#334155; font-size:13px;`;
const Progress = styled.div`height:8px; background:#eef2f7; border-radius:6px; overflow:hidden;`;
const Bar = styled.div`height:100%; background:#1f6feb;`;
const Meta = styled.div`font-size:12px; color:#64748b; font-weight:700;`;
const Tasks = styled.ul`
  list-style:none; padding:0; margin:0; display:grid; gap:4px; font-size:13px;
  li{display:grid; grid-template-columns: 16px 1fr; gap:8px; align-items:center;}
  li[aria-checked="true"] span{ text-decoration: line-through; color:#94a3b8; }
`;
const Loading = styled.div`color:#64748b;`;