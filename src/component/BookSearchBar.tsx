"use client"

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function BookSearchBar(){
  const router = useRouter();
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") || "";

  const handleSubmit = useCallback(
    (formData: FormData) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("keyword", formData.get("keyword")?.toString().trim() || "");
      params.set("page", "1");
      router.push(`/bookSearch/?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <form action={handleSubmit} style={{display: "flex", justifyContent: "center"}}>
      <input type="text" name="keyword" placeholder="Title/ISBN/Author" defaultValue={keyword} autoComplete="off"/>
      <input type="submit" value={"Search"}/>
    </form>
  );
}