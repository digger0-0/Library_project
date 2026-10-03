'use client'

import { createContext, useContext, useRef, useState } from "react";

const ToastContext = createContext<((message: string, error?: boolean) => number) | null>(null);

const MAXROWS = 3;
const CONTENTLENGTH = 50;


export function ToastProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let msgId = useRef(0);
  const [ Toasts, setToasts ] = useState<[number, string, boolean][]>([]);
  const [ toastDetail, setToastDetail ] = useState<[number, string, boolean] | null>(null);
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
      <div
        hidden={toastDetail == null}
        style={{
          position: "fixed",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10000,
          width: "50%",
          height: "70%",
          background: toastDetail?.[2] ? "#fee2e2" : "#ffffff",
          border: toastDetail?.[2] ? "1px solid #dc2626" : "1px solid #d1d5db",
          borderRadius: "2px",
          padding: "4px 8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          alignItems: "center",
          gap: "8px",
          overflowY: "auto"
        }}
      >
        <button className="btn" onClick={(e) => {setToastDetail(null)}}>X</button>
        <div style={{ whiteSpace: "pre-wrap"}}>
          {toastDetail?.[1]}
        </div>
      </div>
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
              justifyContent: "space-between",
            }}
            onClick={() => {setToastDetail([ind, msg, error])}}
          >
            <label style={{ whiteSpace: "pre-wrap", color: error ? "#991b1b" : "#0f172a" }}>
              {
                msg.split('\n')
                .slice(0, MAXROWS)
                .map((line) => line.length > CONTENTLENGTH ? line.slice(0, CONTENTLENGTH).concat('...') : line)
                .join('\n')
              }
            </label>
            <button className="btn" onClick={(e) => {e.stopPropagation(); dismiss(ind);}}>X</button>
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