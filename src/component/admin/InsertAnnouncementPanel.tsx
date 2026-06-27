'use client'

import { insertAnnouncement } from "@/lib/action";
import { useActionState } from "react";

export function InsertAnnouncementPanel(){
  const [ state, formAction, isPending ] = useActionState(insertAnnouncement, undefined);

  return (
    <div>
      <form action={formAction}>
        <label>Title</label><br/>
        <input type="text" name="title" required/><br/>
        <label>Content</label><br/>
        <textarea name="content" required/><br/>
        <input type="submit"/>
      </form>
      { state && (
        <div>
          { state.message }
        </div>
      )}
    </div>
  );
}