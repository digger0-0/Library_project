"use client"

import { RentalRecord, rentalRecordFields } from "@/lib/types";
import { useActionState, useState } from "react";
import { renewBook } from "@/lib/action";

export function RentalRecordsClient(
  { rentalRecords }:
  { rentalRecords: RentalRecord[]}
){
  const [ detailId, setDetailId ] = useState<number | null>(null);
  const [ renewState, renewAction, renewPending ] = useActionState(renewBook, undefined);

  if(rentalRecords.length == 0){
    return (
      <div>
        <p>No rental records</p>
      </div>
    );
  }

  return (
      <div>
        <div>
          {renewState && <p>{renewState.message}</p>}
        </div>
        <table>
          <tbody>
            <tr>
              <td>Rental ID</td>
              <td>Title</td>
              <td>Status</td>
              <td>Rent Date</td>
              <td>Due Date</td>
              <td>Return Date</td>
              <td>Renew</td>
              <td>-</td>
            </tr>
            {rentalRecords.map((r, i) => (
              <tr key={i} onClick={() => {setDetailId(i)}}>
                <td>{r.rental_id}</td>
                <td>{r.title}</td>
                <td>{r.status}</td>
                <td>{r.rental_date}</td>
                <td>{r.due_date}</td>
                <td>{r.return_date}</td>
                <td>{r.renew}</td>
                {(r.renew || 0) < 5 && (
                  <td>
                    <form action={renewAction} onClick={(e) => e.stopPropagation()}>
                      <input type="number" name="rental_id" defaultValue={r.rental_id || -1} hidden/>
                      <button type="submit" disabled={renewPending}>Renew</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {detailId != null && (
          <div>
            <button onClick={() => {setDetailId(null)}}>X</button>
            {rentalRecordFields.map((f, i) => (
              <p key={i}>
              <label>{f.toString()}{": "}</label>
              <label>{rentalRecords[detailId][f]}</label>
              </p>
            ))}
          </div>
        )}
      </div>
    );
}