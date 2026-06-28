"use client"

import { BookSearchDetail, BookSearchDetailFields } from "@/lib/types";
import { useState } from "react";

export function BookSearchClient(
  { books }:
  { books: BookSearchDetail[] }
){
  const [ detailId, setDetailId ] = useState<number | null>(null)

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
          { books.map((book, i) => (
            <tr key={i} onClick={() => setDetailId(i)}>
              <td>{book.title}</td>
              <td>{book.isbn}</td>
              <td>{book.full_classification}</td>
              <td>{book.status}</td>
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