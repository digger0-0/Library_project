"use client"

import { rentEbook } from "@/lib/action";
import { BookSearchDetail, BookSearchDetailFields } from "@/lib/types";
import { useEffect, useState, useTransition } from "react";
import { useToast } from "./Toast";

export function BookSearchClient(
  { books, checkRented }:
  { books: BookSearchDetail[], checkRented: boolean }
){
  const [ detailId, setDetailId ] = useState<number | null>(null);
  const [ isPending, startTransition ] = useTransition();
  const hideFields: string[] = checkRented? ["ebook_id"]: ["ebook_id", "rented"];
  const bookSearchDetailFields = BookSearchDetailFields.filter(f => !hideFields.includes(f));
  const toast = useToast();

  useEffect(() => {setDetailId(null)}, [books]);

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
            { bookSearchDetailFields.map((f, i) => (
              <td key={i}>{f.toString()}</td>
            ))}
          </tr>
          { books.map((book, i) => (
            <tr key={i} onClick={() => setDetailId(i)}>
              { bookSearchDetailFields.map((f, j) => (
                <td key={j}>{book[f]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {detailId != null && (
        <div>
          <button onClick={() => {setDetailId(null)}}>X</button>
          { bookSearchDetailFields.map((f, i) => (
            <div key={i}>
              <label>{f.toString() + ": "}</label>
              <label>{books[detailId][f]}</label>
            </div>
          ))}
          {(checkRented && books[detailId].bookType == "Ebook")&&
            <div>
              <button
                disabled={isPending || books[detailId].rented || Number(books[detailId].status.split(' ')[0]) <= 0}
                onClick={
                  () => {
                    startTransition(async () => {
                      const res = await rentEbook(books[detailId].ebook_id);
                      toast(res.message, !res.success);
                    });
                  }
                }
              >Rent</button>
            </div>
          }
        </div>
      )}
    </div>
  );
}