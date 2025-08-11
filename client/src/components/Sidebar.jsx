import styled from 'styled-components';
import { NavLink } from 'react-router-dom';
import { useState } from 'react';

const Shell = styled.aside`
  width: ${({theme}) => theme.layout.sidebarWidth};
  background: #0B1220;
  border-right: 1px solid #1f2937;
  padding: 20px;
  position: sticky; top: 0; height: 100vh;
  @media ${({theme}) => theme.mq.md} {
    position: fixed; left: 0; top: 0; height: 100%; z-index: 50;
    transform: ${({$open}) => $open ? 'translateX(0)' : 'translateX(-100%)'};
    transition: transform .25s ease;
  }
`;

const Brand = styled.div`
  font-weight: 800; font-size: 22px; letter-spacing: .5px;
  color: ${({theme}) => theme.colors.primary};
  margin-bottom: 24px;
`;

const GroupTitle = styled.div`
  margin: 18px 0 8px; color: ${({theme}) => theme.colors.subtle}; font-size: 13px;
`;

const Item = styled(NavLink)`
  display: block; padding: 10px 12px; border-radius: 10px; color: #E5E7EB;
  &.active, &:hover {
    background: rgba(47,107,166,.18);
    color: ${({theme}) => theme.colors.text};
  }
`;

const Overlay = styled.div`
  display: none;
  @media ${({theme}) => theme.mq.md} {
    display: ${({$open}) => $open ? 'block' : 'none'};
    position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 40;
  }
`;

const Burger = styled.button`
  display: none;
  @media ${({theme}) => theme.mq.md} {
    display: inline-flex; align-items: center; gap: 8px;
    background: ${({theme}) => theme.colors.primary};
    padding: 8px 12px; margin: 10px;
    position: fixed; top: 0; left: 0; z-index: 60;
  }
`;

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <Burger onClick={() => setOpen(v => !v)}>☰ Meniu</Burger>
      <Overlay $open={open} onClick={close} />
      <Shell $open={open} onClick={close}>
        <Brand>DuBPlyBET</Brand>

        <Item to="/profile">Profilis</Item>

        <GroupTitle>Pagrindinis</GroupTitle>
        <Item to="/tournaments">Turnyrai</Item>

        <Item to="/leaderboards/all-time">Leaderboards · Visų laikų</Item>
        <Item to="/leaderboards/tournaments">Leaderboards · Pagal turnyrą</Item>

        <GroupTitle>Kita</GroupTitle>
        <Item to="#" onClick={(e)=>e.preventDefault()}>Chat</Item>

        <GroupTitle>Admin</GroupTitle>
        <Item to="/admin">Administravimas</Item>
      </Shell>
    </>
  );
}