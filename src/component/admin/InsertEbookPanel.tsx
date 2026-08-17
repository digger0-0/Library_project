'use client'

import { Classifications, NewEbook, NewEbookFields } from "@/lib/types";
import { useEffect, useState, useTransition } from "react";
import { BookClassificationSelector } from "./BookClassificationSelector";
import { insertEbook } from "@/lib/action";
import { useToast } from "../Toast";
import { clamp } from "@/lib/utility";

export function InsertEbookPanel(){
  const [ insertType, setInsertType ] = useState<"Text" | "File">("Text");
  const [ isPending, startTransition ] = useTransition();
  const [ formKey, setFormKey ] = useState<number>(0);
  const [ selectedClassification, setSelectedClassification] = useState<(typeof Classifications)[number]>("");
  const toast = useToast();

  function handleTextUpload(formData: FormData){
    let newEbook: NewEbook = {
      isbn: formData.get("isbn")?.toString().trim() as string,
      title: formData.get("title")?.toString().trim() as string,
      author: formData.get("author")?.toString().trim() as string,
      publisher: formData.get("publisher")?.toString().trim() as string,
      classification: formData.get("classification")?.toString().trim() as string,
      copies: clamp(Number(formData.get("copies")), 1, Infinity),
      filename: formData.get("filename")?.toString().trim() as string
    }
    const text = formData.get("content")?.toString().trim() as string;
    startTransition( async () => {
      const res = await insertEbook(newEbook, text);
      toast(res.message, !res.success);
      setSelectedClassification("");
      setFormKey(k => k + 1);
    });
  }

  async function handleFileUpload(formData: FormData){
    let newEbook: NewEbook = {
      isbn: formData.get("isbn")?.toString().trim() as string,
      title: formData.get("title")?.toString().trim() as string,
      author: formData.get("author")?.toString().trim() as string,
      publisher: formData.get("publisher")?.toString().trim() as string,
      classification: formData.get("classification")?.toString().trim() as string,
      copies: Number(formData.get("copies")),
      filename: formData.get("filename")?.toString().trim() as string
    }
    const file = formData.get("content") as File | null;
    if(!file) return;
    const text = await file.text();
    startTransition( async () => {
      const res = await insertEbook(newEbook, text);
      toast(res.message, !res.success);
      setSelectedClassification("");
      setFormKey(k => k + 1);
    });
  }

  const handleClassification = (selected: string) => {
    setSelectedClassification(selected);
  };

  return (
    <div>
      <p>Insert Ebook</p>
      <button onClick={() => {setInsertType("Text")}}>Text</button>
      <button onClick={() => {setInsertType("File")}}>File</button>
        {(() => {
          switch (insertType){
            case "Text":
              return (
                <form action={handleTextUpload}>
                  <table><tbody>
                  { NewEbookFields.map((f, i) => (f == "classification")? (
                    <tr key={i}>
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
                  ): (
                    <tr key={i}>
                      <td><label>{f}</label></td>
                      <td>
                        <input name={f} type="text" required/>
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td>Book</td>
                    <td><textarea name="content" required/></td>
                  </tr>
                  </tbody></table>
                  <button type="submit">Upload</button>
                </form>
              );
            case "File":
              return (
                <form action={handleFileUpload}>
                  <table><tbody>
                    { NewEbookFields.map((f, i) => (f == "classification")? (
                      <tr key={i}>
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
                    ): (
                      <tr key={i}>
                        <td><label>{f}</label></td>
                        <td>
                          <input name={f} type="text" required/>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td>Book</td>
                      <td><input type="file" name="content" required/></td>
                    </tr>
                  </tbody></table>
                  <button type="submit">Upload</button>
                </form>
              );
          }
        })()}
    </div>
  );
}