"use client"

import { RentalRecord, rentalRecordFields } from "@/lib/types";

export function RentalListClient(
  { rentalRecords }:
  { rentalRecords: RentalRecord[]}
){
  if(rentalRecords.length == 0){
    return (
      <div>
        <p>No rental records</p>
      </div>
    );
  }

  return (
      <div>
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
                    <label>{r[f]}</label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
}