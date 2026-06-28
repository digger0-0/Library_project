"use client"

import { getRentalRecords, renewBook } from "@/lib/action";
import { FormSate } from "@/lib/auth";
import { RentalRecord, rentalRecordFields } from "@/lib/types";
import { useActionState, useEffect, useState } from "react";

export default function rentalRecordsPage(){
  const [ rowCount, setRowCount ] = useState(5);
  const [ page, setPage ] = useState(1)
  const [ rentalRecords, setRentalRecords] = useState<RentalRecord[]>([]);
  const [ tableState, setTableState ] = useState<FormSate>();
  const [ rentalDetailId, setRentalDetailId ] = useState<number | null>(null);

  const [ renewState, renewAction, renewIsPending ] = useActionState(renewBook, undefined);

  const handleRowCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const r = Number(e.target.value);
    setRowCount(r);
  };

  const handlePageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const r = Number(e.target.value);
    setPage(r);
  };

  useEffect(() => {
    const fetchRentalRecords = async () => {
      const res = await getRentalRecords(rowCount, page);
      setRentalRecords(res.rentalRecords);
      setTableState({ success: res.success, message: res.message });
    }

    fetchRentalRecords();
  }, [rowCount, page]);

  return (
    <div>
      <div>
        <label>
          Num. of Data:
          <select name="rowCount" value={rowCount} onChange={handleRowCountChange}>
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={30}>30</option>
          </select>
        </label>
        <label>
          Page:
          <input type="number" name="pageNumber" value={page} onChange={handlePageChange} min={1} />
        </label>
      </div>
      <div>
        { !tableState?
          <div>Loading</div>
        :
        <div>
            <table>
              <thead>
              <tr><td>{tableState.message}</td></tr>
              <tr><td>{renewState?.message}</td></tr>
              </thead>
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
                  <tr key={i} onClick={() => {setRentalDetailId(i)}}>
                    <td>{r.rental_id}</td>
                    <td>{r.title}</td>
                    <td>{r.status}</td>
                    <td>{r.rental_date}</td>
                    <td>{r.due_date}</td>
                    <td>{r.return_date}</td>
                    <td>{r.renew}</td>
                    {(r.renew || 0) < 5 && (
                      <td>
                        <form action={renewAction}>
                          <input type="number" name="rental_id" defaultValue={r.rental_id || -1} hidden/>
                          <button type="submit" disabled={renewIsPending}>Renew</button>
                        </form>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {rentalDetailId != null && (
              <div>
                <button onClick={() => {setRentalDetailId(null)}}>X</button>
                {rentalRecordFields.map((f, i) => (
                  <p key={i}>
                  <label>{f.toString()}{": "}</label>
                  <label>{rentalRecords[rentalDetailId][f]}</label>
                  </p>
                ))}
              </div>
            )}
          </div>
        }
      </div>
    </div>
  );
}