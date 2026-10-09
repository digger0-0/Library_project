'use client'

import { Captcha } from "@/component/Captcha";
import { useToast } from "@/component/Toast";
import { signup } from "@/lib/auth"
import { redirect } from "next/navigation";
import { useActionState, useEffect, useState } from "react"

export default function signupPage(){
  const [ state, action, isPending ] = useActionState(signup, undefined);
  const [ form, setForm ] = useState<"form" | "captcha">("form");
  const [ attempt, setAttempt ] = useState(0);
  const toast = useToast();

  useEffect(() => {
    if(state?.success) redirect("/login");
    if(state){
      toast(state?.message ?? "", !state?.success);
      if(!state.success){
        setForm("form");
        setAttempt(a => a + 1);
      }
    }
  }, [state]);

  return (
    <div style={{flex: "1 1 0%", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: "100%"}}>
      <h1>Signup</h1>
      <form action={action} style={{display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center"}}>
        <div>
          <label>Username</label><br/>
          <input type="text" name="username" required autoComplete="off"/><br/>
          <label>Password</label><br/>
          <input type="password" name="password" required/><br/>
          <label>Retype password</label><br/>
          <input type="password" name="re-password" required/><br/>
          <input className="btn" type="button" onClick={() => setForm("captcha")} value={"Signup"}/><br/>
        </div>
        { form == "captcha" && (
          <Captcha key={attempt} cancel={() => setForm("form")}/>
        )}
      </form>
    </div>
  );
}