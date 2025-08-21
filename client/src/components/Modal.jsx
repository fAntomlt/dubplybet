import React from "react";
import styled, { keyframes } from "styled-components";

const fadeIn = keyframes`from{opacity:0} to{opacity:1}`;
const slideUp = keyframes`from{transform:translateY(12px);opacity:.98} to{transform:translateY(0);opacity:1}`;

export default function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <Root role="dialog" aria-modal="true" onClick={onClose}>
      <Card onClick={(e) => e.stopPropagation()}>
        <Head>
          <Title>{title}</Title>
          <CloseX onClick={onClose} aria-label="Uždaryti">×</CloseX>
        </Head>
        <Body>{children}</Body>
      </Card>
    </Root>
  );
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  confirmText = "Patvirtinti",
  danger,
  children,
}) {
  if (!open) return null;
  return (
    <Root role="dialog" aria-modal="true" onClick={onClose}>
      <Card onClick={(e) => e.stopPropagation()}>
        <Head>
          <Title>{title}</Title>
          <CloseX onClick={onClose} aria-label="Uždaryti">×</CloseX>
        </Head>
        <Body>
          <Content>{children}</Content>
          <Actions>
            <Ghost onClick={onClose}>Atšaukti</Ghost>
            {danger ? <Danger onClick={onConfirm}>{confirmText}</Danger> : <Primary onClick={onConfirm}>{confirmText}</Primary>}
          </Actions>
        </Body>
      </Card>
    </Root>
  );
}

/* styled */
const Root = styled.div`
  position: fixed; inset: 0; display: grid; place-items: center;
  background: rgba(15,23,42,.45);
  animation: ${fadeIn} .12s ease;
  z-index: 1000;
`;
const Card = styled.div`
  width: 100%; max-width: 480px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 14px;
  padding: 14px; box-shadow: 0 16px 40px rgba(2,6,23,.2);
  animation: ${slideUp} .16s ease;
  display: grid; gap: 12px;
`;
const Head = styled.div`
  display: flex; align-items: center; justify-content: space-between;
`;
const Title = styled.h3`
  margin: 0; font-size: 16px; font-weight: 900;
`;
const CloseX = styled.button`
  border: 0; background: transparent; font-size: 22px; line-height: 1; cursor: pointer;
  color: #64748b; &:hover { color: #0f172a; }
`;
const Body = styled.div`display: grid; gap: 12px;`;
const Content = styled.div``;
const Actions = styled.div`display: flex; gap: 8px; justify-content: flex-end;`;

const buttonBase = `
  border: 0; border-radius: 10px; padding: 9px 12px; cursor: pointer;
  font-weight: 800; font-size: 13px;
  transition: transform .05s ease, box-shadow .15s ease, background .15s ease, color .15s ease;
  &:active { transform: translateY(1px) }
`;
const Primary = styled.button`${buttonBase}; background:#1f6feb; color:#fff; box-shadow:0 2px 6px rgba(31,111,235,.25); &:hover{background:#195bcc};`;
const Ghost   = styled.button`${buttonBase}; background:#f3f6fc; color:#0f172a; &:hover{background:#e8eefb};`;
const Danger  = styled.button`${buttonBase}; background:#fee2e2; color:#b91c1c; &:hover{background:#fde3e3};`;