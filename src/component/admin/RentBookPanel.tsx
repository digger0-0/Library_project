"use client"

import { rentBook } from "@/lib/action";
import { useActionState, useEffect } from "react";
import { useToast } from "../Toast";

export function RentBookPanel(){
  const fields = ["isbn", "book_number", "user_id"];

  const [ state, formAction, isPending ] = useActionState(rentBook, undefined);
  const toast = useToast();

  useEffect(() => {
    if (state) toast(state.message, !state.success);
  }, [state]);

  return(
    <div className="enclose">
      Rent book
      <form action={formAction}>
        <table>
          <tbody>
          {fields.map((f, i) => (
            <tr key={i}>
              <td><label>{f}</label></td>
              <td><input type="text" name={f} required autoComplete="off"/></td>
            </tr>
          ))}
          </tbody>
        </table>
        <input type="submit" value={"Rent"}/>
      </form>
    </div>
  );
}