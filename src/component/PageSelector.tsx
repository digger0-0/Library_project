'use client'

import { clamp } from "@/lib/utility";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function PageSelector({
  initialRowCount = 10,
  initialPage = 1,
  checkBox = [],
  selection = [],
  rowCounts = [5, 10, 30],
  recordCount = Infinity,
}: {
  initialRowCount?: number;
  initialPage?: number;
  checkBox?: string[];
  selection?: [string, string[]][];
  rowCounts?: number[];
  recordCount?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rowCount = Number(searchParams.get("rowCount")) || initialRowCount;
  const page = Number(searchParams.get("page")) || initialPage;
  const checkBoxes: Map<string, unknown> = new Map<string, unknown>();
  checkBox.forEach((s) => {
    checkBoxes.set(s, searchParams.get(s)?.toString());
  });
  const selections: Map<string, unknown> = new Map<string, unknown>();
  selection.forEach((s) => {
    selections.set(s[0], searchParams.get(s[0])?.toString());
  });
  const pageRange = [1, clamp(Math.ceil(recordCount/rowCount), 1, Infinity)];

  useEffect(() => {
    if(pageRange[1] < page){
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", pageRange[1].toString());
      router.push(`?${params.toString()}`);
    }
  }, [recordCount, rowCount, page, searchParams, router]);
  

  const handleRowCountChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const r = Number(e.target.value);
    const params = new URLSearchParams(searchParams.toString());
    params.set("rowCount", String(r));
    params.set("page", "1");
    router.replace(`?${params.toString()}`);
  }

  const handlePageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const p = Number(e.target.value) || 1;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.replace(`?${params.toString()}`);
  }

  const changePage = (change: number) => {
    let p = page + change;
    p = Math.min(pageRange[1], Math.max(pageRange[0], p));
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.replace(`?${params.toString()}`);
  }

  const handleCheckBoxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked || false;
    const name = e.target.name;
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, String(checked));
    router.replace(`?${params.toString()}`);
  }

  const handleSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tag = e.target.value || "";
    const name = e.target.name;
    const params = new URLSearchParams(searchParams.toString());
    params.set(name, tag);
    router.replace(`?${params.toString()}`);
  }

  return (
    <div
      style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px", margin: "4px 8px" }}
    >
      <label>
        Num. of Data:
        <select name="rowCount" value={rowCount} onChange={handleRowCountChange}>
          {rowCounts.map((v, i) => (
            <option key={i} value={v}>{v}</option>
          ))}
        </select>
      </label>
      <label>
        Page:
        <button className="btn" onClick={() => {changePage(-1)}} disabled={page<=1}>{"<<"}</button>
        <input type="number" name="pageNumber" value={page} onChange={handlePageChange} min={1} />
        <button className="btn" onClick={() => {changePage(1)}} disabled={page>=pageRange[1]}>{">>"}</button>
      </label>
      {Array.from(checkBoxes.entries()).map((val, i) => (
        <label key={i}>
          {val[0]}{": "}
          <input
            type="checkbox"
            name={val[0]}
            defaultChecked={val[1] == "true"}
            onChange={handleCheckBoxChange}
          />
        </label>
      ))}
      {selection.map((val, i) => (
        <label key={i}>
          {val[0]}{": "}
          <select
            name={val[0]}
            // default is first element
            defaultValue={(selections.get(val[0]) || val[1][0]) as string}
            onChange={handleSelectionChange}
          >
            {val[1].map((tag, j) => (
              <option key={j}>{tag}</option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}