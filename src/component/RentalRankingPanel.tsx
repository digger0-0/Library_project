'use client'

import { RentalRankingFields, RentalRankings } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RentalRankingPanel({
  RentalRankings,
  full
}:{
  RentalRankings: RentalRankings;
  full: boolean
}){
  const [type, setType] = useState<(typeof RentalRankingFields[number])>("monthly");
  const router = useRouter();
  let rankings: {monthly: number[], yearly: number[]} = {monthly: [], yearly: []};
  let rowSpans: {monthly: number[], yearly: number[]} = {monthly: [], yearly: []};
  RentalRankingFields.forEach((f) => {
    rankings[f][0] = 1;
    for(let i=1; i<RentalRankings[f].length; i++){
      if(RentalRankings[f][i].rentalCount == RentalRankings[f][i-1].rentalCount) rankings[f][i] = rankings[f][i-1];
      else rankings[f][i] = i+1;
    }
    for(let i=RentalRankings[f].length-1, rowSpan = 0; i>=0; i--){
      rowSpan++;
      if(i==0 || RentalRankings[f][i].rentalCount != RentalRankings[f][i-1].rentalCount){
        rowSpans[f][i] = rowSpan;
        rowSpan = 0;
      }else{
        rowSpans[f][i] = 0;
      }
    }
  });

  const table = (f: (typeof RentalRankingFields[number]), i: number) => {
    return (
      <table key={i}>
        <tbody>
          <tr>
            <td colSpan={3}>{f.toString()}</td>
          </tr>
          <tr>
            <th>Ranking</th>
            <th>Username</th>
            <th>RentalCount</th>
          </tr>
          { RentalRankings[f].length > 0 ?
            RentalRankings[f].map((rentalRanking, i) => (
              <tr key={i}>
                <td rowSpan={rowSpans[f][i]} hidden={rowSpans[f][i] == 0}>{rankings[f][i]}</td>
                <td>{rentalRanking.username}</td>
                <td>{rentalRanking.rentalCount}</td>
              </tr>
            )) :
            <tr>
              <td colSpan={3}>No record yet</td>
            </tr>
          }
        </tbody>
      </table>
    );
  }
  
  if(full){
    return (
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 24, alignItems: "flex-start" }}>
        { RentalRankingFields.map((f, i) => (
          table(f, i)
          ))
        }
      </div>
    );
  }

  return (
    <div className="enclose" onClick={() => {router.push("/rentalRanking")}}> 
      <div style={{ display: "flex", justifyContent: "center", gap: "8px" }}>
        {RentalRankingFields.map((t, i) => (
          <button
            className="btn"
            key={i}
            onClick={(e) => {e.stopPropagation() ;setType(t)}}
            style={{backgroundColor: (type == t? "lightgray": "white")}}
          >
            {t.toString()}
          </button>
        ))}
      </div>
      { table(type, 0) }
      {/* <table onClick={() => {router.push("/rentalRanking")}}>
        <tbody>
          <tr>
            <th>Ranking</th>
            <th>Username</th>
            <th>RentalCount</th>
          </tr>
          { RentalRankings[type].length > 0 ?
            RentalRankings[type].map((rentalRanking, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{rentalRanking.username}</td>
                <td>{rentalRanking.rentalCount}</td>
              </tr>
            )) :
            <tr>
              <td colSpan={3}>No record yet</td>
            </tr>
          }
        </tbody>
      </table> */}
    </div>
  );
}