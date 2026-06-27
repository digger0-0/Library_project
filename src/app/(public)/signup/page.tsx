'use client'

import { signup } from "@/lib/auth"
import { redirect } from "next/navigation";
import { useActionState, useEffect } from "react"

export default function signupPage(){
  const [ state, action, isPending ] = useActionState(signup, undefined);

  useEffect(() => {
    if(state?.success) redirect("/login");
  }, [state]);

  return<div>
    <form action={action}>
      <label>Username</label><br/>
      <input type="text" name="username" required/><br/>
      <label>Password</label><br/>
      <input type="password" name="password" required/><br/>
      <label>Retype password</label><br/>
      <input type="password" name="re-password" required/><br/>
      <input type="submit"/><br/>
      { state?.message && <p>
        {state.message}
        </p>}
    </form>
  </div>
}