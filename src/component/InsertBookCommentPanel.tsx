'use client'

import { useActionState, useEffect } from "react";
import { useToast } from "./Toast";
import { insertBookComment } from "@/lib/action";
import { useRouter } from "next/navigation";
import { MAX_COMMENT_LENGTH } from "@/lib/types";

export function InsertBookCommentPanel({
  is_ebook, isbn, ebook_id
}: {
  is_ebook: boolean, isbn?: string, ebook_id?: number
}){
  const [ state, formAction, isPending ] = useActionState(insertBookComment, undefined);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (state){
      toast(state.message, !state.success);
      router.refresh();
    }
  }, [state]);

  return (
    <div
      style={{
        border: "1px solid",
        borderRadius: "1.5px",
        margin: "8px 4px",
        padding: "2px 6px",
        width: "98%",
        position: "sticky",
        bottom: 0,
        left: "1%",
        backgroundColor: "white"
      }}
    >
      <form action={formAction}>
        <input type="hidden" name="isbn" value={isbn}/>
        <input type="hidden" name="ebook_id" value={ebook_id}/>
        <input type="hidden" name="is_ebook" value={String(is_ebook)}/>
        <label>Comment</label>
        <input type="submit" value={"Insert"}/><br/>
        <textarea name="content" placeholder="Type your comment here" required maxLength={MAX_COMMENT_LENGTH} style={{width: "100%"}}/><br/>
      </form>
    </div>
  );
}