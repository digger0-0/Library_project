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
  
  if(full){
    return (
      <div>
        { RentalRankingFields.map((f, i) => (
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
          </table>
          ))
        }
      </div>
    );
  }

  return (
    <div> 
      <div>
        {RentalRankingFields.map((t, i) => (
          <button
            key={i}
            onClick={() => {setType(t)}}
          >
            {t.toString()}
          </button>
        ))}
      </div>
      <table onClick={() => {router.push("/rentalRanking")}}>
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
      </table>
    </div>
  );
}