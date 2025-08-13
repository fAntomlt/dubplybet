// client/src/components/ChatDock.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import { HiOutlineXMark } from 'react-icons/hi2';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';

function getAuth() {
  try {
    const user = JSON.parse(localStorage.getItem('authUser') || 'null');
    const token = localStorage.getItem('authToken');
    return user && token ? { user, token } : { user: null, token: null };
  } catch {
    return { user: null, token: null };
  }
}

export default function ChatDock({ open = false, onClose }) {
  const [{ user, token }, setAuth] = useState(getAuth());
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);
  const socketRef = useRef(null);

  const API = import.meta.env.VITE_API_URL; // same base you use for REST

  // keep auth in sync if storage changes
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'authUser' || e.key === 'authToken') {
        setAuth(getAuth());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // fetch last 50 on open
  useEffect(() => {
    let cancelled = false;
    async function loadHistory() {
      if (!open) return;
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/chat/history?limit=50`);
        const data = await res.json();
        if (!cancelled && data?.ok) {
          setMessages(data.items || []);
          // scroll to bottom after load
          setTimeout(() => listRef.current?.scrollTo({ top: 999999, behavior: 'instant' }), 0);
        }
      } catch {}
      setLoading(false);
    }
    loadHistory();
    return () => { cancelled = true; };
  }, [open, API]);

  // socket connect when panel is open + user authenticated
  useEffect(() => {
    if (!open || !token) return;

    const s = io(API, {
      transports: ['websocket'],
      auth: { token }
    });
    socketRef.current = s;

    s.on('chat:new', (msg) => {
      setMessages((prev) => [...prev, msg]);
      // keep scrolled to bottom when new messages arrive
      setTimeout(() => listRef.current?.scrollTo({ top: 999999, behavior: 'smooth' }), 0);
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [open, token, API]);

  const canSend = !!user && input.trim().length > 0;

  function onSubmit(e) {
    e.preventDefault();
    const content = input.trim();
    if (!content || !socketRef.current) return;
    socketRef.current.emit('chat:send', { content });
    setInput('');
  }

  return (
    <Wrap $open={open}>
      <Header>
        <strong>Chat</strong>
        <button onClick={onClose}><HiOutlineXMark size={18} /></button>
      </Header>

      <Body ref={listRef}>
        {loading && <Empty>Kraunama…</Empty>}

        {!loading && messages.length === 0 && (
          <Empty>Žinučių nėra. Būkite pirmas!</Empty>
        )}

        {!loading && messages.length > 0 && (
          <List>
            {messages.map(m => (
              <Msg key={m.id}>
                <User>{m.username}</User>
                <Text>{m.content}</Text>
                <Time>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Time>
              </Msg>
            ))}
          </List>
        )}
      </Body>

      <InputBar as="form" onSubmit={onSubmit}>
        {user ? (
          <>
            <input
              placeholder="Rašykite žinutę…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
            />
            <button type="submit" disabled={!canSend}>Siųsti</button>
          </>
        ) : (
          <Guest>
            Prisijunk, jog galėtum rašyti žinutes.{' '}
            <Link to="/prisijungti">Prisijunk</Link>
          </Guest>
        )}
      </InputBar>
    </Wrap>
  );
}

/* === styles (your base, untouched palette) === */
const Wrap = styled.section`
  position:fixed;right:20px;bottom:20px;width:360px;max-height:60vh;
  background:${({theme})=>theme.colors.bg};
  border:1px solid ${({theme})=>theme.colors.line};
  border-radius:${({theme})=>theme.radii.lg};
  box-shadow:${({theme})=>theme.shadow};
  overflow:hidden;
  transform:translateY(${p=>p.$open?'0':'12px'});
  opacity:${p=>p.$open?1:0};
  pointer-events:${p=>p.$open?'auto':'none'};
  transition:.18s ease;
  @media (max-width:640px){ right:12px; left:12px; width:auto; }
`;
const Header = styled.header`
  display:flex;align-items:center;justify-content:space-between;
  padding:10px 12px;border-bottom:1px solid ${({theme})=>theme.colors.line};
  button{ border:0;background:transparent;cursor:pointer;color:${({theme})=>theme.colors.subtext}; }
`;
const Body = styled.div` overflow:auto; max-height:38vh; `;
const Empty = styled.div` padding:16px; color:${({theme})=>theme.colors.subtext}; `;

const List = styled.div` padding: 8px 10px 10px; display: grid; gap: 8px; `;
const Msg = styled.div`
  display:grid; grid-template-columns:auto 1fr auto; gap:8px; align-items:center;
`;
const User = styled.span` font-weight:700; color:#0f172a; `;
const Text = styled.span` color:#0f172a; word-break: break-word; `;
const Time = styled.span` color:${({theme})=>theme.colors.subtext}; font-size:12px; `;

const InputBar = styled.div`
  border-top:1px solid ${({theme})=>theme.colors.line};
  padding:10px;display:flex;gap:8px;
  input{
    flex:1; border:1px solid ${({theme})=>theme.colors.line};
    border-radius:${({theme})=>theme.radii.md}; padding:10px 12px;
    background:#fff; color:#0f172a;
  }
  button{
    background:${({theme})=>theme.colors.blue}; color:#fff; border:0;
    padding:10px 14px; border-radius:${({theme})=>theme.radii.md};
  }
`;
const Guest = styled.div`
  width:100%; text-align:center; color:${({theme})=>theme.colors.subtext};
  a{ color:${({theme})=>theme.colors.blue}; text-decoration:none; }
  a:hover{ text-decoration:underline; }
`;