import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { HiOutlineXMark } from 'react-icons/hi2';

export default function ChatDock({ open = false, onClose }) {
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([
    // seed with a friendly greeting (optional)
    { id: 'seed-1', role: 'bot', text: 'Sveiki! Rašykite žinutę žemiau.', ts: Date.now() }
  ]);

  const listRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-focus input when dock opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Auto-scroll on new messages
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const handleSend = async () => {
    const text = msg.trim();
    if (!text || sending) return;
    setSending(true);

    const myMsg = {
      id: crypto.randomUUID(),
      role: 'me',
      text,
      ts: Date.now(),
    };
    setMessages((m) => [...m, myMsg]);
    setMsg('');

    try {
      // TODO: hook to your backend/websocket here.
      // Example (future): POST `${import.meta.env.VITE_API_URL}/api/chat`
      // For now, simulate a fast reply so UI is testable:
      setTimeout(() => {
        setMessages((m) => [
          ...m,
          {
            id: crypto.randomUUID(),
            role: 'bot',
            text: 'Gavau žinutę 👍 (čia pavyzdinis atsakymas).',
            ts: Date.now(),
          },
        ]);
        setSending(false);
      }, 450);
    } catch {
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: 'bot',
          text: 'Nepavyko išsiųsti. Bandykite dar kartą.',
          ts: Date.now(),
          error: true,
        },
      ]);
      setSending(false);
    }
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
            {messages.map(m => (
              <Row key={m.id} $me={m.role === 'me'}>
                <Bubble $me={m.role === 'me'} $error={m.error}>
                  {m.text}
                </Bubble>
              </Row>
            ))}
          </List>
        )}
      </Body>

      <InputBar>
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
      </InputBar>
    </Wrap>
  );
}

/* ============ styles (kept your palette) ============ */

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

const Body = styled.div`
  overflow:auto; max-height:38vh;
`;

const Empty = styled.div`
  padding:16px; color:${({theme})=>theme.colors.subtext};
`;

const List = styled.div`
  display:grid; gap:8px; padding:12px;
`;

const Row = styled.div`
  display:flex;
  justify-content:${p=>p.$me ? 'flex-end' : 'flex-start'};
`;

const Bubble = styled.div`
  max-width: 85%;
  padding:10px 12px;
  border-radius: 14px;
  line-height: 1.25;
  color:#0f172a;
  background: ${({$me, theme}) => $me ? '#e8f1ff' : '#f5f7fb'};
  border: 1px solid ${({theme})=>theme.colors.line};
  ${({$me}) => $me && `color: #1f6feb;`}
  ${({$error}) => $error && `
    background: #fff4f4;
    border-color: #ffd4d4;
    color: #8b1f1f;
  `}
`;

const InputBar = styled.div`
  border-top:1px solid ${({theme})=>theme.colors.line};
  padding:10px;display:flex;gap:8px;
`;

const Input = styled.textarea`
  flex:1;
  resize: none;
  max-height: 120px;
  min-height: 44px;
  border:1px solid ${({theme})=>theme.colors.line};
  border-radius:${({theme})=>theme.radii.md};
  padding:10px 12px;
  background:${({theme})=>theme.colors.bg};
  color:#0f172a;
  line-height:1.3;
  &:disabled { opacity:.6; cursor:not-allowed; }
`;

const SendBtn = styled.button`
  background:${({theme})=>theme.colors.blue};
  color:#fff; border:0; padding:10px 14px; border-radius:${({theme})=>theme.radii.md};
  font-weight:700;
  &:disabled { opacity:.6; cursor:not-allowed; }
`;