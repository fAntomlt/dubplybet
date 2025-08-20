import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const absUrl = (u) => {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;        // already absolute
  if (u.startsWith("/uploads")) return API_ORIGIN + u; // served by backend
  return u;
};

export default function PostsList({ type }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    (async () => {
      const d = await api(`/api/posts?type=${type}`);
      setRows(d.posts || []);
      document.title = type === "update" ? "Atnaujinimai" : "Naujienos";
    })();
  }, [type]);

  return (
    <Wrap>
      {rows.map(p => (
        <Card key={p.id}>
          {p.pinned ? <Pin>📌</Pin> : null}
          <Link to={(type === "update" ? "/atnaujinimai/" : "/naujienos/") + (p.slug || p.id)}>
            {p.header_url ? (
            <Thumb src={absUrl(p.header_url)} alt="" />
            ) : <ThumbPlaceholder />}
            <Title>
              {type === "update" && p.version ? <Version>v{p.version}</Version> : null}
              {p.title}
            </Title>
          </Link>
          <Divider />
          <Meta>
            <User>
              <Avatar $img={absUrl(p.avatarUrl)} /><span>{p.username}</span>
            </User>
            <DateText>{String(p.created_at).slice(0,16).replace("T"," ")}</DateText>
          </Meta>
        </Card>
      ))}
      {!rows.length && <Empty>Nėra įrašų</Empty>}
    </Wrap>
  );
}

const Wrap = styled.div`display:grid; gap:16px;`;
const Card = styled.article`
  position:relative;
  border:1px solid #e7eaf0; border-radius:12px; overflow:hidden; background:#fff;
  box-shadow:0 4px 10px rgba(17,24,39,0.06);
  a{ color:inherit; text-decoration:none; display:block; }
  &:hover { box-shadow:0 8px 24px rgba(2,6,23,.10); transform: translateY(-1px); }
`;
const Pin = styled.div`position:absolute; top:10px; right:10px; font-size:20px;`;
const Thumb = styled.img`width:100%; height:auto; aspect-ratio:16/4; object-fit:cover; display:block;`;
const ThumbPlaceholder = styled.div`width:100%; aspect-ratio:16/4; background:#f3f4f6;`;
const Title = styled.h2`margin:12px; margin-bottom:10px; font-size:22px; font-weight:800;`;
const Version = styled.span`
  font-size:14px; font-weight:900; color:#1f6feb; margin-right:8px; background:#eef4ff; padding:2px 6px; border-radius:6px;
`;
const Divider = styled.div`height:1px; background:#eef2f7;`;
const Meta = styled.div`display:flex; justify-content:space-between; align-items:center; padding:10px 12px;`;
const User = styled.div`display:flex; align-items:center; gap:8px; font-weight:700;`;
const Avatar = styled.div`
  width:28px; height:28px; border-radius:50%; background:#f3f4f6;
  background-image:${p=>p.$img ? `url(${p.$img})` : "none"}; background-size:cover; background-position:center;
  border:1px solid #e7eaf0;
`;
const DateText = styled.div`color:#64748b; font-weight:600;`;
const Empty = styled.div`color:#64748b; font-weight:600;`;