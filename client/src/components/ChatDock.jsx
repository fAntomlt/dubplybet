import styled from 'styled-components';
import { HiOutlineXMark } from 'react-icons/hi2';

export default function ChatDock({ open = false, onClose }) {
  return (
    <Wrap $open={open}>
      <Header>
        <strong>Chat</strong>
        <button onClick={onClose}><HiOutlineXMark size={18} /></button>
      </Header>
      <Body><Empty>Čia bus pokalbių langas.</Empty></Body>
      <InputBar>
        <input placeholder="Rašykite žinutę…" disabled />
        <button disabled>Siųsti</button>
      </InputBar>
    </Wrap>
  );
}

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
const InputBar = styled.div`
  border-top:1px solid ${({theme})=>theme.colors.line};
  padding:10px;display:flex;gap:8px;
  input{ flex:1; border:1px solid ${({theme})=>theme.colors.line}; border-radius:${({theme})=>theme.radii.md}; padding:10px 12px; }
  button{ background:${({theme})=>theme.colors.blue}; color:#fff; border:0; padding:10px 14px; border-radius:${({theme})=>theme.radii.md}; }
`;