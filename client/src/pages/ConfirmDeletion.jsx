import { useEffect, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import styled from "styled-components";

export default function ConfirmDeletion() {
  const nav = useNavigate();
  const loc = useLocation();
  const [busy, setBusy] = useState(false);
  const token = new URLSearchParams(loc.search).get("token") || "";

  useEffect(() => { document.title = "Patvirtinti ištrynimą – DuBPlyBET"; }, []);

  const submit = async () => {
    if (!token) {
      nav("/prisijungti?deleted=0&reason=missing", { replace: true }); return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/users/delete-confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      // Server 303-redirects to /prisijungti?deleted=1 or ?deleted=0...
      // But SPA fetch won't follow cross-origin 303 into a browser nav, so handle JSON fallback:
      if (res.redirected) {
        window.location.href = res.url;
        return;
      }
      // In most setups the server redirects; as a fallback:
      nav("/prisijungti?deleted=1", { replace: true });
    } catch {
      nav("/prisijungti?deleted=0&reason=server", { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Wrap>
      <Card>
        <h1>Patvirtinti paskyros ištrynimą</h1>
        {!token ? (
          <p>Neteisinga ar trūkstama nuoroda.</p>
        ) : (
          <>
            <p>Ar tikrai norite <strong>negrįžtamai</strong> ištrinti paskyrą?</p>
            <Actions>
              <Danger onClick={submit} disabled={busy}>{busy ? "Trinama…" : "Taip, ištrinti"}</Danger>
              <Link to="/prisijungti">Ne, atgal</Link>
            </Actions>
          </>
        )}
      </Card>
    </Wrap>
  );
}

const Wrap = styled.div`min-height:100dvh;display:grid;place-items:center;padding:24px;background:#fff;`;
const Card = styled.section`max-width:560px;width:100%;border:1px solid #eceff3;border-radius:24px;background:#fff;padding:24px;display:grid;gap:12px;`;
const Actions = styled.div`display:flex;gap:12px;align-items:center;`;
const Danger = styled.button`border:1px solid #fecaca;background:#fee2e2;color:#991b1b;font-weight:800;border-radius:12px;padding:12px 16px;cursor:pointer;&:disabled{opacity:.6;}`;