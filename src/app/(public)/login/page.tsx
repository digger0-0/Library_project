'use client'

import { useToast } from "@/component/Toast";
import { login } from "@/lib/auth"
import { redirect } from "next/navigation";
import { useActionState, useEffect } from "react";

export default function LoginPage(){
  const [ state, action, isPending ] = useActionState(login, undefined);
  const toast = useToast();
  useEffect(() => {
    if(state?.success) redirect("/");
    if(state) toast(state?.message ?? "", !state?.success)
  }, [state]);

  return <div style={{flex: "1 1 0%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center"}}>
    <h1>Login</h1>
    <form action={action}>
      <label>Username:</label><br/>
      <input type="text" name="username" required/><br/>
      <label>Password:</label><br/>
      <input type="password" name="password" required/><br/>
      <input type="submit" value={"Login"}/><br/>
    </form>
  </div>
}