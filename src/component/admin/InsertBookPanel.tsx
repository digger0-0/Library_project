"use client"

import { insertBook } from "@/lib/action";
import { useActionState, useEffect, useState } from "react";
import { BookClassificationSelector } from "./BookClassificationSelector";
import { Classifications, NewBook } from "@/lib/types";
import { csv } from "csvtojson";

export function InsertBooksPanel(){
  const fields: (keyof NewBook)[] = ["isbn", "title", "author", "publisher", "classification"];

  const [ state, formAction, isPending ] = useActionState(insertBook, undefined);
  const [ selectedClassification, setSelectedClassification] = useState<(typeof Classifications)[number]>("");
  const [ formKey, setFormKey ] = useState<number>(0);
  const [ importMode, setImportMode ] = useState<"manuel" | "csvText" | "csvFile">("manuel");

  useEffect(() => {
    if(state?.success){
      setSelectedClassification("");
      setFormKey(k => k + 1);
    }
  }, [state]);
  const [ error, setError ] = useState<string>("");
  const [ message, setMessage ] = useState<string>("");
  const [ loading, setLoading] = useState<Boolean>(false);
  const [ rows, setRows ] = useState<NewBook[]>([]);

  const handleClassification = (selected: string) => {
    setSelectedClassification(selected);
  };

  async function handleCSVText(formData: FormData){
    const csvText = formData.get("csvText") as string;
    try{
      setLoading(true);
      const jsonArray = await csv().fromString(csvText) as NewBook[];
      setRows(jsonArray);
    }catch(err){
      setError(String(err));
    }finally{
      setLoading(false);
    }
  }
  async function handleCSVFile(formData: FormData){
    const file = formData.get("csvFile") as File | null;
    if(!file) return;
    setLoading(true);
    setError("");
    try{
      const text = await file.text();
      const jsonArray = await csv().fromString(text);
      setRows(jsonArray);
    }catch(err){
      setError(String(err));
    }finally{
      setLoading(false);
    }
  }
  async function importConfirm(){
    setLoading(true);
    setError("");
    let successCount = 0;
    const failed: NewBook[] = [];
    let report = "";
    try{
      for(let i = 0; i < rows.length; i++){
        const row = rows[i];
        const formData = new FormData();
        let complete = true;
        fields.forEach((f) => {
          if(!row[f]) complete = false;
          formData.append(f, row[f]);
        });
        if(!complete){
          report += `row ${i + 1} incomplete: ${JSON.stringify(row)}\n`;
        }else{
          const res = await insertBook(undefined, formData);
          if(res.success){
            successCount += 1;
          }else{
            failed.push(row);
            report += `row ${i + 1} failed: ${res.message}\n`;
          }
        }
      }
      report += `\n${successCount} books inserted\n${failed.length} books failed`;
      setMessage(report);
    }catch(err){
      setError(String(err));
    }finally{
      setLoading(false);
      setRows([]);
    }
  }

  return(
    <div>
      Insert new book
      <div>
        <button disabled={loading === true} onClick={() => setImportMode("manuel")}>Manuel import</button>
        <button disabled={loading === true} onClick={() => setImportMode("csvText")}>CSV Text import</button>
        <button disabled={loading === true} onClick={() => setImportMode("csvFile")}>CSV File import</button>
      </div>
      {importMode == "manuel" ? (
        <form action={formAction}>
          <table>
            <tbody>
            {fields.slice(0, -1).map((f, i) => (
              <tr key={i}>
                <td><label>{f}</label></td>
                <td><input type="text" name={f}/></td>
              </tr>
            ))}
            {/* classification */}
            <tr>
              <td><label>classification</label></td>
              <td>
                <BookClassificationSelector key={formKey} onSelectedChange={handleClassification}/>
                <input
                  type="text" 
                  name="classification"
                  value={selectedClassification}
                  readOnly
                  className="hidden"
                />
              </td>
            </tr>
            </tbody>
          </table>
          <input type="submit"/>
        </form>
      ): (
        <div>
          {importMode == "csvText" ? (
            <form action={handleCSVText}>
              <label>CSV</label><br/>
              <textarea name="csvText" required/><br/>
              <button type="submit">Upload</button>
            </form>
          ): (
            <form action={handleCSVFile}>
              <label>CSV</label><br/>
              <input type="file" accept=".csv" name="csvFile" required/>
              <button type="submit">Upload</button>
            </form>
          )
          }
          { rows.length > 0 && 
              <form>
              <label>Preview</label><br/>
              <table>
                <tbody>
                  <tr>
                    {fields.map((f, i) => (<th key={i}>{f}</th>))}
                  </tr>
                  {rows.slice(0, Math.min(5, rows.length)).map((row, i) => (
                    <tr key={i}>
                      {fields.map((f, j) => (<td key={j}>{row[f]}</td>))}
                    </tr>
                  ))}
                  {rows.length > 5 && (
                    <tr><td colSpan={fields.length}>...</td></tr>
                  )}
                </tbody>
              </table>
              <button type="button" onClick={importConfirm} disabled={loading === true}>
                {loading ? "Importing..." : "Confirm"}
              </button>
            </form>
          }
        </div>
      )}
      
      { state && (
        <div>
          <p>{ state.message }</p>
        </div>
      )}
      { error && (
        <div><p className="whitespace-pre-wrap">{String(error)}</p></div>
      )}
      { message && (
        <div><p className="whitespace-pre-wrap">{message}</p></div>
      )}
    </div>
  );
}