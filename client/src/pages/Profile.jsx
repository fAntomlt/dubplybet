import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { FiUser, FiHash, FiLock, FiEdit3, FiX, FiCheck } from "react-icons/fi";
import logoImg from "../assets/icriblogo.png";
import { useToast } from "../components/ToastProvider";
import { setAuth, getAuth } from "../store/auth";

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

  // --- password rule flags (live) ---
  const hasUpper = /[A-Z]/.test(newPwd);
  const hasLower = /[a-z]/.test(newPwd);
  const hasDigit = /[0-9]/.test(newPwd);
  const hasSymbol = /[!@#$%^&*()_\-+\=\[\]{};:'",.<>/?\\|`~]/.test(newPwd);
  const minLength = newPwd.length >= 8;
  const ALLOWED_SYMBOLS = `! @ # $ % ^ & * ( ) _ - + = [ ] { } ; : ' " , . < > / ? \\ | \``;

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
    // reset values to current (me) data
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
      const body = { currentPassword: confirmPwd };
      const currentUsername = me?.username || "";
      const currentDiscord = (me?.discordUsername || "").toLowerCase();

      if (edit.field === "username") {
        const newName = (username || "").trim();
        if (!newName) {
          setServerError("Slapyvardis negali būti tuščias.");
          return;
        }
        if (newName === currentUsername) {
          setServerError("Naujas slapyvardis sutampa su dabartiniu.");
          return;
        }
        if (!confirmPwd) {
          setServerError("Įveskite slaptažodį patvirtinimui.");
          return;
        }
        body.username = newName;
      }

      if (edit.field === "discord") {
        const discordNormalized = (discord || "").trim().replace(/^@/, "").toLowerCase();
        if (!discordNormalized) {
          setServerError("Discord vardas negali būti tuščias.");
          return;
        }
        if (!DISCORD_RE.test(discordNormalized)) {
          setServerError("Neteisingas Discord vardas (2–32, tik raidės/skaičiai, _ ir ., be '..').");
          return;
        }
        if (discordNormalized === currentDiscord) {
          setServerError("Naujas Discord vardas sutampa su dabartiniu.");
          return;
        }
        if (!confirmPwd) {
          setServerError("Įveskite slaptažodį patvirtinimui.");
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

      // apply locally
      const updated = {
        ...me,
        ...(body.username ? { username: body.username } : {}),
        ...(body.discordUsername ? { discordUsername: body.discordUsername } : {}),
      };
      setMe(updated);
      if (body.username) setUsername(body.username);
      if (body.discordUsername) setDiscord(body.discordUsername);

      // clear + close
      setConfirmPwd("");
      setEdit({ field: null });

      // refresh navbar immediately
      const { token: currentToken } = getAuth();
      setAuth({ user: updated, token: currentToken });

      toast.success("Pakeitimai išsaugoti");
    } catch {
      setServerError("Serverio klaida. Bandykite vėliau.");
    }
  };

  const savePassword = async () => {
    setServerError("");

    if (!oldPwd || !newPwd || !newPwd2) {
      setServerError("Užpildykite visus laukus.");
      return;
    }
    if (newPwd !== newPwd2) {
      setServerError("Slaptažodžiai nesutampa");
      return;
    }
    if (newPwd === oldPwd) {
      setServerError("Naujas slaptažodis negali sutapti su senuoju.");
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

      // clear fields and close edit
      setOldPwd("");
      setNewPwd("");
      setNewPwd2("");
      setEdit({ field: null });
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

          {/* USERNAME */}
          <Field>
            <Label>Slapyvardis</Label>
            <Row>
              <InputWrap aria-invalid={false}>
                <FiUser />
                <Input
                  disabled={edit.field !== "username"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Jūsų vardas"
                />
              </InputWrap>

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
                <ExpandedInputWrap aria-invalid={false}>
                  <FiLock />
                  <Input
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="●●●●●●●●"
                  />
                </ExpandedInputWrap>
              </Expand>
            )}
          </Field>

          {/* DISCORD */}
          <Field>
            <Label>Discord Nick</Label>
            <Row>
              <InputWrap aria-invalid={false}>
                <FiHash />
                <Input
                  disabled={edit.field !== "discord"}
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  placeholder="vardas"
                />
              </InputWrap>

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
                <ExpandedInputWrap aria-invalid={false}>
                  <FiLock />
                  <Input
                    type="password"
                    value={confirmPwd}
                    onChange={(e) => setConfirmPwd(e.target.value)}
                    placeholder="●●●●●●●●"
                  />
                </ExpandedInputWrap>
              </Expand>
            )}
          </Field>

          {/* PASSWORD */}
          <Field>
            <Label>Slaptažodis</Label>
            <Row>
              <InputWrap aria-invalid={false}>
                <FiLock />
                <Input value="********" disabled />
              </InputWrap>

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
                <ExpandedInputWrap aria-invalid={false}>
                  <FiLock />
                  <Input
                    type="password"
                    value={oldPwd}
                    onChange={(e) => setOldPwd(e.target.value)}
                    placeholder="●●●●●●●●"
                  />
                </ExpandedInputWrap>

                <SubLabel>Naujas slaptažodis</SubLabel>
                <ExpandedInputWrap aria-invalid={false}>
                  <FiLock />
                  <Input
                    type="password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                    placeholder="●●●●●●●●"
                  />
                </ExpandedInputWrap>

                {/* Password rules — same look as in Register */}
                <Rules aria-live="polite">
                  <Rule $ok={minLength}>Mažiausiai 8 simboliai</Rule>
                  <Rule $ok={hasUpper}>Bent viena didžioji raidė</Rule>
                  <Rule $ok={hasLower}>Bent viena mažoji raidė</Rule>
                  <Rule $ok={hasDigit}>Bent vienas skaičius</Rule>
                  <Rule $ok={hasSymbol}>
                    Bent vienas simbolis <Symbols>(leidžiami: {ALLOWED_SYMBOLS})</Symbols>
                  </Rule>
                </Rules>

                <SubLabel>Pakartokite naują slaptažodį</SubLabel>
                <ExpandedInputWrap aria-invalid={false}>
                  <FiLock />
                  <Input
                    type="password"
                    value={newPwd2}
                    onChange={(e) => setNewPwd2(e.target.value)}
                    placeholder="●●●●●●●●"
                  />
                </ExpandedInputWrap>
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
  font-weight:800;color:#0f172a;font-size:14px;
`;

const Row = styled.div`
  display:flex;align-items:center;gap:10px;
`;

const InputWrap = styled.div`
  display:flex;align-items:center;gap:10px;height:48px;padding:0 14px;
  border:1px solid ${({["aria-invalid"]: invalid}) => (invalid ? "#e11d48" : "#dfe5ec")};
  border-radius: 999px;background:#f8fafc; flex:1;
  transition:border-color .15s ease, box-shadow .15s ease, background-color .15s ease;

  svg { color:#99a3b2; font-size:18px; }
  input:disabled & { background:#f8fafc; }

  &:focus-within {
    border-color:#1f6feb;
    box-shadow:0 0 0 3px #e8f1ff;
    background:#fff;
  }
`;

const Input = styled.input`
  border:0;outline:none;flex:1 1 auto;height:100%;
  background:transparent;color:#0f172a;font-size:15px;
`;

const BtnRow = styled.div`display:flex;gap:6px;`;
const IconBtn = styled.button`
  display:grid;place-items:center;border:1px solid #eceff3;background:#fff;
  width:38px;height:38px;border-radius:10px;cursor:pointer;
`;

const Expand = styled.div`
  display: grid;
  gap: 8px;
  margin-top: 8px;
  padding: 10px;
  border-radius: 14px;
  background: #f1f5f9; /* light background */
  border: 1px solid #e2e8f0; /* subtle border */
`;

const SubLabel = styled.div`
  font-size: 11px; /* smaller font */
  color: #475569;
  font-weight: 700;
`;

const ExpandedInputWrap = styled(InputWrap)`
  height: 42px; /* smaller height */
  background: #fff; /* white inside */
  border-radius: 12px;
  svg {
    font-size: 16px;
  }
  input {
    font-size: 14px; /* smaller text */
  }
`;
const Load = styled.div`padding:24px;`;

/* Password rules — same visuals as Register */
const Rules = styled.ul`
  display: grid;
  margin-top: 4px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid #e6ecf5;
  background: #f8fafc;
  list-style: none;
  margin: 0;
  padding-left: 0;
`;
const Rule = styled.li`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  border-radius: 8px;
  font-size: 13px;
  color: ${({ $ok }) => ($ok ? "#0d6c2f" : "#475569")};
  background: ${({ $ok }) => ($ok ? "#effaf1" : "transparent")};
  transition: background-color 0.15s ease, color 0.15s ease;

  &::before {
    content: ${({ $ok }) => ($ok ? "'✔'" : "'✖'")};
    font-weight: bold;
    color: ${({ $ok }) => ($ok ? "#0d6c2f" : "#e11d48")};
  }
`;
const Symbols = styled.span`color:#0f172a;`;