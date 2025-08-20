import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";

const API_ORIGIN = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const absUrl = (u) => {
  if (!u) return "";
  if (/^https?:\/\//i.test(u)) return u;        // already absolute
  if (u.startsWith("/uploads")) return API_ORIGIN + u; // served by backend
  return u;
};

export default function PostDetail({ type }) {
  const { slug } = useParams();
  const [p, setP] = useState(null);

  useEffect(() => {
    (async () => {
      const d = await api(`/api/posts/${slug}`);
      setP(d.post || null);
      document.title = d.post ? d.post.title : "Įrašas";
    })();
  }, [slug]);

  if (!p) return <Wrap><div style={{ color:"#64748b" }}>Kraunama…</div></Wrap>;

  return (
  <Wrap>
    <Top>
      <Left>
        <Avatar $img={absUrl(p.avatarUrl)} />
        <div className="name">{p.username}</div>
      </Left>
      <Right>
        {p.type === "update" && p.version ? <Badge>v{p.version}</Badge> : null}
        <span>{String(p.created_at).slice(0,16).replace("T"," ")}</span>
        {p.pinned ? <span title="Prisegtas">📌</span> : null}
      </Right>
    </Top>

    {/* Divider between top meta and title */}
    <Divider />

    <Title>{p.title}</Title>

    {p.header_url ? (
      <>
        <Hero src={absUrl(p.header_url)} alt="" />
        {/* Divider between picture and the content below */}
        <Divider />
      </>
    ) : null}

    <Content dangerouslySetInnerHTML={{ __html: p.content_html }} />
  </Wrap>
);
}

const Wrap = styled.article`
  display: grid;
  gap: 12px;

  border: 1px solid #e7eaf0;
  border-radius: 12px;
  padding: 16px;
  background: #fff;
  box-shadow: 0 4px 10px rgba(17,24,39,0.06);
  overflow: hidden;
`;
const Top = styled.div`display:flex; justify-content:space-between; align-items:center;`;
const Left = styled.div`display:flex; align-items:center; gap:10px; .name{ font-weight:700; }`;
const Right = styled.div`display:flex; align-items:center; gap:10px; color:#64748b; font-weight:600;`;
const Badge = styled.span`background:#eef4ff; color:#1f6feb; font-weight:900; padding:2px 6px; border-radius:6px;`;
const Title = styled.h1`margin:0; font-size:32px; font-weight:800;`;
const Hero = styled.img`width:100%; aspect-ratio:16/5; object-fit:cover; border-radius:12px;`;
const Avatar = styled.div`
  width:34px; height:34px; border-radius:50%; background:#f3f4f6;
  background-image:${p=>p.$img ? `url(${p.$img})` : "none"}; background-size:cover; background-position:center;
  border:1px solid #e7eaf0;
`;
const Content = styled.div`
  font-size:16px; line-height:1.6;
  /* sensible typography for sanitized HTML */
  h1,h2 { line-height:1.2; margin: 16px 0 8px; }
  p { margin: 10px 0; }
  ul,ol { margin: 10px 0 10px 22px; }
  blockquote { border-left: 3px solid #e5e7eb; padding-left: 10px; color:#475569; }
  code { background:#f3f4f6; padding:2px 4px; border-radius:4px; }
  pre { background:#0f172a; color:#fff; padding:10px; border-radius:8px; overflow:auto; }
`;

const Divider = styled.div`
  height: 1px;
  background: #eef2f7;
  margin: 8px 0;
`;