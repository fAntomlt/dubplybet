import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { api } from "../lib/api";
import { useToast } from "./ToastProvider";

export default function AdminBadges() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ slug:"", name:"", description:"", color:"#1f2937", bg:"#e5e7eb", icon:"FiAward" });

  async function load() {
    const d = await api("/api/admin/badges");
    setRows(d.badges || []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!f.slug || !f.name) return toast.error("Slug ir pavadinimas privalomi");
    await api("/api/admin/badges", { method:"POST", json: f });
    toast.success("Sukurta"); setF({ slug:"", name:"", description:"", color:"#1f2937", bg:"#e5e7eb", icon:"FiAward" });
    load();
  }
  async function del(id) {
    await api(`/api/admin/badges/${id}`, { method:"DELETE" });
    toast.success("Ištrinta"); load();
  }

  return (
    <div style={{ display:"grid", gap:12 }}>
      <div style={{ fontWeight:800 }}>Naujas ženklelis</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8 }}>
        <input placeholder="slug" value={f.slug} onChange={e=>setF({...f,slug:e.target.value})}/>
        <input placeholder="pavadinimas" value={f.name} onChange={e=>setF({...f,name:e.target.value})}/>
        <input placeholder="icon (FiAward/FaTrophy)" value={f.icon} onChange={e=>setF({...f,icon:e.target.value})}/>
        <input type="color" title="teksto spalva" value={f.color} onChange={e=>setF({...f,color:e.target.value})}/>
        <input type="color" title="fono spalva" value={f.bg} onChange={e=>setF({...f,bg:e.target.value})}/>
        <button onClick={create}>Sukurti</button>
      </div>
      <textarea placeholder="aprašymas" value={f.description} onChange={e=>setF({...f,description:e.target.value})} />

      <div style={{ fontWeight:800, marginTop:10 }}>Katalogas</div>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead><tr><th>ID</th><th>Slug</th><th>Pavadinimas</th><th>Ikona</th><th>Spalvos</th><th></th></tr></thead>
        <tbody>
          {rows.map(b => (
            <tr key={b.id}>
              <td>{b.id}</td>
              <td>{b.slug}</td>
              <td>{b.name}</td>
              <td>{b.icon}</td>
              <td><span style={{ background:b.bg, color:b.color, padding:"2px 6px", borderRadius:8, fontWeight:900 }}>{b.name}</span></td>
              <td style={{ textAlign:"right" }}><button onClick={()=>del(b.id)}>Trinti</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}