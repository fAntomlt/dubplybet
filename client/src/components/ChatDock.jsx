import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { HiOutlineXMark } from 'react-icons/hi2';
import { io } from 'socket.io-client';
import { Link } from 'react-router-dom';

export default function ChatDock({ open = false, onClose }) {
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const socketRef = useRef(null);

  const API_URL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem('authToken');
  const authUser = safeParse(localStorage.getItem('authUser')); // { username, ... } or null
  const myName = authUser?.username || null;

  // focus input on open
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // keep scrolled to bottom
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  // fetch history
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/chat/history?limit=50`);
        const data = await res.json();
        if (data.ok) {
          setMessages(
            (data.items || []).map(m => ({
              id: m.id,
              username: m.username,
              text: m.content,
              ts: new Date(m.createdAt).getTime(),
            }))
          );
        }
      } catch (err) {
        console.error('History fetch error', err);
      }
    })();
  }, [open, API_URL]);

  // websocket
  useEffect(() => {
    if (!open || !token) return;

    const s = io(API_URL, {
      transports: ['websocket'],
      auth: { token },
    });

    s.on('connect', () => {
      console.log('Connected to chat server');
    });

    s.on('chat:new', (msg) => {
      setMessages(prev => [
        ...prev,
        {
          id: msg.id,
          username: msg.username,
          text: msg.content,
          ts: new Date(msg.createdAt).getTime(),
        },
      ]);
    });

    s.on('disconnect', () => {
      console.log('Disconnected from chat');
    });

    socketRef.current = s;
    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [open, token, API_URL]);

  const handleSend = () => {
    const text = msg.trim();
    if (!text || !socketRef.current || sending) return;
    setSending(true);

    // emit only; no local echo (server broadcast will add it)
    socketRef.current.emit('chat:send', { content: text });

    setMsg('');
    setSending(false);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Wrap $open={open}>
      <Header>
        <strong>Chat</strong>
        <button onClick={onClose}><HiOutlineXMark size={18} /></button>
      </Header>

      <Body ref={listRef}>
        {messages.length === 0 ? (
          <Empty>Čia bus pokalbių langas.</Empty>
        ) : (
          <List>
            {messages.map(m => {
              const isMine = !!myName && m.username === myName;
              return (
                <Msg key={m.id}>
                  <MsgHead>
                    <Avatar>{initials(m.username)}</Avatar>
                    <Meta>
                      <Name>{m.username}</Name>
                      <Time>{formatTime(m.ts)}</Time>
                    </Meta>
                  </MsgHead>
                  <Bubble $me={isMine}>{m.text}</Bubble>
                </Msg>
              );
            })}
          </List>
        )}
      </Body>

      <InputBar>
        {token ? (
          <>
            <Input
              ref={inputRef}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Rašykite žinutę…"
              disabled={!open || sending}
            />
            <SendBtn onClick={handleSend} disabled={!msg.trim() || sending}>
              {sending ? 'Siunčiama…' : 'Siųsti'}
            </SendBtn>
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

/* helpers */
function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map(s => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'U';
}
function formatTime(ts) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}
function safeParse(str) {
  try { return JSON.parse(str || 'null'); } catch { return null; }
}

/* ====== styles ====== */

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
const List = styled.div` display:grid; gap:12px; padding:12px; `;
const Msg = styled.div` display:grid; gap:6px; `;
const MsgHead = styled.div`
  display:grid; grid-template-columns: 32px 1fr; gap:8px; align-items:center;
`;
const Avatar = styled.div`
  width:32px;height:32px;border-radius:50%;
  display:grid;place-items:center;
  background:#e8f1ff;color:#1f6feb;font-weight:800;font-size:12px;
  border:1px solid ${({theme})=>theme.colors.line};
`;
const Meta = styled.div` display:flex; align-items:baseline; gap:8px; `;
const Name = styled.span` font-weight:700; color:#0f172a; font-size:13px; `;
const Time = styled.span` color:${({theme})=>theme.colors.subtext}; font-size:12px; `;
const Bubble = styled.div`
  border:1px solid ${({theme})=>theme.colors.line};
  border-radius:14px;
  padding:10px 12px;
  line-height:1.25;
  word-break: break-word;
  background: ${({$me}) => ($me ? '#ddebffff' : '#f5f7fb')};
  color: #0f172a;
`;
const InputBar = styled.div`
  border-top:1px solid ${({theme})=>theme.colors.line};
  padding:10px;display:flex;gap:8px;align-items:center;min-height:64px;
`;
const Input = styled.textarea`
  flex:1; resize:none; max-height:120px; min-height:44px;
  border:1px solid ${({theme})=>theme.colors.line};
  border-radius:${({theme})=>theme.radii.md};
  padding:10px 12px; background:${({theme})=>theme.colors.bg};
  color:#0f172a; line-height:1.3;
  &:focus {
  background: #ffffff;
  border: none;
  outline: none; /* removes browser default focus outline */
  box-shadow: 0 0 0 3px #e8f1ff; /* optional glow */
}
  &:disabled { opacity:.6; cursor:not-allowed; }
`;
const SendBtn = styled.button`
  background:${({theme})=>theme.colors.blue};
  color:#fff; border:0; padding:10px 14px; border-radius:${({theme})=>theme.radii.md};
  font-weight:700; &:disabled { opacity:.6; cursor:not-allowed; }
`;
const Guest = styled.div`
  width:100%; text-align:center; color:${({theme})=>theme.colors.subtext};
  a{ color:${({theme})=>theme.colors.blue}; text-decoration:none; }
  a:hover{ text-decoration:underline; }
`;