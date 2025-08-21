// MainLayout.jsx
import { useState } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { useLocation, Outlet } from 'react-router-dom';
import { theme } from '../styles/theme';
import { GlobalStyle } from '../styles/GlobalStyle';
import Sidebar from '../components/Sidebar';
import ChatDock from '../components/ChatDock';

export default function MainLayout() {
  const [chatOpen, setChatOpen] = useState(false);
  const { pathname } = useLocation();
  const isHome = pathname === '/'; // adjust if your home path is different

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <Shell>
        <Sidebar onOpenChat={() => setChatOpen(v => !v)} />
        <Main>
          <Content $fullBleed={isHome}>
            <Outlet />
          </Content>
        </Main>
        <ChatDock open={chatOpen} onClose={() => setChatOpen(false)} />
      </Shell>
    </ThemeProvider>
  );
}

/* layout styling */
const Shell = styled.div`
  display: grid;
  grid-template-columns: 260px 1fr;
  height: 100dvh;              /* fixed viewport height (not min-height) */
  @media (max-width:960px){ grid-template-columns: 1fr; }
`;
const Main = styled.main`
  --main-pad-top: 24px;
  --main-pad-bottom: 24px;
  --main-pad-x: 24px;

  position: relative; z-index: 0;
  height: 100%;
  box-sizing: border-box;
  padding: var(--main-pad-top) var(--main-pad-x) var(--main-pad-bottom);
  overflow: auto;

  @media (max-width:960px){
    --main-pad-top: calc(16px + 56px);
    --main-pad-bottom: 16px;
    --main-pad-x: 16px;
    padding: var(--main-pad-top) var(--main-pad-x) var(--main-pad-bottom);
    overflow-x: hidden; /* clamps any accidental bleed */
  }
`;
const Content = styled.div`
  width: 100%;
  max-width: ${p => (p.$fullBleed ? 'none' : '1120px')};
  margin: ${p => (p.$fullBleed ? '0' : '0 auto')};
`;