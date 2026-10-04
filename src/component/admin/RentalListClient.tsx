"use client"

import { RentalRecord, rentalRecordFields } from "@/lib/types";
import { BigWordPage } from "../bigWordPage";
import { fmtCount, fmtDate, makeCell } from "@/lib/format";

const cell = makeCell<RentalRecord>({
  rental_date: fmtDate,
  due_date: fmtDate,
  return_date: fmtDate,
  days_overdue: fmtCount,
});

export function RentalListClient(
  { rentalRecords }:
  { rentalRecords: RentalRecord[]}
){
  if(rentalRecords.length == 0){
    return (
      <BigWordPage text="No rental records"/>
    );
  }

  return (
      <div className="enclose">
        <table>
          <tbody>
            <tr>
              {rentalRecordFields.map((f, j) => (
                <td key={j}>
                  <label>{f.toString()}{": "}</label>
                </td>
              ))}
            </tr>
            {rentalRecords.map((r, i) => (
              <tr key={i}>
                {rentalRecordFields.map((f, j) => (
                  <td key={j}>
                    <label>{cell(f, r[f])}</label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
}