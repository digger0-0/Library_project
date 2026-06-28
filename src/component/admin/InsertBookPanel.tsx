"use client"

import { insertBook } from "@/lib/action";
import { useActionState } from "react";

export function InsertBooksPanel(){
  const fields = ["isbn", "title", "author", "publisher",  "classification"];

  const [ state, formAction, isPending ] = useActionState(insertBook, undefined);

  return(
    <div>
      Insert new book
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