'use client'

import { verifySession } from "@/lib/auth";
import { SessionData } from "@/lib/types";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

type AuthContextValue = {
  sessionData: SessionData | null;
  loading: boolean;
  /** Re-read the session from the server (e.g. after a username change or logout). */
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>){
  const [ sessionData, setSessionData ] = useState<SessionData | null>(null);
  const [ loading, setLoading ] = useState<boolean>(false);
  const pathname = usePathname();

  const refresh = useCallback(async () => {
    setLoading(true);
    try{
      const res = await verifySession();
      setSessionData(res);
    }finally{
      setLoading(false);
    }
  }, []);

  // keep the session in sync whenever the user navigates
  useEffect(() => {
    refresh();
  }, [pathname, refresh]);

  return (
    <AuthContext.Provider value={{ sessionData, loading, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(){
  const ctx = useContext(AuthContext);
  if(!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
