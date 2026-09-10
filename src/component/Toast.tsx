'use client'

import { createContext, useContext, useRef, useState } from "react";

const ToastContext = createContext<((message: string, error?: boolean) => number) | null>(null);

export function ToastProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let msgId = useRef(0);
  const [ Toasts, setToasts ] = useState<[number, string, boolean][]>([]);
  const push = (message: string, error?: boolean): number => {
    msgId.current += 1;
    const id = msgId.current;
    setToasts(prev => [...prev, [id, message, error === true]]);
    return id;
  }
  const dismiss = (_msgId: number) => {
    setToasts(prev => prev.filter(([i]) => i !== _msgId));
  }

  return(
    <ToastContext.Provider value={push}>
      {/* fixed overlay at the top-center of the viewport — stays on screen
          while the page scrolls, above everything (zIndex) */}
      <div style={{
        position: "fixed",
        top: "8px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        width: "min(420px, calc(100vw - 24px))",
        pointerEvents: "none",   // don't block clicks on the page behind
      }}>
        {Toasts.map(([ind, msg, error]) => (
          <div
            key={ind}
            style={{
              pointerEvents: "auto",   // so the close button is clickable
              background: error ? "#fee2e2" : "#ffffff",
              border: error ? "1px solid #dc2626" : "1px solid #d1d5db",
              borderRadius: "2px",
              padding: "4px 8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              justifyContent: "space-between",   // label left, X pushed to far right
            }}
          >
            <label style={{ whiteSpace: "pre-wrap", color: error ? "#991b1b" : "#0f172a" }}>{msg}</label>
            <button className="btn" onClick={() => dismiss(ind)}>X</button>
          </div>
        ))}
      </div>
      {children}
    </ToastContext.Provider>);
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a <ToastProvider>");
  return ctx;
}