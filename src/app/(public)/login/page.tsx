'use client'

import { login } from "@/lib/auth"
import { redirect } from "next/navigation";
import { useActionState, useEffect } from "react";

export default function LoginPage(){
  const [ state, action, isPending ] = useActionState(login, undefined);
  useEffect(() => {
    if(state?.success) redirect("/");
  }, [state]);

  return <div>
    <form action={action}>
      <label>Username:</label><br/>
      <input type="text" name="username"/><br/>
      <label>Password:</label><br/>
      <input type="password" name="password"/><br/>
      <input type="submit"/><br/>
      {state?.message && <p>
        {state.message}
        </p>}
    </form>
  </div>
}