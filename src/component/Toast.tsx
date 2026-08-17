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
      <div>
        {Toasts.map(([ind, msg, error]) => (
          <div key={ind}>
            <label>{msg}</label>
            <button onClick={() => dismiss(ind)}>X</button>
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