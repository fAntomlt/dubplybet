import { useState } from 'react';
import styled from 'styled-components';
import { NavLink } from 'react-router-dom';
import {
  HiOutlineHome, HiOutlineUser, HiOutlineTrophy,
  HiOutlineChatBubbleBottomCenterText,
  HiOutlineChevronDown, HiOutlineChevronUp
} from 'react-icons/hi2';

export default function Sidebar({ onOpenChat }) {
  const [lbOpen, setLbOpen] = useState(false);

  return (
    <Wrap>
      <Brand>
        <LogoDot /> <span>DuBPly<span className="emph">BET</span></span>
      </Brand>

      <Group>
        <SectionTitle>Pagrindinis</SectionTitle>

        <Item to="/" end>
          <HiOutlineHome size={20} />
          <span>Profilis</span>
        </Item>

        <Item to="/tournaments">
          <HiOutlineTrophy size={20} />
          <span>Turnyrai</span>
        </Item>

        <Item as="button" onClick={() => setLbOpen(v => !v)} $button>
          <HiOutlineTrophy size={20} />
          <span>Leaderboards</span>
          <Chevron>{lbOpen ? <HiOutlineChevronUp size={18}/> : <HiOutlineChevronDown size={18}/>}</Chevron>
        </Item>

        {lbOpen && (
          <Submenu>
            <SubItem to="/leaderboards/all-time">• Visų laikų</SubItem>
            <SubItem to="/leaderboards/by-tournament">• Pagal turnyrą</SubItem>
          </Submenu>
        )}

        <Item as="button" onClick={onOpenChat} $button>
          <HiOutlineChatBubbleBottomCenterText size={20} />
          <span>Chat</span>
        </Item>

        <Item to="/admin">
          <HiOutlineUser size={20} />
          <span>Adminas</span>
        </Item>
      </Group>
    </Wrap>
  );
}

/* styles */
const Wrap = styled.aside`
  border-right: 1px solid ${({theme}) => theme.colors.line};
  padding: 20px 16px;
  background: ${({theme}) => theme.colors.bg};
`;
const Brand = styled.div`
  display:flex;align-items:center;gap:10px;
  padding:8px 10px;margin-bottom:20px;
  font-weight:800;font-size:18px;
  .emph{ color:${({theme})=>theme.colors.blue}; }
`;
const LogoDot = styled.div`
  width:10px;height:10px;border-radius:50%;
  background:${({theme})=>theme.colors.blue};
`;
const Group = styled.nav`display:flex;flex-direction:column;gap:6px;`;
const SectionTitle = styled.div`
  font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
  color:${({theme})=>theme.colors.subtext};
  padding:10px 10px;margin:8px 0 6px;
  border-bottom:1px solid ${({theme})=>theme.colors.line};
`;
const ItemBase = styled(NavLink)`
  display:flex;align-items:center;gap:10px;
  padding:10px 12px;border-radius:${({theme})=>theme.radii.md};
  color:${({theme})=>theme.colors.text};
  border:1px solid transparent;transition:background .15s,border-color .15s;
  &.active{ background:${({theme})=>theme.colors.blueSoft}; border-color:${({theme})=>theme.colors.blue}; }
  &:hover{ background:${({theme})=>theme.colors.blueSoft}; }
`;
const Item = styled(ItemBase).attrs(p => ({ as: p.$button ? 'button' : undefined }))`
  justify-content:flex-start;width:100%;text-align:left;background:transparent;cursor:pointer;position:relative;
`;
const Chevron = styled.span`
  margin-left:auto;display:flex;align-items:center;color:${({theme})=>theme.colors.subtext};
`;
const Submenu = styled.div`
  display:grid;gap:4px;margin:0 0 6px 36px;padding-left:8px;border-left:2px solid ${({theme})=>theme.colors.line};
`;
const SubItem = styled(NavLink)`
  display:block;padding:6px 0;color:${({theme})=>theme.colors.subtext};
  &:hover{ color:${({theme})=>theme.colors.text}; }
  &.active{ color:${({theme})=>theme.colors.blue}; font-weight:600; }
`;