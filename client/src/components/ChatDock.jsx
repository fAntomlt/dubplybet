import styled from 'styled-components';
import { useState } from 'react';

const Btn = styled.button`
  position: fixed; right: 20px; bottom: 20px; z-index: 30;
  background: ${({theme}) => theme.colors.primary};
  padding: 12px 16px; color: white;
  box-shadow: ${({theme}) => theme.shadow.soft};
`;

const Panel = styled.div`
  position: fixed; right: 20px; bottom: 70px; width: 340px; height: 420px;
  background: ${({theme}) => theme.colors.surface};
  border: 1px solid #1f2937; border-radius: ${({theme}) => theme.radius.md};
  box-shadow: ${({theme}) => theme.shadow.hard};
  display: ${({$open}) => $open ? 'flex' : 'none'};
  flex-direction: column; z-index: 30; overflow: hidden;
`;

const Header = styled.div`
  padding: 10px 12px; border-bottom: 1px solid #1f2937; font-weight: 600;
`;

const Body = styled.div`
  flex: 1; padding: 10px; color: ${({theme}) => theme.colors.subtle};
`;

export default function ChatDock(){
  const [open,setOpen]=useState(false);
  return (
    <>
      <Panel $open={open}>
        <Header>Chat</Header>
        <Body>(UI tik apvalkalas — realtime vėliau)</Body>
      </Panel>
      <Btn onClick={()=>setOpen(v=>!v)}>{open?'Uždaryti chat':'Atidaryti chat'}</Btn>
    </>
  );
}