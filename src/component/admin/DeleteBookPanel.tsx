'use client'

import { useActionState, useEffect, useState } from "react";
import { useToast } from "../Toast";
import { deleteBook } from "@/lib/action";
import { csv } from "csvtojson";

export function DeleteBookPanel(){
  type bookInfo = {isbn: string, book_number: string};
  const bookInfoFields: (keyof bookInfo)[] = ["isbn", "book_number"];
  const [ submit, setSubmit ] = useState<boolean>(false);
  const [ loading, setLoading ] = useState<boolean>(false);
  const [ deleteMode, setDeleteMode ] = useState<"manuel" | "csvText" | "csvFile">("manuel");
  const [ rows, setRows ] = useState<bookInfo[]>([]);
  const [ state, formAction, isPending ] = useActionState(deleteBook, undefined);
  const toast = useToast();

  async function handleCSVText(formData: FormData){
    const csvText = formData.get("csvText") as string;
    setLoading(true);
    try{
      const jsonArray = await csv().fromString(csvText) as bookInfo[];
      setRows(jsonArray);
    }catch(err){
      toast(String(err), true);
    }finally{
      setLoading(false);
    }
  }
  async function handleCSVFile(formData: FormData){
    const file = formData.get("csvFile") as File | null;
    if(!file) return;
    setLoading(true);
    try{
      const text = await file.text();
      const jsonArray = await csv().fromString(text);
      setRows(jsonArray);
    }catch(err){
      toast(String(err), true);
    }finally{
      setLoading(false);
    }
  }
  async function deleteConfirm(){
    setLoading(true);
    let report = "";
    let successCount: number = 0;
    const failed: bookInfo[] = [];
    try{
      for(let i = 0; i < rows.length; i++){
        const row = rows[i];
        const formData = new FormData();
        let complete: boolean = true;
        bookInfoFields.forEach((f) => {
          if(!row[f]) complete = false;
          formData.append(f, row[f])
        });
        if(!complete){
          report += `row ${i + 1} incomplete: ${JSON.stringify(row)}\n`;
          failed.push(row);
        }else{
          const res = await deleteBook(undefined, formData);
          if(res.success){
            successCount += 1;
          }else{
            failed.push(row);
            report += `row ${i + 1} failed: ${res.message}\n`;
          }
        }
      }
      report += `\n${successCount} books deleted\n${failed.length} books failed`;
      toast(report, failed.length > 0);
    }finally{
      setLoading(false);
      setRows([]);
    }
  }

  useEffect(() => {
    if (state) {
      toast(state.message, !state.success);
      setSubmit(false);   // collapse the Confirm/Cancel row once the action returns
    }
  }, [state]);

  return (
    <div className="enclose">
      Remove book
      {/* Option zone */}
      <div>
        <button style={{backgroundColor: (deleteMode == "manuel"? "lightgray": "white")}} className="btn" disabled={loading === true} onClick={() => setDeleteMode("manuel")}>Manuel delete</button>
        <button style={{backgroundColor: (deleteMode == "csvText"? "lightgray": "white")}} className="btn" disabled={loading === true} onClick={() => {setDeleteMode("csvText"); setSubmit(false);}}>CSV Text delete</button>
        <button style={{backgroundColor: (deleteMode == "csvFile"? "lightgray": "white")}} className="btn" disabled={loading === true} onClick={() => {setDeleteMode("csvFile"); setSubmit(false);}}>CSV File delete</button>
      </div>
      {/* input mode */}
        {(() => {
          switch(deleteMode){
            case "manuel":
              return (
                <form action={formAction}>
                  <table>
                    <tbody>
                      <tr>
                        <td>Book id</td>
                        <td><input type="text" name="isbn" required autoComplete="off"/></td>
                      </tr>
                      <tr>
                        <td>book_number</td>
                        <td><input type="text" name="book_number" required autoComplete="off"/></td>
                      </tr>
                      <tr>{
                        submit? (
                          <>
                            <td><input className="btn" type="submit" value={"Confirm"}/></td>
                            <td><button type="button" className="btn" onClick={() => {setSubmit(false)}}>Cancel</button></td>
                          </>
                        ): (
                          <td colSpan={2}>
                            <button type="button" className="btn" onClick={() => {setSubmit(true)}}>Delete</button>
                          </td>
                        )
                      }</tr>
                    </tbody>
                  </table>
                </form>
              );
            case "csvText":
              return (
                <form action={handleCSVText}>
                    <label>CSV</label><br/>
                    <textarea name="csvText" required/><br/>
                    <input type="submit" value={"Delete"}/>
                </form>
              );
            case "csvFile":
              return (
                <form action={handleCSVFile}>
                  <label>CSV</label><br/>
                  <input type="file" accept=".csv" name="csvFile" required/>
                  <input type="submit" value={"Delete"}/>
                </form>
              );
          }
        })()}
      {/* Preview zone */}
      { loading? (
        <div>Loading</div>
        ): rows.length > 0 && (
          <div>
            <label>Preview</label>
            <table>
              <tbody>
                <tr>
                  { bookInfoFields.map((f, i) => (<th key={i}>{f}</th>)) }
                </tr>
                {rows.slice(0, Math.min(5, rows.length)).map((row, i) => (
                  <tr key={i}>
                    { bookInfoFields.map((f, j) => (<th key={j}>{row[f]}</th>)) }
                  </tr>
                ))}
                {rows.length > 5 && <tr><td colSpan={2}>...</td></tr>}
              </tbody>
            </table>
            <button className="btn" onClick={deleteConfirm} disabled={loading}>
              {loading ? "Importing..." : "Confirm"}
            </button>
          </div>
        )
      }
    </div>
  );
}