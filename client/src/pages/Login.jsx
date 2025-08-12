import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import styled from "styled-components";
import { FiMail, FiLock } from "react-icons/fi";
import logoImg from "../assets/icriblogo.png";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState({ email: false, password: false });
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const emailError =
    touched.email &&
    (!email
      ? "El. paštas privalomas"
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? "Neteisingas el. pašto formatas"
      : "");

  const passwordError =
    touched.password &&
    (!password
      ? "Slaptažodis privalomas"
      : password.length < 8
      ? "Slaptažodis per trumpas (min. 8)"
      : "");

  const canSubmit =
    !emailError && !passwordError && email && password && !submitting;

  async function onSubmit(e) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    setServerError("");
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok || !data?.ok) {
        setServerError(
          data?.error || "Nepavyko prisijungti. Bandykite dar kartą."
        );
        setSubmitting(false);
        return;
      }

      localStorage.setItem("authToken", data.token);
      localStorage.setItem("authUser", JSON.stringify(data.user));
      navigate("/");
    } catch {
      setServerError("Serverio klaida. Bandykite vėliau.");
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
            <Title>Prisijungti</Title>
            {!!serverError && <Alert role="alert">{serverError}</Alert>}

            <Form onSubmit={onSubmit} noValidate>
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
              </Field>

              <Actions>
                <Small as={Link} to="/priminti-slaptazodi">
                  Pamiršote slaptažodį?
                </Small>
              </Actions>

              <Submit type="submit" disabled={!canSubmit}>
                {submitting ? "Jungiama..." : "Prisijungti"}
              </Submit>
            </Form>

            <Footer>
              Neturite paskyros? <Link to="/registracija">Susikurkite</Link>
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
  background: #fff; /* keep site background white */
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

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const AvatarInner = styled.div`
  width: 68%;
  height: 68%;
  border-radius: 50%;
  background: linear-gradient(180deg, #dfe9ff 0%, #ffffff 100%);
  border: 1px solid #e7edf6;
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

const Form = styled.form`
  display: grid;
  gap: 14px;
`;

const Field = styled.div`
  display: grid;
  gap: 6px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
`;

const InputWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 48px;
  padding: 0 14px;
  border: 1px solid ${({ ["aria-invalid"]: invalid }) =>
    invalid ? "#e11d48" : "#dfe5ec"};
  border-radius: 999px;
  background: #fff;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  svg {
    color: #99a3b2;
    font-size: 18px;
  }

  &:focus-within {
    border-color: #1f6feb;
    box-shadow: 0 0 0 3px #e8f1ff;
  }
`;

const Input = styled.input`
  border: 0;
  outline: none;
  flex: 1 1 auto;
  height: 100%;
  background: transparent;
  color: #0f172a;
  font-size: 15px;
`;

const Error = styled.div`
  color: #e11d48;
  font-size: 12px;
  margin-top: 2px;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const Small = styled.span`
  font-size: 13px;
  color: #1f6feb;
  text-decoration: none;
  &:hover {
    text-decoration: underline;
  }
`;

const Submit = styled.button`
  height: 54px;
  border: 0;
  border-radius: 999px;
  background: #1f6feb;
  color: #fff;
  font-weight: 800;
  font-size: 16px;
  cursor: pointer;
  transition: filter 0.15s ease, opacity 0.15s ease;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    filter: brightness(0.98);
  }
  &:active:not(:disabled) {
    filter: brightness(0.96);
  }
`;

const Footer = styled.div`
  margin-top: 12px;
  font-size: 14px;
  color: #0f172a;
  a {
    color: #1f6feb;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
`;

const GuestLink = styled.div`
  margin-top: 20px;
  font-size: 18px;
  font-weight: 600;
  color: #1f6feb;
  cursor: pointer;
  text-align: center;

  &:hover {
    text-decoration: underline;
  }
`;