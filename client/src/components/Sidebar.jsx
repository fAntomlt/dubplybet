import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import styled from "styled-components";
import {
  FiHome, FiUser, FiAward, FiBarChart2, FiChevronDown,
  FiMessageSquare, FiShield, FiMenu, FiLogOut, FiX
} from "react-icons/fi";
import logoImg from "../assets/icriblogo.png";

function getAuth() {
  try {
    const user = JSON.parse(localStorage.getItem("authUser") || "null");
    const token = localStorage.getItem("authToken");
    return user && token ? { user, token } : { user: null, token: null };
  } catch {
    return { user: null, token: null };
  }
}

const AvatarSmall = ({ name }) => {
  const initials = (name || "?")
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <AvatarBadge aria-hidden>{initials}</AvatarBadge>
  );
};

export default function Sidebar({ onOpenChat }) {
  const [open, setOpen] = useState({ leaderboards: false });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [auth, setAuth] = useState(getAuth());

  useEffect(() => {
    setAuth(getAuth());
    const onStorage = (e) => {
      if (e.key === "authUser" || e.key === "authToken") {
        setAuth(getAuth());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const closeIfMobile = () => { if (mobileOpen) setMobileOpen(false); };

  const handleLogout = () => {
    try {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      setAuth({ user: null, token: null });   // ← update local state immediately
      closeIfMobile();                        // collapse drawer on mobile
      // (optional) window.location.assign("/");  // if you also want a redirect
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };


  return (
    <>
      {/* MOBILE TOP BAR — like NBC: logo left, menu right */}
      <TopBar>
        <TopBrand to="/" onClick={closeIfMobile}>
          <LogoImg src={logoImg} alt="DubplyBet Logo" /> <span>DuBPly<span className="emph">BET</span></span>
        </TopBrand>
        <TopButton
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen(s => !s)}
        >
          {mobileOpen ? <FiX /> : <FiMenu />}
        </TopButton>
      </TopBar>

      {/* Backdrop for drawer */}
      {mobileOpen && <Backdrop onClick={() => setMobileOpen(false)} />}

      {/* SIDE NAV (desktop static, mobile off-canvas) */}
      <Nav $mobileOpen={mobileOpen}>
        <Brand to="/" $hide={mobileOpen} onClick={closeIfMobile}>
          <LogoImg src={logoImg} alt="DubplyBet Logo" /> <span>DuBPly<span className="emph">BET</span></span>
        </Brand>

        <Primary>
          <Item to="/" end onClick={closeIfMobile}>
            <FiHome /> <span>Pagrindinis</span>
          </Item>

          {auth.user ? (
            <Item to="/profilis" onClick={closeIfMobile}>
              <AvatarSmall name={auth.user?.username} />
              <span>{auth.user?.username || "Profilis"}</span>
            </Item>
          ) : (
            <Item to="/prisijungti" onClick={closeIfMobile}>
              <FiUser /> <span>Prisijungti / Registruotis</span>
            </Item>
          )}
        </Primary>

        <Divider />
        <SectionTitle>NAVIGACIJA</SectionTitle>

        <Item to="/turnyrai" onClick={closeIfMobile}>
          <FiAward /> <span>Turnyrai</span>
        </Item>

        <Group>
          <GroupHeader
            type="button"
            onClick={() => setOpen(s => ({ ...s, leaderboards: !s.leaderboards }))}
            aria-expanded={open.leaderboards}
          >
            <div><FiBarChart2 /> <span>Leaderboards</span></div>
            <Caret $open={open.leaderboards}><FiChevronDown/></Caret>
          </GroupHeader>

          {/* always render; slide with CSS */}
          <Submenu
            $open={open.leaderboards}
            onClick={e => e.stopPropagation()}
            aria-hidden={!open.leaderboards}
          >
            <SubItem to="/leaderboards/visu-laiku" onClick={closeIfMobile}>Visų laikų</SubItem>
            <SubItem to="/leaderboards/pagal-turnyra" onClick={closeIfMobile}>Pagal turnyrą</SubItem>
          </Submenu>
        </Group>

        <ButtonItem type="button" onClick={() => { onOpenChat?.(); closeIfMobile(); }}>
          <FiMessageSquare /> <span>Chat</span>
        </ButtonItem>

        <Item to="/admin" onClick={closeIfMobile}>
          <FiShield /> <span>Admin</span>
        </Item>

        {auth.user && (
          <LogoutRow type="button" onClick={handleLogout}>
            <FiLogOut />
            <span>Atsijungti</span>
          </LogoutRow>
        )}
      </Nav>
    </>
  );
}

/* ============== styles ============== */
const MOBILE_BP = 960; // px
const TOPBAR_H = 56;   // mobile top bar height

/* NBC-like fixed top bar (mobile only) */
const TopBar = styled.header`
  position: fixed;
  inset: 0 0 auto 0;
  height: ${TOPBAR_H}px;
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: #fff;
  border-bottom: 1px solid #eceff3;
  z-index: 1200;

  @media (max-width: ${MOBILE_BP - 1}px) { display: flex; }
`;

const TopBrand = styled(NavLink)`
  display: flex; align-items: center; gap: 10px;
  font-weight: 800; font-size: 20px; text-decoration: none; color: #0f172a;
  .emph { color: ${({theme}) => theme.colors.blue}; }
`;

const TopButton = styled.button`
  width: 40px; height: 40px; border-radius: 10px;
  border: 1px solid #eceff3; background: #fff; display: grid; place-items: center;
  cursor: pointer; svg { font-size: 20px; color: #0f172a; }
`;

const Backdrop = styled.div`
  @media (max-width: ${MOBILE_BP - 1}px) {
    position: fixed; inset: ${TOPBAR_H}px 0 0 0;
    background: rgba(15,23,42,0.28); z-index: 1090;
  }
`;

const Nav = styled.aside`
  width: 280px; min-width: 280px; background: #fff;
  border-right: 1px solid #eceff3; padding: 20px 16px;
  display: flex; flex-direction: column; gap: 8px;

  @media (min-width: ${MOBILE_BP}px) {
    position: relative; left: 0; height: auto; box-shadow: none; transition: none;
  }

  /* Off-canvas under the top bar */
  @media (max-width: ${MOBILE_BP - 1}px) {
    position: fixed; top: ${TOPBAR_H}px; left: ${({$mobileOpen}) => ($mobileOpen ? "0" : "-290px")};
    height: calc(100vh - ${TOPBAR_H}px); z-index: 1110;
    box-shadow: 0 10px 30px rgba(0,0,0,0.12);
    transition: left .22s ease-out;
  }
`;

const SectionTitle = styled.div`
  margin: 10px 8px 6px; font-size: 12px; font-weight: 700;
  letter-spacing: 0.06em; color: #8892a0; text-transform: uppercase;
`;

const Divider = styled.div`
  height: 1px; background: #eceff3; margin: 6px 8px 10px;
`;

const Primary = styled.div` display: grid; gap: 4px; margin-bottom: 8px; `;

const Item = styled(NavLink)`
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border-radius: 12px; color: #0f172a; text-decoration: none;

  transition: background-color .18s ease, color .18s ease;  /* ← fade in */

  &.active {
    background-color: #e8f1ff; /* same color, just animated */
    color: #1f6feb;
  }
  &:hover {
    background-color: #f5f7fb;
  }
  svg { font-size: 18px; }
`;

const Group = styled.div` display: grid; `;

const GroupHeader = styled.button`
  width: 100%; display: flex; justify-content: space-between; align-items: center;
  gap: 8px; padding: 10px 12px; border: 0; border-radius: 12px;
  background: transparent; color: #0f172a; cursor: pointer;

  transition: background-color .18s ease, color .18s ease;  /* subtle fade */

  &:hover { background-color: #f5f7fb; }
  > div { display: flex; align-items: center; gap: 10px; }
`;

const Caret = styled.span`
  display: grid; place-items: center; transition: transform .15s ease;
  transform: rotate(${p => (p.$open ? "180deg" : "0deg")});
`;

/* Slide/Fade rollout for submenu */
const Submenu = styled.div`
  display: grid;
  gap: 2px;
  padding-left: 12px;
  margin-top: 4px;

  max-height: ${({$open}) => ($open ? "220px" : "0px")};
  opacity: ${({$open}) => ($open ? 1 : 0)};
  transform: translateY(${({$open}) => ($open ? "0" : "-4px")});
  overflow: hidden;

  transition:
    max-height .24s ease,
    opacity .18s ease,
    transform .18s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  /* smooth slide-in of the links themselves (tiny stagger) */
  > a {
    opacity: ${({$open}) => ($open ? 1 : 0)};
    transform: translateY(${({$open}) => ($open ? "0" : "-6px")});
    transition: opacity .18s ease, transform .18s ease;
  }
  > a:nth-child(1) { transition-delay: ${({$open}) => ($open ? ".04s" : "0s")}; }
  > a:nth-child(2) { transition-delay: ${({$open}) => ($open ? ".08s" : "0s")}; }
`;

const SubItem = styled(NavLink)`
  padding: 8px 12px; border-radius: 10px; text-decoration: none;
  color: #0f172a; font-size: 14px;

  transition: background-color .18s ease, color .18s ease;

  &.active {
    background-color: #e8f1ff;
    color: #1f6feb;
  }
  &:hover { background-color: #f5f7fb; }
`;

const ButtonItem = styled.button`
  display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border-radius: 12px; color: #0f172a; background: transparent; border: none; cursor: pointer;

  transition: background-color .18s ease, color .18s ease;

  &:hover { background-color: #f5f7fb; }
  svg { font-size: 18px; }
`;

const Brand = styled(NavLink)`
  display:flex; align-items:center; gap:10px; padding:8px 10px; margin-bottom:20px;
  font-weight:800; font-size:22px; .emph{ color:${({theme})=>theme.colors.blue}; }

  /* Hide the sidebar logo ONLY on mobile when the drawer is open */
  @media (max-width: ${MOBILE_BP - 1}px) {
    display: ${({ $hide }) => ($hide ? "none" : "flex")};
  }
`;

const LogoImg = styled.img`
  width: 40px;
  height: 40px;
  object-fit: contain;
  display: block;
`;

const AvatarBadge = styled.span`
  display: inline-grid;
  place-items: center;
  width: 22px; height: 22px;
  border-radius: 50%;
  background: #e8f1ff;
  color: #1f6feb;
  font-size: 12px;
  font-weight: 800;
`;

const LogoutRow = styled.button`
  margin-top: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: transparent;
  border: 0;
  color: #ef4444;
  cursor: pointer;
  border-radius: 12px; /* match other buttons */

  svg {
    color: inherit;
    font-size: 18px;
    flex-shrink: 0;
  }

  span {
    font-weight: 700;
  }

  transition: background-color .18s ease, color .18s ease;

  &:hover {
    background-color: #f5f7fb; /* same as other sidebar items */
  }

  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.22);
  }
`;