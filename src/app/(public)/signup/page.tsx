'use client'

import { useToast } from "@/component/Toast";
import { signup } from "@/lib/auth"
import { redirect } from "next/navigation";
import { useActionState, useEffect } from "react"

export default function signupPage(){
  const [ state, action, isPending ] = useActionState(signup, undefined);
  const toast = useToast();

  useEffect(() => {
    if(state?.success) redirect("/login");
    if(state?.message) toast(state.message, true);
  }, [state]);

  return (
    <div style={{flex: "1 1 0%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%"}}>
      <h1>Signup</h1>
      <form action={action}>
        <label>Username</label><br/>
        <input type="text" name="username" required/><br/>
        <label>Password</label><br/>
        <input type="password" name="password" required/><br/>
        <label>Retype password</label><br/>
        <input type="password" name="re-password" required/><br/>
        <input type="submit" value={"Signup"}/><br/>
      </form>
    </div>
  );
}