"use client"

import { BookSearchDetail, BookSearchDetailFields } from "@/lib/types";
import { useState } from "react";

export function BookSearchClient(
  { books }:
  { books: BookSearchDetail[] }
){
  const [ detailId, setDetailId ] = useState<number | null>(null);

  if(books.length == 0){
    return (
      <div>
        <p>No match search</p>
      </div>
    );
  }

  return (
    <div>
      <table>
        <tbody>
          <tr>
            { BookSearchDetailFields.map((f, i) => (
              <td key={i}>{f.toString()}</td>
            ))}
          </tr>
          { books.map((book, i) => (
            <tr key={i} onClick={() => setDetailId(i)}>
              { 
                BookSearchDetailFields.map((f, j) => (
                  <td key={j}>{book[f]}</td>
                ))
              }
            </tr>
          ))}
        </tbody>
      </table>
      {detailId != null && (
        <div>
          <button onClick={() => {setDetailId(null)}}>X</button>
          {BookSearchDetailFields.map((f, i) => (
            <div key={i}>
              <label>{f.toString() + ": "}</label>
              <label>{books[detailId][f]}</label>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}