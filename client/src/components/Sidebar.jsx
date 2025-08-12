import { useState } from "react";
import { NavLink } from "react-router-dom";
import styled from "styled-components";
import {
  FiHome,
  FiUser,
  FiAward,
  FiBarChart2,
  FiChevronDown,
  FiMessageSquare,
  FiShield
} from "react-icons/fi";

export default function Sidebar({ onOpenChat }) {
  const [open, setOpen] = useState({ leaderboards: false });

  return (
    <Nav>
      <Brand>
        <LogoDot /> <span>DuBPly<span className="emph">BET</span></span>
      </Brand>

      {/* PRIMARY (above PAGRINDINIS) */}
      <Primary>
        <Item to="/" end>
          <FiHome /> <span>Pagrindinis</span>
        </Item>

        <Item to="/profilis">
          <FiUser /> <span>Profilis</span>
        </Item>
      </Primary>
      <Divider />
      <SectionTitle>PAGRINDINIS</SectionTitle>

      {/* Turnyrai */}
      <Item to="/turnyrai">
        <FiAward /> <span>Turnyrai</span>
      </Item>

      {/* Leaderboards (expand/collapse) */}
      <Group>
        <GroupHeader
          type="button"
          onClick={() =>
            setOpen((s) => ({ ...s, leaderboards: !s.leaderboards }))
          }
          aria-expanded={open.leaderboards}
        >
          <div>
            <FiBarChart2 /> <span>Leaderboards</span>
          </div>
          <Caret $open={open.leaderboards}>
            <FiChevronDown />
          </Caret>
        </GroupHeader>

        {open.leaderboards && (
          <Submenu onClick={(e) => e.stopPropagation()}>
            <SubItem to="/leaderboards/visu-laiku">Visų laikų</SubItem>
            <SubItem to="/leaderboards/pagal-turnyra">Pagal turnyrą</SubItem>
          </Submenu>
        )}
      </Group>

      {/* Chat */}
      <ButtonItem type="button" onClick={onOpenChat}>
        <FiMessageSquare /> <span>Chat</span>
      </ButtonItem>

      {/* Admin */}
      <Item to="/admin">
        <FiShield /> <span>Admin</span>
      </Item>
    </Nav>
  );
}

/* ===================== styles ===================== */

const Nav = styled.aside`
  width: 280px;
  min-width: 280px;
  background: #fff;
  border-right: 1px solid #eceff3;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Logo = styled(NavLink)`
  font-weight: 800;
  font-size: 22px;
  color: #1f6feb; /* calm blue accent */
  text-decoration: none;
  margin-bottom: 12px;
`;

const SectionTitle = styled.div`
  margin: 10px 8px 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #8892a0;
  text-transform: uppercase;
`;

const Divider = styled.div`
  height: 1px;
  background: #eceff3;
  margin: 6px 8px 10px;
`;

const Primary = styled.div`
  display: grid;
  gap: 4px;
  margin-bottom: 8px;
`;

const Item = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  color: #0f172a;
  text-decoration: none;

  &.active {
    background: #e8f1ff;
    color: #1f6feb;
  }
  &:hover {
    background: #f5f7fb;
  }

  svg {
    font-size: 18px;
  }
`;

const Group = styled.div`
  display: grid;
`;

const GroupHeader = styled.button`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: #0f172a;
  cursor: pointer;

  &:hover {
    background: #f5f7fb;
  }

  > div {
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;

const Caret = styled.span`
  display: grid;
  place-items: center;
  transition: transform 0.15s ease;
  transform: rotate(${(p) => (p.$open ? "180deg" : "0deg")});
`;

const Submenu = styled.div`
  display: grid;
  gap: 2px;
  padding-left: 12px;
  margin-top: 4px;
`;

const SubItem = styled(NavLink)`
  padding: 8px 12px;
  border-radius: 10px;
  text-decoration: none;
  color: #0f172a;
  font-size: 14px;

  &.active {
    background: #e8f1ff;
    color: #1f6feb;
  }
  &:hover {
    background: #f5f7fb;
  }
`;

const ButtonItem = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  color: #0f172a;
  background: transparent;
  border: none;
  cursor: pointer;

  &:hover {
    background: #f5f7fb;
  }

  svg {
    font-size: 18px;
  }
`;

const Brand = styled.div`
  display:flex;align-items:center;gap:10px;
  padding:8px 10px;margin-bottom:20px;
  font-weight:800;font-size:22px;
  .emph{ color:${({theme})=>theme.colors.blue}; }
`;

const LogoDot = styled.div`
  width:10px;height:10px;border-radius:50%;
  background:${({theme})=>theme.colors.blue};
`;