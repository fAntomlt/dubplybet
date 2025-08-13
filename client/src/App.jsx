import { useRoutes, Navigate } from "react-router-dom";
import MainLayout from "./layouts/MainLayout.jsx";

// pages
import Home from "./pages/Home.jsx";
import Tournaments from "./pages/Tournaments.jsx";
import TournamentDetail from "./pages/TournamentDetail.jsx";
import LeaderboardsAllTime from "./pages/LeaderboardsAllTime.jsx";
import LeaderboardsByTournament from "./pages/LeaderboardsByTournament.jsx";
import Profile from "./pages/Profile.jsx";
import Admin from "./pages/Admin.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";

function AppRoutes() {
  const routes = useRoutes([
    {
      element: <MainLayout />,     // left sidebar + chat dock, etc.
      children: [
        { path: "/", element: <Home /> },
        { path: "/turnyrai", element: <Tournaments /> },
        { path: "/turnyrai/:id", element: <TournamentDetail /> },

        {
          path: "/leaderboards",
          children: [
            { index: true, element: <Navigate to="visu-laiku" replace /> },
            { path: "visu-laiku", element: <LeaderboardsAllTime /> },
            { path: "pagal-turnyra", element: <LeaderboardsByTournament /> },
          ],
        },

        { path: "/profilis", element: <Profile /> },
        { path: "/admin", element: <Admin /> },
      ],
    },

    // auth flows live outside the main layout
    { path: "/prisijungti", element: <Login /> },
    { path: "/registruotis", element: <Register /> },
    { path: "/priminti-slaptazodi", element: <ForgotPassword /> },
    { path: "/atstatyti-slaptazodi", element: <ResetPassword /> },
    { path: "*", element: <Navigate to="/" replace /> },
  ]);

  return routes;
}

export default function App() {
  return <AppRoutes />;
}