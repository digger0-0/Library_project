"use client"

import { returnBook } from "@/lib/action";
import { useActionState, useEffect } from "react";
import { useToast } from "../Toast";

export function ReturnBookPanel(){
  const fields = ["rental_id"];

  const [ state, formAction, isPending ] = useActionState(returnBook, undefined);
  const toast = useToast();

  useEffect(() => {
    if (state) toast(state.message, !state.success);
  }, [state]);

  return(
    <div className="enclose">
      Return book
      <form action={formAction}>
        <table>
          <tbody>
          {fields.map((f, i) => (
            <tr key={i}>
              <td><label>{f}</label></td>
              <td><input type="text" name={f} required/></td>
            </tr>
          ))}
          </tbody>
        </table>
        <input type="submit" value={"Return"}/>
      </form>
    </div>
  );
}