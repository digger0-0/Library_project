"use client"

import { EbookRentalRecordsUser, EbookRentalRecordUserFields, RentalRecord, rentalRecordFields, RentalRecordUser, RentalRecordUserFields } from "@/lib/types";
import { useState, useTransition } from "react";
import { renewBook, renewEbook, returnEbook } from "@/lib/action";
import { useToast } from "./Toast";

export function RentalRecordsClient(
  { rentalRecords, ebookRentalRecords }:
  { rentalRecords: RentalRecordUser[], ebookRentalRecords: EbookRentalRecordsUser[] }
){
  const [ detailId, setDetailId ] = useState<[boolean, number] | null>(null);
  const [ isPending, startTransition ] = useTransition();

  const toast = useToast();

  if(rentalRecords.length == 0 && ebookRentalRecords.length == 0){
    return (
      <div>
        <p>No rental records</p>
      </div>
    );
  }

  return (
      <div>
        <div>
          <p>Books</p>
          <table>
            <tbody>
              <tr>
                { RentalRecordUserFields.map((f, i) => (
                  <th key={i}>{f}</th>
                ))}
                <th>-</th>
              </tr>
              {rentalRecords.map((r, i) => (
                <tr key={i} onClick={() => {setDetailId([true, i])}}>
                  { RentalRecordUserFields.map((f, j) => (
                    <td key={j}>{r[f]}</td>
                  ))}
                  {((r.renew || 0) < 5 && r.status == "rent") && (
                    <td>
                      <button
                        disabled={isPending}
                        onClick={ async (e) => {
                          e.stopPropagation();
                          if(!r.rental_id) return;
                          const res = await renewBook(r.rental_id as number);
                          toast(res.message, !res.success);
                        }}
                      >
                        Renew
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          
        </div>
        <p>Ebooks</p>
        <div>
          <table>
            <tbody>
              <tr>
                { EbookRentalRecordUserFields.map((f, i) => (
                  <th key={i}>{f}</th>
                ))}
                <th>-</th>
                <th>-</th>
              </tr>
              { ebookRentalRecords.map((r, i) => (
                <tr key={i} onClick={() => {setDetailId([false, i])}}>
                  { EbookRentalRecordUserFields.map((f, j) => (
                    <td key={j}>{r[f]}</td>
                  ))}
                  <td>
                    {( (r.renew || 0) < 5  && r.status != "returned") && (
                      <button
                        disabled={isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          if(!r.ebook_rental_id) return;
                          startTransition(async () => {
                            const res = await renewEbook(r.ebook_rental_id as number);
                            toast(res.message, !res.success);
                          });
                        }}
                      >
                        Renew
                      </button>
                    )}
                  </td>
                  <td>
                    {( r.return_date == null ) && (
                      <button
                        disabled={isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          if(!r.ebook_rental_id) return;
                          startTransition(async () => {
                            const res = await returnEbook(r.ebook_rental_id as number);
                            toast(res.message, !res.success);
                          });
                        }}
                      >
                        Return
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {detailId != null && (
          <div>
            <button onClick={() => {setDetailId(null)}}>X</button>
            {detailId[0]? (
              RentalRecordUserFields.map((f, i) => (
                <p key={i}>
                  <label>{f.toString()}{": "}</label>
                  <label>{rentalRecords[detailId[1]][f]}</label>
                </p>
              ))
            ): (
              EbookRentalRecordUserFields.map((f, i) => (
                <p key={i}>
                  <label>{f}{": "}</label>
                  <label>{ebookRentalRecords[detailId[1]][f]}</label>
                </p>
              ))
            )}
            
          </div>
        )}
      </div>
    );
}