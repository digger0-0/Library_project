"use client"

import { returnBook } from "@/lib/action";
import { useActionState } from "react";

export function ReturnBookPanel(){
  const fields = ["rental_id"];

  const [ state, formAction, isPending ] = useActionState(returnBook, undefined);

  return(
    <div>
      Return book
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