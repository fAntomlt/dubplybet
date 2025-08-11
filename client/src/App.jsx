import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import GlobalStyle from './styles/GlobalStyle';
import theme from './theme';

import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Tournaments from './pages/Tournaments';
import TournamentDetail from './pages/TournamentDetail';
import LeaderboardsAllTime from './pages/LeaderboardsAllTime';
import LeaderboardsByTournament from './pages/LeaderboardsByTournament';
import Login from './pages/Login';
import Register from './pages/Register';
import Reset from './pages/Reset';
import Profile from './pages/Profile';
import Admin from './pages/Admin';

export default function App(){
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/tournaments/:id" element={<TournamentDetail />} />
            <Route path="/leaderboards/all-time" element={<LeaderboardsAllTime />} />
            <Route path="/leaderboards/tournaments" element={<LeaderboardsByTournament />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />

            {/* auth pages — shell hidden via MainLayout */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset" element={<Reset />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </ThemeProvider>
  );
}