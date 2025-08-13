import { useEffect, useState } from "react";
import styled from "styled-components";
import { FiMail } from "react-icons/fi";
import logoImg from "../assets/icriblogo.png";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
  useEffect(() => { document.title = "Priminti slaptažodį – DuBPlyBET"; }, []);

  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [serverError, setServerError] = useState("");
  const [serverOK, setServerOK] = useState("");

  const emailError =
    touched &&
    (!email
      ? "El. paštas privalomas"
      : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? "Neteisingas el. pašto formatas"
      : email.length > 191
      ? "El. paštas per ilgas"
      : "");

  const canSubmit = !!email && !emailError && !sending;

  async function onSubmit(e) {
    e.preventDefault();
    setTouched(true);
    setServerError("");
    setServerOK("");
    if (!canSubmit) return;

    setSending(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      await res.json(); // always {ok:true}
      setServerOK("Jei el. paštas egzistuoja, atsiuntėme nuorodą slaptažodžiui atstatyti.");
    } catch {
      setServerError("Serverio klaida. Bandykite vėliau.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Wrap>
      <Inner>
        <Card>
          <Left>
            <Avatar><img src={logoImg} alt="DubplyBet Logo" /></Avatar>
          </Left>

          <Right>
            <Title>Priminti slaptažodį</Title>
            {!!serverError && <Alert role="alert">{serverError}</Alert>}
            {!!serverOK && <Success role="status">{serverOK}</Success>}

            <Form onSubmit={onSubmit} noValidate>
              <Field>
                <Label htmlFor="email">El. paštas</Label>
                <InputWrap aria-invalid={!!emailError}>
                  <FiMail />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder="vardas@pastas.lt"
                  />
                </InputWrap>
                {!!emailError && <Error>{emailError}</Error>}
              </Field>

              <Submit type="submit" disabled={!canSubmit}>
                {sending ? "Siunčiama..." : "Siųsti nuorodą"}
              </Submit>
                <BackLink to="/prisijungti">
                    Grįžti prie prisijungimo
                </BackLink>
            </Form>
          </Right>
        </Card>
      </Inner>
    </Wrap>
  );
}

const Wrap = styled.div`min-height:100dvh;display:grid;place-items:center;padding:24px;background:#fff;`;
const Inner = styled.div`width:100%;max-width:980px;`;
const Card = styled.section`
  width:100%;min-height:460px;background:#fff;border:1px solid #eceff3;border-radius:24px;
  display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:28px;
  @media (max-width:900px){grid-template-columns:1fr;padding:20px;gap:16px;}
`;
const Left = styled.div`display:grid;place-items:center;padding:12px;`;
const Avatar = styled.div`
  width: clamp(180px, 42vw, 260px); height: clamp(180px, 42vw, 260px);
  border-radius:50%; overflow:hidden; background:#f6f8fc; border:1px solid #e7edf6;
  box-shadow:0 8px 30px rgba(31,111,235,.08); display:grid; place-items:center;
  img{width:100%;height:100%;object-fit:cover;}
`;
const Right = styled.div`display:grid;align-content:center;`;
const Title = styled.h1`margin:4px 0 14px 0;font-size:28px;font-weight:800;color:#0f172a;`;
const Alert = styled.div`background:#fff4f4;border:1px solid #ffd4d4;color:#8b1f1f;padding:10px 12px;border-radius:12px;margin-bottom:10px;font-size:14px;`;
const Success = styled.div`background:#effaf1;border:1px solid #c9efd1;color:#0d6c2f;padding:10px 12px;border-radius:12px;margin-bottom:10px;font-size:14px;`;
const Form = styled.form`display:grid;gap:14px;`;
const Field = styled.div`display:grid;gap:6px;`;
const Label = styled.label`font-size:13px;font-weight:700;color:#0f172a;`;
const InputWrap = styled.div`
  display:flex;align-items:center;gap:10px;height:48px;padding:0 14px;
  border:1px solid ${({["aria-invalid"]:invalid})=> (invalid ? "#e11d48" : "#dfe5ec")};
  border-radius:999px;background:#fff;transition:border-color .15s ease, box-shadow .15s ease;
  svg{color:#99a3b2;font-size:18px;}
  &:focus-within{border-color:#1f6feb;box-shadow:0 0 0 3px #e8f1ff;}
`;
const Input = styled.input`border:0;outline:none;flex:1 1 auto;height:100%;background:transparent;color:#0f172a;font-size:15px;`;
const Error = styled.div`color:#e11d48;font-size:12px;margin-top:2px;`;
const Submit = styled.button`
  height:54px;border:0;border-radius:999px;background:#1f6feb;color:#fff;font-weight:800;font-size:16px;cursor:pointer;
  transition:background-color .2s ease, transform .15s ease, opacity .15s ease;
  &:disabled{opacity:.6;cursor:not-allowed;}
  &:hover:not(:disabled){background-color:#155ac5;transform:translateY(-2px);}
  &:active:not(:disabled){transform:translateY(0);}
`;
const BackLink = styled(Link)`
  font-size: 14px;
  color: #1f6feb;
  text-align: center;
  cursor: pointer;
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;