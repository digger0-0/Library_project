"use client"

import { rentEbook } from "@/lib/action";
import { BookSearchDetail, BookSearchDetailFields } from "@/lib/types";
import { useEffect, useState, useTransition } from "react";
import { useToast } from "./Toast";
import { BigWordPage } from "./bigWordPage";
import Link from "next/link";

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
      <BigWordPage text="No match search"/>
    );
  }

  return (
    <div style={{display: "flex"}}>
      <table style={{margin: "8px"}}>
        <tbody>
          <tr>
            { bookSearchDetailFields.map((f, i) => (
              <th key={i}>{f.toString()}</th>
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
        <div className="enclose">
          <button className="btn" onClick={() => {setDetailId(null)}}>X</button>
          <br/>
          <Link className="btn" href={
            books[detailId].bookType == "Ebook"?
            `/ebookInfo/${books[detailId].ebook_id}`:
            `/bookInfo/${books[detailId].isbn}`
          }>View more</Link>
          { bookSearchDetailFields.map((f, i) => (
            <div key={i}>
              <label>{f.toString() + ": "}</label>
              <label>{books[detailId][f]}</label>
            </div>
          ))}
          {(checkRented && books[detailId].bookType == "Ebook")&&
            <div>
              <button
                className="btn"
                disabled={isPending || books[detailId].rented || Number(books[detailId].status.split(' ')[0]) <= 0}
                onClick={
                  () => {
                    if(books[detailId].ebook_id == null) return;
                    startTransition(async () => {
                      const res = await rentEbook(books[detailId].ebook_id as number);
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