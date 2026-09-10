"use client"

import { changeRole, verifySession } from "@/lib/auth";
import { Role, Roles, SessionData, UserRecord, userRecordFields } from "@/lib/types";
import { ChangeEvent, useEffect, useState } from "react";
import { useToast } from "../Toast";
import { BigWordPage } from "../bigWordPage";

export function UserListClient(
  { userRecords }:
  { userRecords: UserRecord[]}
){
  const [sessionData, setSessionData] = useState<SessionData | null>();
  const [loading, setLoading] = useState<boolean>(false);
  useEffect(() => {
    setLoading(true);
    verifySession().then((res) => {
      setSessionData(res);
      setLoading(false);
    });
  }, []);

  //@ userId, targetRole
  const toast = useToast();
  const [roleChanges, setRoleChanges] = useState<Map<number, Role>>(new Map());
  const [selectedRole, setSelectedRole] = useState<Map<number, Role>>(new Map());
  useEffect(() => {
    setSelectedRole(new Map(userRecords.map(u => [u.user_id, u.role])));
  }, [userRecords]);

  const handleChangeRole = () => {
    setLoading(true);
    const task = Array.from(roleChanges.entries()).map(([userId, targetRole]) =>
      changeRole(userId, targetRole).then((res) => {
        toast(res.message, !res.success);
      })
    );
    Promise.all(task).finally(() => {
      setRoleChanges(new Map());
      setLoading(false);
    });
  };

  const handleChangeRoleCancel = () => {
    setSelectedRole(self => {
      const next = new Map(self);
      roleChanges?.forEach((targetRole, userId) => {
        if(!userId || !targetRole || !userRecords) return;
        const defaultRole = userRecords.find((val) => (val && val.user_id == userId))?.role;
        if(!defaultRole) return;
        next.set(userId, defaultRole);
      });
      return next;
    });
    setRoleChanges(new Map());
  }

  if(userRecords.length == 0){
    return (
      <BigWordPage text="No user records"/>
    );
  }

  if(loading){
    return (<div>Loading</div>);
  }

  return (
      <div className="enclose">
        {roleChanges.size > 0 &&
          <div>
            <button
              className="btn"
              onClick={handleChangeRole}
            >
              Confirm {roleChanges.size} role{roleChanges.size > 1 && "s"} change
            </button>
            <button
              className="btn"
              onClick={handleChangeRoleCancel}
            >
              Cancel
            </button>
          </div>
        }
        <table>
          <tbody>
            <tr>
              {userRecordFields.map((f, j) => (
                <td key={j}>
                  <label>{f.toString()}</label>
                </td>
              ))}
            </tr>
            {userRecords.map((r, i) => (
              <tr key={i}>
                {userRecordFields.map((f, j) => (
                  <td key={j}>
                    <label>{r[f]}</label>
                  </td>
                ))}
                {/* set admin button */}
                <td>
                  <select
                    onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                      const role = e.target.value;
                      if(Roles.includes(role)){
                        setRoleChanges(prev => {
                          const next = new Map(prev);
                          next.set(r["user_id"], role as Role);
                          return next;
                        });
                        setSelectedRole(self => {
                          const next = new Map(self);
                          next.set(r["user_id"], role as Role);
                          return next;
                        });
                      }
                    }}
                    disabled={r["user_id"] == sessionData?.userId}
                    value={selectedRole.get(r["user_id"]) ?? r["role"]}
                  >
                    {Roles.map((role, i) => (
                      <option key={i} value={role}>{role}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
}