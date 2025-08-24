// src/components/Footer.jsx
import React from "react";
import styled from "styled-components";
import { NavLink } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <Wrap role="contentinfo" aria-label="Svetainės apačia">
      <Inner>
        <Left>
          <Brand>icrib.pro</Brand>
          <Small>© {year} — VISOS TEISĖS SAUGOMOS</Small>
        </Left>

        <Mid aria-label="Teisinės nuorodos">
          <FooterLink to="/privacy">Privatumo politika</FooterLink>
          <Dot>•</Dot>
          <FooterLink to="/rules">Konkurso taisyklės</FooterLink>
        </Mid>

        <Right>
          <Small>Kontaktai:</Small>
          <Mail href="mailto:info@icrib.pro">info@icrib.pro</Mail>
        </Right>
      </Inner>
    </Wrap>
  );
}

/* ===== styles (derinti su jūsų dizainu) ===== */
const Wrap = styled.footer`
  margin-top: 18px;
  border-top: 1px solid #eceff3;
  background: #ffffff;
  box-shadow: 0 8px 24px rgba(2,6,23,.04);
`;

const Inner = styled.div`
  max-width: 1120px;
  margin: 0 auto;
  padding: 14px 16px;

  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    text-align: center;
  }
`;

const Left = styled.div`
  display: grid;
  gap: 4px;

  @media (max-width: 960px) { order: 1; }
`;

const Brand = styled.div`
  letter-spacing: -0.01em;
  color: #0f172a;
  font-size: 16px;
`;

const Small = styled.div`
  color: #64748b;
  font-size: 12px;
  letter-spacing: .02em;
`;

const Mid = styled.nav`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  @media (max-width: 960px) { order: 3; }
`;

const Dot = styled.span`
  color: #cbd5e1;
  user-select: none;
`;

const FooterLink = styled(NavLink)`
  color: #0f172a;
  text-decoration: none;
  padding: 4px 6px;
  border-radius: 8px;

  &:hover { background: #f5f7fb; }
`;

const Right = styled.div`
  justify-self: end;
  display: inline-grid;
  gap: 4px;
  text-align: right;

  @media (max-width: 960px) {
    justify-self: center;
    text-align: center;
    order: 2;
  }
`;

const Mail = styled.a`
  
  text-decoration: none;
  &:hover { text-decoration: underline; }
`;