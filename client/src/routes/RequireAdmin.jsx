import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAuth, subscribe } from "../store/auth";

export default function RequireAdmin({ children }) {
  const [auth, setAuth] = useState(getAuth());
  const location = useLocation();

  useEffect(() => {
    const unsub = subscribe(setAuth);
    return () => unsub();
  }, []);

  const role = auth?.user?.role;
  if (role !== "admin") {
    // redirect away if not admin
    return <Navigate to="/" replace state={{ from: location }} />;
  }
  return children;
}