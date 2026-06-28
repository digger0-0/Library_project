'use client'

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function PageSelector({
  initialRowCount = 10,
  initialPage = 1,
}: {
  initialRowCount?: number;
  initialPage?: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rowCount = Number(searchParams.get("rowCount")) || initialRowCount;
  const page = Number(searchParams.get("page")) || initialPage;

  const handleRowCountChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const r = Number(e.target.value);
      const params = new URLSearchParams(searchParams.toString());
      params.set("rowCount", String(r));
      params.set("page", "1");
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handlePageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const p = Number(e.target.value) || 1;
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(p));
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const changePage = useCallback(
    (change: number) => {
      const p = page + change;
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", String(p));
      router.replace(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
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
        <button onClick={() => {changePage(-1)}}>{"<<"}</button>
        <input type="number" name="pageNumber" value={page} onChange={handlePageChange} min={1} />
        <button onClick={() => {changePage(1)}}>{">>"}</button>
      </label>
    </div>
  );
}