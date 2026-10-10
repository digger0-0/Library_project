'use client'

import { useState } from "react";
import { useAuth } from "./Auth"
import { updateLike } from "@/lib/action";
import { useToast } from "./Toast";
import { useRouter } from "next/navigation";

export function LikeBookButton({
  is_liked, is_ebook, ebook_id, isbn
}:{
  is_liked: boolean, is_ebook: boolean, ebook_id?: number, isbn?: string
}){
  const { sessionData } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [ loading, setLoading ] = useState<boolean>(false);
  if(!sessionData){
    return null;
  }

  return (
    <button
      className="btn"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        const res = await updateLike(is_ebook, isbn, ebook_id);
        toast(res.message, !res.success);
        setLoading(false);
        router.refresh();
      }}
    >{ is_liked? "Unlike": "Like" }</button>
  );
}