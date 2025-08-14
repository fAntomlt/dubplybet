import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import styled from "styled-components";
import { FiMail, FiLock, FiUser, FiHash } from "react-icons/fi";
import logoImg from "../assets/icriblogo.png";
import { useToast } from "../components/ToastProvider";

export default function Register() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Registracija – DuBPlyBET";
  }, []);
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [discord, setDiscord] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [touched, setTouched] = useState({
    email: false,
    username: false,
    discord: false,
    password: false,
    confirm: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [serverOK, setServerOK] = useState("");

  // --- password rule flags (live) ---
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_\-+\=\[\]{};:'",.<>/?\\|`~]/.test(password);
  const minLength = password.length >= 8;
  const ALLOWED_SYMBOLS = `! @ # $ % ^ & * ( ) _ - + = [ ] { } ; : ' " , . < > / ? \\ | \``;
  const DISCORD_RE = /^(?!.*\.\.)[a-z0-9._]{2,32}$/;

  // validations
  const emailError =
    touched.email &&
    (!email
      ? "El. paštas privalomas"
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? "Neteisingas el. pašto formatas"
      : email.length > 191
      ? "El. paštas per ilgas"
      : "");

  const usernameError =
    touched.username &&
    (!username
      ? "Vartotojo vardas privalomas"
      : username.length < 3
      ? "Vartotojo vardas per trumpas (min. 3)"
      : username.length > 50
      ? "Vartotojo vardas per ilgas (max. 50)"
      : "");

  const discordNormalized = (discord || "").trim().replace(/^@/, "").toLowerCase();

  const discordError =
    touched.discord &&
    (!discord
      ? "Discord vardas privalomas"
      : !DISCORD_RE.test(discordNormalized)
      ? "Neteisingas Discord vardas (2–32, tik raidės/skaičiai, _ ir ., be '..')"
      : "");

  const passwordError =
    touched.password &&
    (!password
      ? "Slaptažodis privalomas"
      : password.length < 8
      ? "Slaptažodis per trumpas (min. 8)"
      : password.length > 100
      ? "Slaptažodis per ilgas (max. 100)"
      : "");

  const confirmError =
    touched.confirm &&
    (!confirm
      ? "Pakartokite slaptažodį"
      : confirm !== password
      ? "Slaptažodžiai nesutampa"
      : "");

  const canSubmit =
    !emailError &&
    !usernameError &&
    !discordError &&
    !passwordError &&
    !confirmError &&
    email &&
    username &&
    discord &&
    password &&
    confirm &&
    !submitting;

  async function onSubmit(e) {
    e.preventDefault();
    setTouched({
      email: true,
      username: true,
      discord: true,
      password: true,
      confirm: true,
    });
    setServerError("");
    setServerOK("");
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const payload = {
        email: email.trim(),
        username: username.trim(),
        discordUsername: discord.trim(),
        password,
        confirmPassword: confirm,
      };

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        setServerError(data?.error || "Registracija nepavyko. Bandykite dar kartą.");
        setSubmitting(false);
        return;
      }

      setServerOK("Registracija sėkminga. Patvirtinkite paskyrą el. paštu. Į prisijungimą grįšite už 10s.");
      toast.success("Sėkmingai prisiregistravote");
      setTimeout(() => navigate("/prisijungti"), 10000);
    } catch {
      setServerError("Serverio klaida. Bandykite vėliau.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Wrap>
      <Inner>
        <Card>
          <Left>
            <Avatar>
              <img src={logoImg} alt="DubplyBet Logo" />
            </Avatar>
          </Left>

          <Right>
            <Title>Registracija</Title>

            {!!serverError && <Alert role="alert">{serverError}</Alert>}
            {!!serverOK && <Success role="status">{serverOK}</Success>}

            <Form onSubmit={onSubmit} noValidate>
              <Field>
                <Label htmlFor="username">Vartotojo vardas</Label>
                <InputWrap aria-invalid={!!usernameError}>
                  <FiUser />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, username: true }))}
                    placeholder="Jūsų vardas"
                  />
                </InputWrap>
                {!!usernameError && <Error>{usernameError}</Error>}
              </Field>

              <Field>
                <Label htmlFor="email">El. paštas</Label>
                <InputWrap aria-invalid={!!emailError}>
                  <FiMail />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                    placeholder="vardas@pastas.lt"
                  />
                </InputWrap>
                {!!emailError && <Error>{emailError}</Error>}
              </Field>

              <Field>
                <Label htmlFor="discord">Discord vardas</Label>
                <InputWrap aria-invalid={!!discordError}>
                  <FiHash />
                  <Input
                    id="discord"
                    value={discord}
                    onChange={(e) => setDiscord(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, discord: true }))}
                    placeholder="vardas"
                  />
                </InputWrap>
                {!!discordError && <Error>{discordError}</Error>}
              </Field>

              <Field>
                <Label htmlFor="password">Slaptažodis</Label>
                <InputWrap aria-invalid={!!passwordError}>
                  <FiLock />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                    placeholder="●●●●●●●●"
                  />
                </InputWrap>
                {!!passwordError && <Error>{passwordError}</Error>}

                <Rules aria-live="polite">
                  <Rule $ok={minLength}>Mažiausiai 8 simboliai</Rule>
                  <Rule $ok={hasUpper}>Bent viena didžioji raidė</Rule>
                  <Rule $ok={hasLower}>Bent viena mažoji raidė</Rule>
                  <Rule $ok={hasDigit}>Bent vienas skaičius</Rule>
                  <Rule $ok={hasSymbol}>
                    Bent vienas simbolis{" "}
                    <Symbols>(leidžiami: {ALLOWED_SYMBOLS})</Symbols>
                  </Rule>
                </Rules>
              </Field>

              <Field>
                <Label htmlFor="confirm">Pakartokite slaptažodį</Label>
                <InputWrap aria-invalid={!!confirmError}>
                  <FiLock />
                  <Input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
                    placeholder="●●●●●●●●"
                  />
                </InputWrap>
                {!!confirmError && <Error>{confirmError}</Error>}
              </Field>

              <Submit type="submit" disabled={!canSubmit}>
                {submitting ? "Kuriama..." : "Kurti paskyrą"}
              </Submit>
            </Form>

            <Footer>
              Jau turite paskyrą? <Link to="/prisijungti">Prisijunkite</Link>
            </Footer>
          </Right>
        </Card>

        <GuestLink onClick={() => navigate("/")}>Tęsti kaip svečias</GuestLink>
      </Inner>
    </Wrap>
  );
}

/* ===== styles ===== */

const Wrap = styled.div`
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: #fff;
`;

const Inner = styled.div`
  width: 100%;
  max-width: 980px;
`;

const Card = styled.section`
  width: 100%;
  min-height: 460px;
  background: #fff;
  border: 1px solid #eceff3;
  border-radius: 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  padding: 28px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    padding: 20px;
    gap: 16px;
  }
`;

const Left = styled.div`
  display: grid;
  place-items: center;
  padding: 12px;
`;

const Avatar = styled.div`
  width: clamp(180px, 42vw, 260px);
  height: clamp(180px, 42vw, 260px);
  border-radius: 50%;
  overflow: hidden;
  background: #f6f8fc;
  border: 1px solid #e7edf6;
  box-shadow: 0 8px 30px rgba(31, 111, 235, 0.08);
  display: grid;
  place-items: center;
  img { width: 100%; height: 100%; object-fit: cover; }
`;

const Right = styled.div`
  display: grid;
  align-content: start;
`;

const Title = styled.h1`
  margin: 4px 0 14px 0;
  font-size: 28px;
  font-weight: 800;
  color: #0f172a;
`;

const Alert = styled.div`
  background: #fff4f4;
  border: 1px solid #ffd4d4;
  color: #8b1f1f;
  padding: 10px 12px;
  border-radius: 12px;
  margin-bottom: 10px;
  font-size: 14px;
`;

const Success = styled.div`
  background: #effaf1;
  border: 1px solid #c9efd1;
  color: #0d6c2f;
  padding: 10px 12px;
  border-radius: 12px;
  margin-bottom: 10px;
  font-size: 14px;
`;

const Form = styled.form` display: grid; gap: 14px; `;
const Field = styled.div` display: grid; gap: 6px; `;
const Label = styled.label` font-size: 13px; font-weight: 700; color: #0f172a; `;

const InputWrap = styled.div`
  display: flex; align-items: center; gap: 10px; height: 48px; padding: 0 14px;
  border: 1px solid ${({["aria-invalid"]: invalid}) => (invalid ? "#e11d48" : "#dfe5ec")};
  border-radius: 999px; background: #fff; transition: border-color .15s ease, box-shadow .15s ease;

  svg { color: #99a3b2; font-size: 18px; }
  &:focus-within { border-color: #1f6feb; box-shadow: 0 0 0 3px #e8f1ff; }
`;

const Input = styled.input`
  border: 0; outline: none; flex: 1 1 auto; height: 100%;
  background: transparent; color: #0f172a; font-size: 15px;
`;

const Error = styled.div` color: #e11d48; font-size: 12px; margin-top: 2px; `;

const Submit = styled.button`
  height: 54px; border: 0; border-radius: 999px; background: #1f6feb; color: #fff;
  font-weight: 800; font-size: 16px; cursor: pointer;
  transition: background-color .2s ease, transform .15s ease, opacity .15s ease;

  &:disabled { opacity: .6; cursor: not-allowed; }
  &:hover:not(:disabled) { background-color: #155ac5; transform: translateY(-2px); }
  &:active:not(:disabled) { transform: translateY(0); }
`;

const Footer = styled.div`
  margin-top: 12px; font-size: 14px; color: #0f172a;
  a { color: #1f6feb; text-decoration: none; }
  a:hover { text-decoration: underline; }
`;

const GuestLink = styled.div`
  margin-top: 20px; font-size: 18px; font-weight: 600; color: #1f6feb;
  cursor: pointer; text-align: center;
  &:hover { text-decoration: underline; }
`;

const Rules = styled.ul`
  display: grid;
  margin-top: 8px;
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

const Symbols = styled.span`
  color: #0f172a;
`;