import styled from 'styled-components';
import Sidebar from '../components/Sidebar';
import ChatDock from '../components/ChatDock';
import { useLocation } from 'react-router-dom';

const Wrap = styled.div`
  display: grid;
  grid-template-columns: ${({theme}) => theme.layout.sidebarWidth} 1fr;
  @media ${({theme}) => theme.mq.md} { grid-template-columns: 1fr; }
`;
const Content = styled.main`
  padding: 24px; max-width: ${({theme}) => theme.layout.maxContent};
`;

const AUTH_HIDDEN = ['/login','/register','/reset'];

export default function MainLayout({children}) {
  const { pathname } = useLocation();
  const hideShell = AUTH_HIDDEN.some(p => pathname.startsWith(p));
  return (
    <>
      <Wrap>
        {!hideShell && <Sidebar />}
        <Content style={{margin:'0 auto', width:'100%'}}>{children}</Content>
      </Wrap>
      {!hideShell && <ChatDock />}
    </>
  );
}