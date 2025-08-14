import { useState } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { theme } from '../styles/theme';
import { GlobalStyle } from '../styles/GlobalStyle';
import Sidebar from '../components/Sidebar';
import ChatDock from '../components/ChatDock';
import { Outlet } from 'react-router-dom';

export default function MainLayout() {
  const [chatOpen, setChatOpen] = useState(false);
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <Shell>
        <Sidebar onOpenChat={() => setChatOpen(v=>!v)} />
        <Main><Content><Outlet /></Content></Main>
        <ChatDock open={chatOpen} onClose={() => setChatOpen(false)} />
      </Shell>
    </ThemeProvider>
  );
}

/* layout styling */
const Shell = styled.div`
  display:grid; grid-template-columns:260px 1fr; min-height:100vh;
  @media (max-width:960px){ grid-template-columns: 1fr; }
`;
const Main = styled.main` padding:24px; @media (max-width:960px){ padding: calc(16px + 56px) 16px 16px; }`;
const Content = styled.div` max-width:1120px; margin:0 auto; `;