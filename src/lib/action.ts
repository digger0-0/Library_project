'use server'

import { verifySession } from "./auth";
import { FormSate } from "./auth";
import { getDb } from "./db";

export async function insertAnnouncement(formState: FormSate | undefined, formData: FormData): Promise<FormSate>{
  try{
    const sessionData = await verifySession(true);

    if(sessionData?.role == 'admin'){
      const title = formData.get("title")?.toString().trim();
      const content = formData.get("content")?.toString().trim();

      if(!title || !content){
        return { success: false, message: "Incomplete input" };
      }

      const db = getDb();
      db.prepare("INSERT INTO announcements (title, content) VALUES (?, ?)").run(title, content);
      
      return { success: true, message: "New announcement added" };
    }

    return { success: false, message: "Unauthorized" };
  }catch(err){
    console.log("insertAnnouncement: ", err, new Date());
    return { success: false, message: `Announcemnet insertion failed.\nerr: ${err}` };
  }
}