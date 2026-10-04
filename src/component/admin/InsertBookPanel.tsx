"use client"

import { insertBook } from "@/lib/action";
import { useActionState, useEffect, useState } from "react";
import { useToast } from "../Toast";
import { BookClassificationSelector } from "./BookClassificationSelector";
import { Classifications, NewBook } from "@/lib/types";
import { csv } from "csvtojson";

export function InsertBooksPanel(){
  const fields: (keyof NewBook)[] = ["isbn", "title", "author", "publisher", "classification"];

  const [ state, formAction, isPending ] = useActionState(insertBook, undefined);
  const toast = useToast();
  const [ selectedClassification, setSelectedClassification] = useState<(typeof Classifications)[number]>("");
  const [ formKey, setFormKey ] = useState<number>(0);
  const [ importMode, setImportMode ] = useState<"manuel" | "csvText" | "csvFile">("manuel");

  useEffect(() => {
    if(state){
      toast(state.message, !state.success);
      if(state.success){
        setSelectedClassification("");
        setFormKey(k => k + 1);
      }
    }
  }, [state]);
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
  async function importConfirm(){
    setLoading(true);
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
      toast(report, failed.length > 0);
    }catch(err){
      toast(String(err), true);
    }finally{
      setLoading(false);
      setRows([]);
    }
  }

  return(
    <div className="enclose">
      Insert new book
      <div>
        <button style={{backgroundColor: (importMode == "manuel"? "lightgray": "white")}} className="btn" disabled={loading === true} onClick={() => setImportMode("manuel")}>Manuel import</button>
        <button style={{backgroundColor: (importMode == "csvText"? "lightgray": "white")}} className="btn" disabled={loading === true} onClick={() => setImportMode("csvText")}>CSV Text import</button>
        <button style={{backgroundColor: (importMode == "csvFile"? "lightgray": "white")}} className="btn" disabled={loading === true} onClick={() => setImportMode("csvFile")}>CSV File import</button>
      </div>
      {importMode == "manuel" ? (
        <form action={formAction}>
          <table>
            <tbody>
            {fields.slice(0, -1).map((f, i) => (
              <tr key={i}>
                <td><label>{f}</label></td>
                <td><input type="text" name={f} required autoComplete="off"/></td>
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
                  required
                  readOnly
                  className="hidden"
                />
              </td>
            </tr>
            </tbody>
          </table>
          <input type="submit" value={"Insert"}/>
        </form>
      ): (
        <div>
          {importMode == "csvText" ? (
            <form action={handleCSVText}>
              <label>CSV</label><br/>
              <textarea name="csvText" required/><br/>
              <input type="submit" value={"Upload"}/>
            </form>
          ): (
            <form action={handleCSVFile}>
              <label>CSV</label><br/>
              <input type="file" accept=".csv" name="csvFile" required/>
              <input type="submit" value={"Upload"}/>
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
              <button className="btn" type="button" onClick={importConfirm} disabled={loading === true}>
                {loading ? "Importing..." : "Confirm"}
              </button>
            </form>
          }
        </div>
      )}      
    </div>
  );
}