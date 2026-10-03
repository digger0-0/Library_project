'use client'

import { useToast } from "@/component/Toast";
import { useAuth } from "@/component/Auth";
import { changePassword, changeUsername } from "@/lib/auth";
import { ChangeEvent, useEffect, useState } from "react";

export default function InfoPage(){
  const [ newUsername, setNewUsername ] = useState<string>("");
  const [ username, setUsername ] = useState<string>("");
  const [ mode, setMode ] = useState<"password" | "username">("username");
  const [ loading, setLoading ] = useState<boolean>(false);
  const toast = useToast();
  const { sessionData, refresh } = useAuth();

  async function handleSubmit(formData: FormData){
    setLoading(true);
    try{
      switch(mode){
        case "username": {
          if(username == newUsername){
            toast("Username unchanged", true);
            break;
          }
          const res = await changeUsername(newUsername);
          toast(res.message, !res.success);
          if(res.success){
            setUsername(newUsername);
            // update the shared session so the navbar shows the new name immediately
            await refresh();
          }
          break;
        }
        case "password": {
          const password = String(formData.get("password"));
          const newPassword = String(formData.get("newPassword"));
          const retypeNewPassword = String(formData.get("retypeNewPassword"));

          if(newPassword != retypeNewPassword){
            toast("Inconsistent password", true);
            break;
          }

          const res = await changePassword(password, newPassword);
          toast(res.message, !res.success);
          break;
        }
      }
    }finally{
      setLoading(false);
    }
  }

  useEffect(() => {
    const fetchedUsername = sessionData?.username ?? "";
    setUsername(fetchedUsername);
    setNewUsername(fetchedUsername);
  }, [sessionData]);

  return (
    <form action={handleSubmit} style={{flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center"}}>
      <div style={{display: "flex", width: "40%"}}>
        <button style={{flex: 1}} className="btn" type="button" onClick={() => setMode("username")} disabled={mode=="username" || loading}>Change username</button>
        <button style={{flex: 1}} className="btn" type="button" onClick={() => setMode("password")} disabled={mode=="password" || loading}>Change password</button>
      </div>
      {(() => {
        switch(mode){
          case "username":
            return (
              <>
                <label>Change Username</label>
                <input
                  key="username-input"
                  type="text"
                  name="newUsername"
                  value={newUsername ?? ""}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {setNewUsername(e.target.value)}}
                />
                <input key="username-submit" type="submit" value={"Change username"} disabled={newUsername == username || loading}/>
              </>
            );
          case "password":
            return (
              <>
                <label>Change password</label><br/>
                <label>Password</label><br/>
                <input
                  key="password-input"
                  type="password"
                  name="password"
                  required
                /><br/>
                <label>New Password</label><br/>
                <input
                  key="newPassword-input"
                  type="password"
                  name="newPassword"
                  required
                /><br/>
                <label>Retype New Passowrd</label><br/>
                <input
                  key="retypeNewPassword-input"
                  type="password"
                  name="retypeNewPassword"
                  required
                /><br/>
                <input key="password-submit" type="submit" value={"Change password"} disabled={loading}/>
              </>
            );
        }
      })()}
    </form>
  );
  
}