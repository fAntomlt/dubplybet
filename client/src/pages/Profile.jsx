import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { FiUser, FiHash, FiLock, FiEdit3, FiX, FiCheck } from "react-icons/fi";
import logoImg from "../assets/icriblogo.png";
import { useToast } from "../components/ToastProvider";

// small helper
function roleLT(role) {
  return role === "admin" ? "Administratorius" : "Narys";
}

export default function Profile() {
  const toast = useToast();
  const API = import.meta.env.VITE_API_URL;

  const token = useMemo(() => localStorage.getItem("authToken") || "", []);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState("");

  const [me, setMe] = useState(null); // { id,email,username,discordUsername,role }
  const [edit, setEdit] = useState({
    field: null, // 'username' | 'discord' | 'password' | null
  });

  // Discord: 2–32 chars, only a–z 0–9 _ . , no consecutive ".."
  const DISCORD_RE = /^(?!.*\.\.)[a-z0-9._]{2,32}$/;

  // controlled values for edits
  const [username, setUsername] = useState("");
  const [discord, setDiscord] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");

  // load me
  useEffect(() => {
    document.title = "Profilis – DuBPlyBET";
    let alive = true;
    (async () => {
      setLoading(true);
      setServerError("");
      try {
        const res = await fetch(`${API}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          setServerError(data?.error || "Nepavyko nuskaityti profilio.");
          setLoading(false);
          return;
        }
        if (!alive) return;
        setMe(data.user);
        setUsername(data.user.username || "");
        setDiscord(data.user.discordUsername || "");
      } catch {
        setServerError("Serverio klaida. Bandykite vėliau.");
      } finally {
        setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [API, token]);

  const startEdit = (field) => {
    setEdit({ field });
    setServerError("");
    setConfirmPwd("");
    setOldPwd("");
    setNewPwd("");
    setNewPwd2("");
  };
  const cancelEdit = () => {
    // reset values to current data
    setUsername(me?.username || "");
    setDiscord(me?.discordUsername || "");
    setConfirmPwd("");
    setOldPwd("");
    setNewPwd("");
    setNewPwd2("");
    setEdit({ field: null });
  };

  const saveUsernameDiscord = async () => {
    if (!edit.field) return;

    setServerError("");

    try {
      const body = {
        currentPassword: confirmPwd,
        ...(edit.field === "username" ? { username: username.trim() } : {}),
      };

      if (edit.field === "discord") {
        // Normalize and validate Discord username:
        // - trim
        // - remove leading '@' if present
        // - force lowercase
        const discordNormalized = (discord || "")
          .trim()
          .replace(/^@/, "")
          .toLowerCase();

        if (!DISCORD_RE.test(discordNormalized)) {
          setServerError(
            "Neteisingas Discord vardas (2–32, tik raidės/skaičiai, _ ir ., be '..')."
          );
          return;
        }
        body.discordUsername = discordNormalized;
      }

      const res = await fetch(`${API}/api/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setServerError(data?.error || "Nepavyko išsaugoti pakeitimų.");
        return;
      }
      toast.success("Pakeitimai išsaugoti");
      setMe(m => ({
        ...m,
        username: body.username ?? m.username,
        discordUsername: body.discordUsername ?? m.discordUsername,
      }));
      // also keep localStorage authUser in sync if changed
      try {
        const authUser = JSON.parse(localStorage.getItem("authUser") || "null");
        if (authUser) {
          if (body.username) authUser.username = body.username;
          if (body.discordUsername) authUser.discordUsername = body.discordUsername;
          localStorage.setItem("authUser", JSON.stringify(authUser));
        }
      } catch {}
      cancelEdit();
    } catch {
      setServerError("Serverio klaida. Bandykite vėliau.");
    }
  };

  const savePassword = async () => {
    if (!oldPwd || !newPwd || !newPwd2) {
      setServerError("Užpildykite visus laukus.");
      return;
    }
    if (newPwd !== newPwd2) {
      setServerError("Slaptažodžiai nesutampa");
      return;
    }
    try {
      const res = await fetch(`${API}/api/users/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldPassword: oldPwd,
          password: newPwd,
          confirmPassword: newPwd2,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setServerError(data?.error || "Nepavyko atnaujinti slaptažodžio.");
        return;
      }
      toast.success("Slaptažodis atnaujintas");
      cancelEdit();
    } catch {
      setServerError("Serverio klaida. Bandykite vėliau.");
    }
  };

  if (loading) return <Load>Kraunama…</Load>;
  if (serverError && !me) {
    return <Load role="alert">{serverError}</Load>;
  }

  const name = me?.username || "Vartotojas";

  return (
    <Wrap>
      <Grid>
        {/* Left */}
        <Left>
          <Avatar>
            <img src={logoImg} alt="Avatar" />
          </Avatar>
          <Name>{name}</Name>
          <Role>{roleLT(me?.role)}</Role>
        </Left>

        {/* Right */}
        <Right>
          {!!serverError && <Alert role="alert">{serverError}</Alert>}

          <Field>
            <Label><FiUser /> Slapyvardis</Label>
            <Row $editing={edit.field === "username"}>
              <Input
                disabled={edit.field !== "username"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Jūsų vardas"
              />
              {edit.field === "username" ? (
                <BtnRow>
                  <IconBtn onClick={saveUsernameDiscord} aria-label="Išsaugoti"><FiCheck /></IconBtn>
                  <IconBtn onClick={cancelEdit} aria-label="Atšaukti"><FiX /></IconBtn>
                </BtnRow>
              ) : (
                <IconBtn onClick={() => startEdit("username")} aria-label="Redaguoti"><FiEdit3 /></IconBtn>
              )}
            </Row>

            {edit.field === "username" && (
              <Expand>
                <SubLabel>Patvirtinkite slaptažodį</SubLabel>
                <Input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="●●●●●●●●"
                />
              </Expand>
            )}
          </Field>

          <Field>
            <Label><FiHash /> Discord Nick</Label>
            <Row $editing={edit.field === "discord"}>
              <Input
                disabled={edit.field !== "discord"}
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
                placeholder="vardas"
              />
              {edit.field === "discord" ? (
                <BtnRow>
                  <IconBtn onClick={saveUsernameDiscord} aria-label="Išsaugoti"><FiCheck /></IconBtn>
                  <IconBtn onClick={cancelEdit} aria-label="Atšaukti"><FiX /></IconBtn>
                </BtnRow>
              ) : (
                <IconBtn onClick={() => startEdit("discord")} aria-label="Redaguoti"><FiEdit3 /></IconBtn>
              )}
            </Row>

            {edit.field === "discord" && (
              <Expand>
                <SubLabel>Patvirtinkite slaptažodį</SubLabel>
                <Input
                  type="password"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  placeholder="●●●●●●●●"
                />
              </Expand>
            )}
          </Field>

          <Field>
            <Label><FiLock /> Slaptažodis</Label>
            <Row $editing={edit.field === "password"}>
              <Input value="********" disabled />
              {edit.field === "password" ? (
                <BtnRow>
                  <IconBtn onClick={savePassword} aria-label="Išsaugoti"><FiCheck /></IconBtn>
                  <IconBtn onClick={cancelEdit} aria-label="Atšaukti"><FiX /></IconBtn>
                </BtnRow>
              ) : (
                <IconBtn onClick={() => startEdit("password")} aria-label="Redaguoti"><FiEdit3 /></IconBtn>
              )}
            </Row>

            {edit.field === "password" && (
              <Expand>
                <SubLabel>Senas slaptažodis</SubLabel>
                <Input
                  type="password"
                  value={oldPwd}
                  onChange={(e) => setOldPwd(e.target.value)}
                  placeholder="●●●●●●●●"
                />
                <SubLabel>Naujas slaptažodis</SubLabel>
                <Input
                  type="password"
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="●●●●●●●●"
                />
                <SubLabel>Pakartokite naują slaptažodį</SubLabel>
                <Input
                  type="password"
                  value={newPwd2}
                  onChange={(e) => setNewPwd2(e.target.value)}
                  placeholder="●●●●●●●●"
                />
              </Expand>
            )}
          </Field>
        </Right>
      </Grid>
    </Wrap>
  );
}

/* ===== styles ===== */
const Wrap = styled.div`
  padding: 24px;
`;
const Grid = styled.div`
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;
const Left = styled.div`
  background:#fff;border:1px solid #eceff3;border-radius:24px;
  padding:24px;display:grid;justify-items:center;gap:8px;
`;
const Avatar = styled.div`
  width: 180px;height:180px;border-radius:50%;overflow:hidden;
  background:#f6f8fc;border:1px solid #e7edf6;display:grid;place-items:center;
  img{width:100%;height:100%;object-fit:cover;}
`;
const Name = styled.h2`margin:12px 0 0;font-size:22px;color:#0f172a;`;
const Role = styled.div`color:#64748b;font-weight:700;`;

const Right = styled.div`
  background:#fff;border:1px solid #eceff3;border-radius:24px;
  padding:24px;display:grid;gap:16px;align-content:start;
`;

const Alert = styled.div`
  background:#fff4f4;border:1px solid #ffd4d4;color:#8b1f1f;
  padding:10px 12px;border-radius:12px;font-size:14px;
`;

const Field = styled.div`display:grid;gap:8px;`;
const Label = styled.div`
  display:flex;align-items:center;gap:8px;font-weight:800;color:#0f172a;
  svg{color:#99a3b2;}
`;
const Row = styled.div`
  display:flex;align-items:center;gap:10px;
  border:1px solid #dfe5ec;border-radius:12px;padding:8px 8px 8px 12px;
  background:${p=>p.$editing ? "#fff" : "#f8fafc"};
`;
const Input = styled.input`
  flex:1;border:0;background:transparent;outline:none;height:40px;font-size:15px;color:#0f172a;
`;
const BtnRow = styled.div`display:flex;gap:6px;`;
const IconBtn = styled.button`
  display:grid;place-items:center;border:1px solid #eceff3;background:#fff;
  width:38px;height:38px;border-radius:10px;cursor:pointer;
`;

const Expand = styled.div`
  display:grid;gap:6px;padding:10px;border:1px dashed #e6ecf5;border-radius:12px;background:#f8fafc;
`;
const SubLabel = styled.div`font-size:12px;color:#475569;font-weight:700;`;
const Load = styled.div`padding:24px;`;