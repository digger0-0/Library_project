"use client"

import { insertBook } from "@/lib/action";
import { useActionState, useState } from "react";
import { BookClassificationSelector } from "./BookClassificationSelector";
import { Classifications } from "@/lib/types";

export function InsertBooksPanel(){
  const fields = ["isbn", "title", "author", "publisher"];

  const [ state, formAction, isPending ] = useActionState(insertBook, undefined);
  const [ selectedClassification, setSelectedClassification] = useState<(typeof Classifications)[number]>("");

  const handleClassification = (selected: string) => {
    setSelectedClassification(selected);
  };

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
          {/* classification */}
          <tr>
            <td><label>classification</label></td>
            <td>
              <BookClassificationSelector onSelectedChange={handleClassification}/>
              <input
                type="text" 
                name="classification"
                value={selectedClassification}
                readOnly
                className="hidden"
              />
            </td>
          </tr>
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