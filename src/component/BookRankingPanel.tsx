'use client'

import { BookRankings, BookRankingsInfoFields, BookRankingTypes } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function BookRankingPanel(
  { full, BookRankings }:
  { full: boolean, BookRankings: BookRankings }
){
  const router = useRouter();
  const [ rankingType, setRankingType ] = useState<(typeof BookRankingTypes)[number]>("monthly");
  let rankings: Record<keyof BookRankings, number[]> = { history: [], monthly: [], yearly: [] };
  let rowSpans: Record<keyof BookRankings, number[]> = { history: [], monthly: [], yearly: [] };
  BookRankingTypes.forEach((f) => {
    rankings[f][0] = 1;
    for(let i=1; i<BookRankings[f].length; i++){
      if(BookRankings[f][i].count == BookRankings[f][i-1].count) rankings[f][i] = rankings[f][i-1];
      else rankings[f][i] = i+1;
    }
    for(let i=BookRankings[f].length-1, rowSpan = 0; i>=0; i--){
      rowSpan++;
      if(i==0 || BookRankings[f][i].count != BookRankings[f][i-1].count){
        rowSpans[f][i] = rowSpan;
        rowSpan = 0;
      }else{
        rowSpans[f][i] = 0;
      }
    }
  });

  const table = (f: (typeof BookRankingTypes)[number], i: number) => {
    return (
      <table key={i}>
        <tbody>
          <tr>
            <td colSpan={4}>{f.toString()}</td>
          </tr>
          <tr>
            <th>Ranking</th>
            { BookRankingsInfoFields.map((f, k) => (
              <th key={k}>{f}</th>
            )) }
          </tr>
          { BookRankings[f].map((info, j) => (
            <tr key={j}>
              <td rowSpan={rowSpans[f][j]} hidden={rowSpans[f][j] === 0}>{rankings[f][j]}</td>
              { BookRankingsInfoFields.map((ff, k) => (
                <td key={k}>{info[ff]}</td>
              )) }
            </tr>
          )) }
          { BookRankings[f].length == 0 && (
            <tr><td colSpan={4}>No record yet</td></tr>
          )}
        </tbody>
      </table>
    );
  }

  if(full){
    return (
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24, alignItems: "flex-start" }}>
        { BookRankingTypes.map((f, i) => (
          table(f, i)
        ))}
      </div>
    );
  }else{
    return (
      <div className="enclose" style={{display: "flex", flexDirection: "column", alignItems: "center"}} onClick={() => {router.push("/bookRanking")}}>
        <div onClick={(e) => {e.stopPropagation()}}>
          <button className="btn" onClick={() => {setRankingType("monthly")}} disabled={rankingType === "monthly"}>Monthly</button>
          <button className="btn" onClick={() => {setRankingType("yearly")}} disabled={rankingType === "yearly"}>Yearly</button>
          <button className="btn" onClick={() => {setRankingType("history")}} disabled={rankingType === "history"}>History</button>
        </div>
        { table(rankingType, 0) }
      </div>
    )
  }
  
}