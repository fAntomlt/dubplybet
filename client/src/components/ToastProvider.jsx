import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import styled, { keyframes, css } from "styled-components";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((toast) => {
    const id = crypto.randomUUID();
    const duration = toast.duration ?? 5000;
    setToasts((list) => [...list, { id, ...toast, duration }]);

    // auto-remove
    window.setTimeout(() => remove(id), duration);
  }, [remove]);

  const api = useMemo(() => ({
    show: (message, opts={}) => push({ message, ...opts }),
    success: (message, opts={}) => push({ message, variant: "success", ...opts }),
    error: (message, opts={})   => push({ message, variant: "error", ...opts }),
    info: (message, opts={})    => push({ message, variant: "info", ...opts }),
  }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <Viewport role="region" aria-label="Pranešimai">
        {toasts.map(t => (
          <ToastItem
            key={t.id}
            $variant={t.variant || "success"}
            $duration={t.duration}
          >
            <Message>{t.message}</Message>
            <Close onClick={() => remove(t.id)} aria-label="Uždaryti">×</Close>
            <Progress $variant={t.variant || "success"} $duration={t.duration} />
          </ToastItem>
        ))}
      </Viewport>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

/* -------- styles -------- */

const slideIn = keyframes`
  from { transform: translateX(16px); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
`;

const Viewport = styled.div`
  position: fixed;
  top: 12px;
  right: 12px;
  display: grid;
  gap: 10px;
  z-index: 2000;
  max-width: min(380px, 90vw);

   @media (max-width: 959px) {
    top: auto;
    bottom: 12px;
    left: 12px;
    right: 12px;
    max-width: 100%;
  }
`;

const ToastItem = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 10px;
  background: #fff;
  border: 1px solid #eceff3;
  border-radius: 14px;
  padding: 12px 12px 10px 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,.06);
  animation: ${slideIn} .18s ease both;

  ${({ $variant }) => $variant === "error" && css`
    border-color: #ffd4d4;
    box-shadow: 0 10px 30px rgba(225,29,72,.08);
  `}
`;

const Message = styled.div`
  color: #0f172a;
  font-size: 14px;
  line-height: 1.25;
  padding-right: 6px;
`;

const Close = styled.button`
  border: 0;
  background: transparent;
  color: #64748b;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  padding: 0 2px;
`;

const barAnim = (ms) => keyframes`
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
`;

const Progress = styled.div`
  position: absolute;
  top: 0; right: 0; left: 0;
  height: 3px;
  border-top-left-radius: 14px;
  border-top-right-radius: 14px;
  transform-origin: right center;
  animation: ${({ $duration }) => barAnim($duration)} ${({ $duration }) => `${$duration}ms`} linear forwards;

  background: ${({ $variant }) => (
    $variant === "error" ? "#ef4444" :
    $variant === "info"  ? "#38bdf8" :
    "#22c55e" // success default (green)
  )};
`;