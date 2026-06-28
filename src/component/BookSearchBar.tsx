"use client"

import { useRouter, useSearchParams } from "next/navigation";

export function BookSearchBar(){
  const router = useRouter();
  const searchParams = useSearchParams();
  const keyword = searchParams.get("keyword") || "";
  const rowCount = Number(searchParams.get("rowCount"));
  const page = Number(searchParams.get("page"));

  // const handleSubmit = useCallback(
  //   (formData: FormData) => {
  //     const params = new URLSearchParams(searchParams.toString());
  //     params.set("keyword", formData.get("keyword")?.toString().trim() || "");
  //     router.replace(`?${params.toString()}`);
  //   },
  //   [router, searchParams]
  // );
  const handleSubmit = (formData: FormData) => {
    const keyword = formData.get("keyword")?.toString().trim() || "";
    const url = `/bookSearch?keyword=${encodeURIComponent(keyword)}`
      + (rowCount && `&rowCount=${rowCount}`)
      + (page && `&page=${page}`);
    router.push(url);
  };

  return (
    <form action={handleSubmit}>
      <input type="text" name="keyword" placeholder="Title/ISBN" defaultValue={keyword}/>
      <input type="submit"/>
    </form>
  );
}