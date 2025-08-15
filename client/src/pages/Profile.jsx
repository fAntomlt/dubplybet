import { useEffect, useMemo, useState, useRef, useLayoutEffect  } from "react";
import styled from "styled-components";
import { FiUser, FiHash, FiLock, FiEdit3, FiX, FiCheck, FiUpload } from "react-icons/fi";
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

  const [me, setMe] = useState(null); // { id,email,username,discordUsername,role,avatarUrl? }
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

  const rightRef = useRef(null);
  const [leftBaseMinH, setLeftBaseMinH] = useState(0);
  const collapseTimerRef = useRef(null);
  const COLLAPSE_MS = 350; // keep in sync with Expand transition

  const measureBaseHeights = () => {
    if (!rightRef.current) return;
    const h = rightRef.current.getBoundingClientRect().height;
    setLeftBaseMinH(h);
  };

  // 2) measure once after load (non-edit state), and on window resize
  useEffect(() => {
    if (!loading && !serverError) {
      requestAnimationFrame(measureBaseHeights);
    }
  }, [loading, serverError]);

  useEffect(() => {
    const onResize = () => {
      if (edit.field === null) measureBaseHeights();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [edit.field]);

  // keep delayed re-measure AFTER collapse finishes
  useEffect(() => {
    if (edit.field === null) {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
      collapseTimerRef.current = setTimeout(() => {
        requestAnimationFrame(measureBaseHeights);
      }, COLLAPSE_MS);
    }
    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current);
        collapseTimerRef.current = null;
      }
    };
  }, [edit.field]);

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

  const [isMobile, setIsMobile] = useState(window.matchMedia('(max-width: 441px)').matches);
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 441px)');
    const handler = (e) => setIsMobile(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

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

  // ===== Avatar upload =====
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const MAX_SIZE = 2 * 1024 * 1024; // 2MB
  const ACCEPT = ["image/jpeg","image/png","image/webp"];

  const avatarUrlAbs = (url) => {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url;
    return `${API}${url}`;
  };

  const triggerFile = () => {
    if (uploading) return;
    fileRef.current?.click();
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    // allow re-selecting same file again
    e.target.value = "";
    setServerError("");

    if (!file) return;
    if (!ACCEPT.includes(file.type)) {
      const msg = "Netinkamas formatas. Leidžiami: JPG, PNG, WEBP.";
      setServerError(msg);
      toast.error(msg);
      return;
    }
    if (file.size > MAX_SIZE) {
      const msg = "Failas per didelis. Maksimalus dydis: 2 MB.";
      setServerError(msg);
      toast.error(msg);
      return;
    }

    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("avatar", file);

      const res = await fetch(`${API}/api/users/me/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        const msg = data?.error || "Nepavyko įkelti avataro.";
        setServerError(msg);
        toast.error(msg);
        return;
      }

      // cache-bust to ensure fresh image
      const newUrl = `${data.url}?t=${Date.now()}`;
      const updated = { ...me, avatarUrl: newUrl };
      setMe(updated);
      const { token: currentToken } = getAuth();
      setAuth({ user: updated, token: currentToken });

      // optimistic swap in DOM (uses cache-busted version)
      toast.success("Avataras atnaujintas");
    } catch (err) {
      setServerError("Serverio klaida įkeliant avatarą. Bandykite vėliau.");
      toast.error("Serverio klaida įkeliant avatarą.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <Load>Kraunama…</Load>;
  if (serverError && !me) {
    return <Load role="alert">{serverError}</Load>;
  }

  const name = me?.username || "Vartotojas";

  return (
    <Wrap>
      <Container>
        <PageTitle>Profilis</PageTitle>
        <Grid>
          {/* Left */}
          <Left style={{ minHeight: !isMobile && leftBaseMinH ? `${leftBaseMinH}px` : undefined }}>
            <AvatarWrap onClick={triggerFile} role="button" title={uploading ? "Įkeliama…" : "Įkelti avatarą"}>
              <AvatarImage
                src={me?.avatarUrl ? avatarUrlAbs(me.avatarUrl) : logoImg}
                alt="Avatar"
                $uploading={uploading}
              />
              <Overlay>
                <OverlayInner>
                  <FiUpload />
                  <span>{uploading ? "Įkeliama…" : "Įkelti"}</span>
                </OverlayInner>
              </Overlay>
              <HiddenFile
                type="file"
                accept={ACCEPT.join(",")}
                onChange={handleAvatarChange}
                ref={fileRef}
                aria-label="Pasirinkti avataro failą"
              />
            </AvatarWrap>
            <Name>{name}</Name>
            <Role>{roleLT(me?.role)}</Role>
          </Left>

          {/* Right */}
          <Right ref={rightRef}>
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
                  {isMobile && edit.field !== "username" && (
                    <InnerEditBtn onClick={() => startEdit("username")} aria-label="Redaguoti">
                      <FiEdit3 />
                    </InnerEditBtn>
                  )}
                </InputWrap>

                {edit.field === "username"
                  ? (isMobile ? null : (
                      <BtnRow>
                        <IconBtn $variant="confirm" onClick={saveUsernameDiscord} aria-label="Išsaugoti"><FiCheck /></IconBtn>
                        <IconBtn $variant="cancel" onClick={cancelEdit} aria-label="Atšaukti"><FiX /></IconBtn>
                      </BtnRow>
                    ))
                  : (!isMobile && (
                      <IconBtn onClick={() => startEdit("username")} aria-label="Redaguoti"><FiEdit3 /></IconBtn>
                    ))
                }
              </Row>

              {/* Animated expand */}
              <Expand $open={edit.field === "username"} aria-hidden={edit.field !== "username"}>
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
                {isMobile && (
                  <ActionBar>
                    <IconBtn $variant="confirm" onClick={saveUsernameDiscord} aria-label="Išsaugoti"><FiCheck /></IconBtn>
                    <IconBtn $variant="cancel" onClick={cancelEdit} aria-label="Atšaukti"><FiX /></IconBtn>
                  </ActionBar>
                )}
              </Expand>
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
                  {isMobile && edit.field !== "discord" && (
                    <InnerEditBtn onClick={() => startEdit("discord")} aria-label="Redaguoti">
                      <FiEdit3 />
                    </InnerEditBtn>
                  )}
                </InputWrap>

                {edit.field === "discord"
                  ? (isMobile ? null : (
                      <BtnRow>
                        <IconBtn $variant="confirm" onClick={saveUsernameDiscord} aria-label="Išsaugoti"><FiCheck /></IconBtn>
                        <IconBtn $variant="cancel" onClick={cancelEdit} aria-label="Atšaukti"><FiX /></IconBtn>
                      </BtnRow>
                    ))
                  : (!isMobile && (
                      <IconBtn onClick={() => startEdit("discord")} aria-label="Redaguoti"><FiEdit3 /></IconBtn>
                    ))
                }
              </Row>

              {/* Animated expand */}
              <Expand $open={edit.field === "discord"} aria-hidden={edit.field !== "discord"}>
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
                {isMobile && (
                  <ActionBar>
                    <IconBtn $variant="confirm" onClick={saveUsernameDiscord} aria-label="Išsaugoti"><FiCheck /></IconBtn>
                    <IconBtn $variant="cancel" onClick={cancelEdit} aria-label="Atšaukti"><FiX /></IconBtn>
                  </ActionBar>
                )}
              </Expand>
            </Field>

            {/* PASSWORD */}
            <Field>
              <Label>Slaptažodis</Label>
              <Row>
                <InputWrap aria-invalid={false}>
                  <FiLock />
                  <Input value="********" disabled />
                  {isMobile && edit.field !== "password" && (
                    <InnerEditBtn onClick={() => startEdit("password")} aria-label="Redaguoti">
                      <FiEdit3 />
                    </InnerEditBtn>
                  )}
                </InputWrap>

                {edit.field === "password"
                  ? (isMobile ? null : (
                      <BtnRow>
                        <IconBtn $variant="confirm" onClick={savePassword} aria-label="Išsaugoti"><FiCheck /></IconBtn>
                        <IconBtn $variant="cancel" onClick={cancelEdit} aria-label="Atšaukti"><FiX /></IconBtn>
                      </BtnRow>
                    ))
                  : (!isMobile && (
                      <IconBtn onClick={() => startEdit("password")} aria-label="Redaguoti"><FiEdit3 /></IconBtn>
                    ))
                }
              </Row>

              {/* Animated expand */}
              <Expand $open={edit.field === "password"} aria-hidden={edit.field !== "password"}>
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
                {isMobile && (
                  <ActionBar>
                    <IconBtn $variant="confirm" onClick={savePassword} aria-label="Išsaugoti"><FiCheck /></IconBtn>
                    <IconBtn $variant="cancel" onClick={cancelEdit} aria-label="Atšaukti"><FiX /></IconBtn>
                  </ActionBar>
                )}
              </Expand>
            </Field>
          </Right>
        </Grid>
      </Container>
    </Wrap>
  );
}

/* ===== styles  ===== */
const MOBILE_BP = 960;

const Wrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  /* Main already adds page padding; don't add another outer padding here */
  padding: 0;
  /* fit exactly inside Main's padded viewport without overflowing */
  min-height: calc(100vh - (var(--main-pad-y, 24px) * 2));
  width: 100%;
  box-sizing: border-box;
`;

const Container = styled.div`
  width: 100%;
  margin: 0 auto;
  gap: 16px;
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: 30px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 30px;
`;

const Grid = styled.div`
  display: grid;
  /* desktop/tablet: two columns, left scales but stays reasonable */
  grid-template-columns: clamp(220px, 26vw, 360px) minmax(0, 1fr);
  gap: 24px;
  align-items: start;

  /* single breakpoint to match Sidebar: stack left (top) + right (bottom) */
  @media (max-width: ${MOBILE_BP - 1}px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
`;

const Left = styled.div`
  background: #fff;
  border: 1px solid #eceff3;
  border-radius: 24px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-sizing: border-box;
  align-self: start;

  /* full width when stacked */
  @media (max-width: ${392 - 1}px) {
    width: 100%;
    padding: 16px;
    gap: 10px;
  }
`;

/* === Avatar with hover overlay === */
const AvatarWrap = styled.div`
  width: 120px;
  height: 120px;
  border-radius: 50%;
  position: relative;
  overflow: hidden;
  background: #f6f8fc;
  border: 1px solid #e7edf6;
  cursor: pointer;

  &:hover ${'' /* show overlay and blur image on hover */} {
    & > div[data-overlay="layer"] { opacity: 1; }
    img { filter: blur(2px) brightness(0.9); transform: scale(1.02); }
  }
`;

const AvatarImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: filter .2s ease, transform .2s ease;
  pointer-events: none;
  opacity: ${({ $uploading }) => ($uploading ? 0.7 : 1)};
`;

const Overlay = styled.div.attrs({ "data-overlay": "layer" })`
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.45);
  color: #fff;
  opacity: 0;
  transition: opacity .15s ease;
`;

const OverlayInner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-weight: 800;
  font-size: 12px;

  svg { font-size: 22px; }
`;

const HiddenFile = styled.input`
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
`;

const Name = styled.h2`
  margin: 0;
  font-size: 26px;
  color: #0f172a;
  text-align: center;
  word-break: break-word;
  font-weight: 700;
`;

const Role = styled.div`
  color: #64748b;
  font-weight: 600;
  text-align: center;
  font-size: 16px;
`;

const Right = styled.div`
  background: #fff;
  border: 1px solid #eceff3;
  border-radius: 24px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-sizing: border-box;
  min-width: 0;
  align-self: start;

  /* full width when stacked */
  @media (max-width: ${MOBILE_BP - 1}px) {
    width: 100%;
  }
`;

const Alert = styled.div`
  background: #fff4f4;
  border: 1px solid #ffd4d4;
  color: #8b1f1f;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 14px;
  word-break: break-word;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
`;

const Label = styled.div`
  font-weight: 700;
  color: #0f172a;
  font-size: 15px;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-width: 0;
  /* if space gets tight, wrap instead of overflowing */
  flex-wrap: wrap;
`;

const InputWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  height: 52px;
  padding: 0 16px;
  border: 1px solid ${({["aria-invalid"]: invalid}) => (invalid ? "#e11d48" : "#dfe5ec")};
  border-radius: 999px;
  background: #f6fbffff;
  flex: 1 1 auto;
  min-width: 0;
  position: relative; /* enable InnerEditBtn positioning */
  transition: border-color .15s ease, box-shadow .15s ease, background-color .15s ease;

  svg { color: #99a3b2; font-size: 18px; flex-shrink: 0; }
  input:disabled & { background: #f8fafc; }

  &:focus-within {
    border-color: #1f6feb;
    box-shadow: 0 0 0 3px #e8f1ff;
    background: #fff;
  }

  /* leave room for the inner edit button on mobile */
  @media (max-width: 392px) {
    padding-right: 48px;
  }
`;

const ExpandedInputWrap = styled(InputWrap)`
  background: #fff;
  border-radius: 14px;
`;

const Input = styled.input`
  border: 0;
  outline: none;
  flex: 1;
  height: 100%;
  background: transparent;
  color: #0f172a;
  font-size: 15px;
  &::placeholder { color: #99a3b2; }
`;

const BtnRow = styled.div`
  display: flex;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto; /* keep actions on the right */
`;

const IconBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #eceff3;
  background: #fff;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;

  &:hover { background: #f8fafc; border-color: #d1d9e2; }
  svg { font-size: 16px; color: #64748b; }

  /* Variants */
  ${({ $variant }) =>
    $variant === "confirm" &&
    `
      border-color: #16a34a;
      background: #dcfce7;
      svg { color: #166534; }
      &:hover {
        background: #bbf7d0;
        border-color: #15803d;
      }
    `}
  ${({ $variant }) =>
    $variant === "cancel" &&
    `
      border-color: #dc2626;
      background: #fee2e2;
      svg { color: #991b1b; }
      &:hover {
        background: #fecaca;
        border-color: #b91c1c;
      }
    `}
`;

const Expand = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
  background: #f1f5f9;
  border: 1px solid #e2e8f0;
  border-radius: 16px;

  max-height: ${({ $open }) => ($open ? "1000px" : "0px")};
  padding: ${({ $open }) => ($open ? "16px" : "0 16px")};
  opacity: ${({ $open }) => ($open ? 1 : 0)};
  transform: translateY(${({ $open }) => ($open ? "0" : "-6px")});
  overflow: hidden;
  pointer-events: ${({ $open }) => ($open ? "auto" : "none")};
  transition: max-height .3s ease, padding .25s ease, opacity .2s ease, transform .25s ease;
`;

const SubLabel = styled.div`
  font-size: 12px;
  color: #475569;
  font-weight: 600;
`;

const Load = styled.div`
  padding: 24px;
  text-align: center;
  color: #64748b;
`;

const Rules = styled.ul`
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid #e6ecf5;
  background: #f8fafc;
  list-style: none;
  gap: 4px;
`;

const Rule = styled.li`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 8px;
  font-size: 13px;
  color: ${({ $ok }) => ($ok ? "#0d6c2f" : "#475569")};
  background: ${({ $ok }) => ($ok ? "#effaf1" : "transparent")};
  transition: background-color 0.15s ease, color 0.15s ease;

  &::before {
    content: ${({ $ok }) => ($ok ? "'✔'" : "'✖'")};
    font-weight: bold;
    color: ${({ $ok }) => ($ok ? "#0d6c2f" : "#e11d48")};
    flex-shrink: 0;
  }
`;

const Symbols = styled.span`
  color: #0f172a;
  word-break: break-all;
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 8px;
`;

const ActionBtn = styled.button`
  position: relative;
  border: 1px solid transparent; /* inner border */
  outline: 1px solid transparent; /* outer border */
  outline-offset: 2px; /* gap between inner & outer border */
  border-radius: 999px;
  height: 35px;
  padding: 0 18px;
  font-weight: 800;
  font-size: 12px;
  background: transparent;
  cursor: pointer;
  transition: 
    outline-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    background-color 0.15s ease;

  ${({ $variant }) =>
    $variant === "confirm"
      ? `
        color: #16a34a;
        border-color: #16a34a;      /* inner border */
        outline-color: #16a34a;     /* outer border */
        &:hover {
          background: rgba(22, 163, 74, 0.05);
        }
      `
      : `
        color: #dc2626;
        border-color: #dc2626;      /* inner border */
        outline-color: #dc2626;     /* outer border */
        &:hover {
          background: rgba(220, 38, 38, 0.05);
        }
      `}
`;

const InnerEditBtn = styled.button`
  position: absolute;
  right: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 30px;
  height: 30px;
  border-radius: 10px;
  border: 1px solid #eceff3;
  background: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: background-color .15s ease, border-color .15s ease;

  svg { font-size: 18px; color: #64748b; }
  &:hover { background: #f8fafc; border-color: #d1d9e2; }

  /* desktop never sees this */
  @media (min-width: 442px) { display: none; }
`;