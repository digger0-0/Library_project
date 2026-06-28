"use client"

import { rentBook } from "@/lib/action";
import { useActionState } from "react";

export function RentBookPanel(){
  const fields = ["isbn", "book_number", "user_id"];

  const [ state, formAction, isPending ] = useActionState(rentBook, undefined);

  return(
    <div>
      Rent book
      <form action={formAction}>
        <table>
          <tbody>
          {fields.map((f, i) => (
            <tr key={i}>
              <td><label>{f}</label></td>
              <td><input type="text" name={f}/></td>
            </tr>
          ))}
          </tbody>
        </table>
        <input type="submit"/>
      </form>
      { state && (
        <div>
          <p>{ state.message }</p>  
        </div>
      )}
    </div>
  );
}