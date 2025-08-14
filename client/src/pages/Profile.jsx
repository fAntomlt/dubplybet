import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import { FiUser, FiHash, FiLock, FiEdit3, FiCheck, FiX } from "react-icons/fi";
import { useToast } from "../components/ToastProvider";
import logoImg from "../assets/icriblogo.png";

/* ================= helpers ================= */

function getAuth() {
  try {
    const user = JSON.parse(localStorage.getItem("authUser") || "null");
    const token = localStorage.getItem("authToken");
    return user && token ? { user, token } : { user: null, token: null };
  } catch {
    return { user: null, token: null };
  }
}

const roleLabel = (role) => (role === "admin" ? "Administratorius" : "Narys");

const discordRegex = /^(?!.*[._]{2})(?![._])[a-zA-Z0-9._-]{2,32}(?<![._])$/;

/* password rules (same spirit as register) */
const pwFlags = (pw) => ({
  hasUpper: /[A-Z]/.test(pw),
  hasLower: /[a-z]/.test(pw),
  hasDigit: /[0-9]/.test(pw),
  hasSymbol: /[!@#$%^&*()_\-+\=\[\]{};:'",.<>/?\\|`~]/.test(pw),
  minLength: pw.length >= 8,
});

/* ================= component ================= */

export default function Profile() {
  const toast = useToast();
  const API_URL = import.meta.env.VITE_API_URL;

  const [{ user: authUser, token }, setAuth] = useState(getAuth());

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null); // {id, email, username, discordUsername, role}

  // edit states
  const [editing, setEditing] = useState({
    username: false,
    discord: false,
    password: false,
  });

  // form values
  const [username, setUsername] = useState("");
  const [discord, setDiscord] = useState("");

  const [confirmPwdForProfile, setConfirmPwdForProfile] = useState(""); // used for username/discord save

  // password change fields
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmNewPw, setConfirmNewPw] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({}); // {username?, discord?, general?}

  const pwdFlags = useMemo(() => pwFlags(newPw), [newPw]);

  // fetch fresh user data (and trust JWT)
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        if (!token) return;
        const res = await fetch(`${API_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) {
          setLoading(false);
          return;
        }
        if (ignore) return;
        setMe(data.user);
        setUsername(data.user.username || "");
        setDiscord(data.user.discordUsername || "");
      } catch {
        // ignore
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => (ignore = true);
  }, [API_URL, token]);

  // keep localStorage user in sync after updates
  const updateLocalAuthUser = (patch) => {
    try {
      const next = { ...(authUser || {}), ...patch };
      localStorage.setItem("authUser", JSON.stringify(next));
      setAuth({ user: next, token });
    } catch {}
  };

  /* ============ save handlers ============ */

  async function saveUsername() {
    setSubmitting(true);
    setErrors({});
    try {
      // simple client validations
      const trimmed = username.trim();
      if (trimmed.length < 3 || trimmed.length > 50) {
        setErrors({ username: "Vardas 3–50 simbolių" });
        setSubmitting(false);
        return;
      }
      if (!confirmPwdForProfile) {
        setErrors({ username: "Įveskite slaptažodį patvirtinimui" });
        setSubmitting(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: trimmed, password: confirmPwdForProfile }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErrors({ username: data?.error || "Nepavyko atnaujinti slapyvardžio" });
        setSubmitting(false);
        return;
      }

      setMe((m) => ({ ...m, username: trimmed }));
      updateLocalAuthUser({ username: trimmed });
      setEditing((e) => ({ ...e, username: false }));
      setConfirmPwdForProfile("");
      toast.success("Slapyvardis atnaujintas");
    } catch {
      setErrors({ username: "Serverio klaida. Bandykite vėliau." });
    } finally {
      setSubmitting(false);
    }
  }

  async function saveDiscord() {
    setSubmitting(true);
    setErrors({});
    try {
      const trimmed = discord.trim();
      if (!discordRegex.test(trimmed)) {
        setErrors({ discord: "Neteisingas Discord vardas" });
        setSubmitting(false);
        return;
      }
      if (!confirmPwdForProfile) {
        setErrors({ discord: "Įveskite slaptažodį patvirtinimui" });
        setSubmitting(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ discordUsername: trimmed, password: confirmPwdForProfile }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErrors({ discord: data?.error || "Nepavyko atnaujinti Discord vardo" });
        setSubmitting(false);
        return;
      }

      setMe((m) => ({ ...m, discordUsername: trimmed }));
      updateLocalAuthUser({ discordUsername: trimmed });
      setEditing((e) => ({ ...e, discord: false }));
      setConfirmPwdForProfile("");
      toast.success("Discord vardas atnaujintas");
    } catch {
      setErrors({ discord: "Serverio klaida. Bandykite vėliau." });
    } finally {
      setSubmitting(false);
    }
  }

  async function savePassword() {
    setSubmitting(true);
    setErrors({});
    try {
      if (!oldPw) {
        setErrors({ password: "Įveskite seną slaptažodį" });
        setSubmitting(false);
        return;
      }
      const { minLength, hasDigit, hasLower, hasUpper, hasSymbol } = pwdFlags;
      if (!(minLength && hasDigit && hasLower && hasUpper && hasSymbol)) {
        setErrors({ password: "Neteisingas naujas slaptažodis" });
        setSubmitting(false);
        return;
      }
      if (newPw !== confirmNewPw) {
        setErrors({ password: "Slaptažodžiai nesutampa" });
        setSubmitting(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/users/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          oldPassword: oldPw,
          newPassword: newPw,
          confirmPassword: confirmNewPw,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErrors({ password: data?.error || "Nepavyko atnaujinti slaptažodžio" });
        setSubmitting(false);
        return;
      }

      setOldPw("");
      setNewPw("");
      setConfirmNewPw("");
      setEditing((e) => ({ ...e, password: false }));
      toast.success("Slaptažodis atnaujintas");
    } catch {
      setErrors({ password: "Serverio klaida. Bandykite vėliau." });
    } finally {
      setSubmitting(false);
    }
  }

  const cancelUsername = () => {
    setUsername(me?.username || "");
    setConfirmPwdForProfile("");
    setEditing((e) => ({ ...e, username: false }));
    setErrors((er) => ({ ...er, username: "" }));
  };

  const cancelDiscord = () => {
    setDiscord(me?.discordUsername || "");
    setConfirmPwdForProfile("");
    setEditing((e) => ({ ...e, discord: false }));
    setErrors((er) => ({ ...er, discord: "" }));
  };

  const cancelPassword = () => {
    setOldPw("");
    setNewPw("");
    setConfirmNewPw("");
    setEditing((e) => ({ ...e, password: false }));
    setErrors((er) => ({ ...er, password: "" }));
  };

  /* ============ render ============ */

  useEffect(() => {
    document.title = "Profilis – DuBPlyBET";
  }, []);

  if (!token) {
    return (
      <Wrap>
        <Centered>Klaida: turite prisijungti, kad peržiūrėtumėte profilį.</Centered>
      </Wrap>
    );
  }

  return (
    <Wrap>
      <Grid>
        {/* Left column (avatar + name + role) */}
        <Left>
          <Avatar>
            {/* Placeholder avatar: your own avatar system can replace this */}
            <img src={logoImg} alt="Avatar" />
          </Avatar>
          <Name>{me?.username || authUser?.username || "Vartotojas"}</Name>
          <Role>{roleLabel(me?.role || authUser?.role)}</Role>
        </Left>

        {/* Right column (editable fields) */}
        <Right>
          <SectionTitle>Profilio informacija</SectionTitle>

          {/* Username */}
          <FieldCard>
            <Label>Slapyvardis</Label>
            <Row>
              <Icon><FiUser /></Icon>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                readOnly={!editing.username}
                $readOnly={!editing.username}
                placeholder="Slapyvardis"
              />
              {editing.username ? (
                <Actions>
                  <IconBtn
                    aria-label="Išsaugoti"
                    onClick={saveUsername}
                    disabled={submitting}
                    $ok
                  >
                    <FiCheck />
                  </IconBtn>
                  <IconBtn aria-label="Atšaukti" onClick={cancelUsername} disabled={submitting}>
                    <FiX />
                  </IconBtn>
                </Actions>
              ) : (
                <IconBtn aria-label="Redaguoti" onClick={() => setEditing((e) => ({ ...e, username: true }))}>
                  <FiEdit3 />
                </IconBtn>
              )}
            </Row>

            {editing.username && (
              <Burger>
                <BurgerLabel>Patvirtinkite slaptažodžiu</BurgerLabel>
                <BurgerRow>
                  <Icon><FiLock /></Icon>
                  <Input
                    type="password"
                    value={confirmPwdForProfile}
                    onChange={(e) => setConfirmPwdForProfile(e.target.value)}
                    placeholder="●●●●●●●●"
                  />
                </BurgerRow>
              </Burger>
            )}

            {!!errors.username && <Error>{errors.username}</Error>}
          </FieldCard>

          {/* Discord username */}
          <FieldCard>
            <Label>Discord Nick</Label>
            <Row>
              <Icon><FiHash /></Icon>
              <Input
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
                readOnly={!editing.discord}
                $readOnly={!editing.discord}
                placeholder="discord.vardas"
              />
              {editing.discord ? (
                <Actions>
                  <IconBtn
                    aria-label="Išsaugoti"
                    onClick={saveDiscord}
                    disabled={submitting}
                    $ok
                  >
                    <FiCheck />
                  </IconBtn>
                  <IconBtn aria-label="Atšaukti" onClick={cancelDiscord} disabled={submitting}>
                    <FiX />
                  </IconBtn>
                </Actions>
              ) : (
                <IconBtn aria-label="Redaguoti" onClick={() => setEditing((e) => ({ ...e, discord: true }))}>
                  <FiEdit3 />
                </IconBtn>
              )}
            </Row>

            {editing.discord && (
              <Burger>
                <BurgerLabel>Patvirtinkite slaptažodžiu</BurgerLabel>
                <BurgerRow>
                  <Icon><FiLock /></Icon>
                  <Input
                    type="password"
                    value={confirmPwdForProfile}
                    onChange={(e) => setConfirmPwdForProfile(e.target.value)}
                    placeholder="●●●●●●●●"
                  />
                </BurgerRow>
              </Burger>
            )}

            {!!errors.discord && <Error>{errors.discord}</Error>}
          </FieldCard>

          {/* Password change */}
          <FieldCard>
            <Label>Slaptažodis</Label>
            <Row>
              <Icon><FiLock /></Icon>
              <Input
                type="password"
                value={"••••••••"}
                readOnly
                $readOnly
                aria-readonly="true"
              />
              {editing.password ? (
                <Actions>
                  <IconBtn aria-label="Išsaugoti" onClick={savePassword} disabled={submitting} $ok>
                    <FiCheck />
                  </IconBtn>
                  <IconBtn aria-label="Atšaukti" onClick={cancelPassword} disabled={submitting}>
                    <FiX />
                  </IconBtn>
                </Actions>
              ) : (
                <IconBtn aria-label="Redaguoti" onClick={() => setEditing((e) => ({ ...e, password: true }))}>
                  <FiEdit3 />
                </IconBtn>
              )}
            </Row>

            {editing.password && (
              <Burger>
                <BurgerLabel>Senas slaptažodis</BurgerLabel>
                <BurgerRow>
                  <Icon><FiLock /></Icon>
                  <Input
                    type="password"
                    value={oldPw}
                    onChange={(e) => setOldPw(e.target.value)}
                    placeholder="●●●●●●●●"
                  />
                </BurgerRow>

                <BurgerLabel>Naujas slaptažodis</BurgerLabel>
                <BurgerRow>
                  <Icon><FiLock /></Icon>
                  <Input
                    type="password"
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    placeholder="●●●●●●●●"
                  />
                </BurgerRow>

                <Rules>
                  <Rule $ok={pwdFlags.minLength}>Mažiausiai 8 simboliai</Rule>
                  <Rule $ok={pwdFlags.hasUpper}>Bent viena didžioji raidė</Rule>
                  <Rule $ok={pwdFlags.hasLower}>Bent viena mažoji raidė</Rule>
                  <Rule $ok={pwdFlags.hasDigit}>Bent vienas skaičius</Rule>
                  <Rule $ok={pwdFlags.hasSymbol}>Bent vienas simbolis</Rule>
                </Rules>

                <BurgerLabel>Pakartokite naują slaptažodį</BurgerLabel>
                <BurgerRow>
                  <Icon><FiLock /></Icon>
                  <Input
                    type="password"
                    value={confirmNewPw}
                    onChange={(e) => setConfirmNewPw(e.target.value)}
                    placeholder="●●●●●●●●"
                  />
                </BurgerRow>
              </Burger>
            )}

            {!!errors.password && <Error>{errors.password}</Error>}
          </FieldCard>
        </Right>
      </Grid>

      {loading && <Loading>Įkeliama…</Loading>}
    </Wrap>
  );
}

/* ================= styles ================= */

const Wrap = styled.div`
  min-height: 100dvh;
  padding: 24px;
  background: #fff;
`;

const Grid = styled.div`
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }
`;

/* left */
const Left = styled.aside`
  background: #fff;
  border: 1px solid #eceff3;
  border-radius: 24px;
  padding: 24px;
  display: grid;
  justify-items: center;
  gap: 10px;
`;

const Avatar = styled.div`
  width: clamp(160px, 36vw, 220px);
  height: clamp(160px, 36vw, 220px);
  border-radius: 50%;
  overflow: hidden;
  background: #f6f8fc;
  border: 1px solid #e7edf6;
  box-shadow: 0 8px 30px rgba(31, 111, 235, 0.08);
  display: grid;
  place-items: center;
  img { width: 100%; height: 100%; object-fit: cover; }
`;

const Name = styled.h2`
  margin: 10px 0 0;
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
`;

const Role = styled.div`
  color: #64748b;
  font-weight: 700;
`;

/* right */
const Right = styled.section`
  display: grid;
  gap: 16px;
`;

const SectionTitle = styled.h3`
  margin: 0;
  font-size: 18px;
  font-weight: 800;
  color: #0f172a;
`;

const FieldCard = styled.div`
  background: #fff;
  border: 1px solid #eceff3;
  border-radius: 18px;
  padding: 14px;
  display: grid;
  gap: 8px;
`;

const Label = styled.div`
  font-size: 12px;
  font-weight: 800;
  color: #8892a0;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: 28px 1fr auto;
  gap: 10px;
  align-items: center;
`;

const Icon = styled.div`
  display: grid;
  place-items: center;
  color: #99a3b2;
  font-size: 18px;
`;

const Input = styled.input`
  height: 46px;
  border-radius: 12px;
  border: 1px solid ${({ $readOnly }) => ($readOnly ? "#e6ecf5" : "#bfd5ff")};
  background: ${({ $readOnly }) => ($readOnly ? "#f5f7fb" : "#fff")};
  outline: none;
  padding: 0 12px;
  color: #0f172a;
  font-size: 15px;
  width: 100%;

  &:focus {
    border-color: #1f6feb;
    box-shadow: 0 0 0 3px #e8f1ff;
    background: #fff;
  }
`;

const Actions = styled.div`
  display: flex; gap: 6px;
`;

const IconBtn = styled.button`
  display: grid; place-items: center;
  width: 36px; height: 36px;
  border-radius: 10px;
  border: 1px solid #e6ecf5;
  background: #fff;
  cursor: pointer;

  ${({ $ok }) => $ok && `
    background: #16a34a;
    border-color: #16a34a;
    color: #fff;
  `}

  &:hover { background: ${({ $ok }) => ($ok ? "#138a3e" : "#f9fafb")}; }
`;

const Burger = styled.div`
  margin-top: 8px;
  border-top: 1px dashed #e6ecf5;
  padding-top: 10px;
  display: grid;
  gap: 8px;
`;

const BurgerLabel = styled.div`
  font-size: 12px; font-weight: 700; color: #0f172a;
`;

const BurgerRow = styled.div`
  display: grid; grid-template-columns: 28px 1fr; gap: 10px; align-items: center;
`;

const Rules = styled.ul`
  margin: 2px 0 4px; padding: 6px 10px; list-style: none;
  border-radius: 12px; border: 1px solid #e6ecf5; background: #f8fafc;
  display: grid; gap: 4px;
`;

const Rule = styled.li`
  font-size: 13px; padding: 2px 0;
  color: ${({ $ok }) => ($ok ? "#0d6c2f" : "#475569")};
  &::before {
    content: ${({ $ok }) => ($ok ? "'✔ '" : "'✖ '")};
    color: ${({ $ok }) => ($ok ? "#0d6c2f" : "#e11d48")};
    font-weight: 700;
  }
`;

const Error = styled.div`
  color: #e11d48; font-size: 12px; margin-top: 2px;
`;

const Loading = styled.div`
  text-align: center; margin-top: 18px; color: #64748b;
`;

const Centered = styled.div`
  display: grid; place-items: center; min-height: 40vh; color: #0f172a; font-weight: 700;
`;