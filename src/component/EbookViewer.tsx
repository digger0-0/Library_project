'use client'

import { Ebook, EbookFields } from "@/lib/types";
import { useEffect, useRef, useState } from "react";

export function EbookViewer(
  { ebook, content }:
  { ebook: Ebook, content: string }
){
  const [ isCollasped, setIsCollasped ] = useState<boolean>(true);
  const scrollY = useRef(0);
  const collaspedFields: (keyof Ebook)[] = ["title", "author"];
  const sections: string[] = content.split("\n");

  useEffect(() => {
    const localStorageKey = `${ebook.ebook_id} scrollProgress`;
    let saveTimer: ReturnType<typeof setTimeout> | null = null;

    // write the latest position to localStorage
    const handleSave = () => {
      localStorage.setItem(localStorageKey, scrollY.current.toString());
    };

    // the user stops scrolling for a moment
    const handleScroll = () => {
      scrollY.current = window.scrollY;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(handleSave, 500);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    // read scroll progress
    const savedProgress = localStorage.getItem(localStorageKey);
    if(savedProgress) window.scrollTo(0, Number(savedProgress));

    // save when the tab is hidden or the page truly unloads
    const onVisibility = () => {
      if(document.hidden) handleSave();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", handleSave);
    window.addEventListener("beforeunload", handleSave);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", handleSave);
      window.removeEventListener("beforeunload", handleSave);
      if (saveTimer) clearTimeout(saveTimer);
      handleSave();
    };
  }, [ebook.ebook_id]);

  return (
    <div>
      <table onClick={() => {setIsCollasped(prev => !prev)}}>
        <tbody>
        { isCollasped? (
          <tr>
            {collaspedFields.map((f, i) => (
              <th key={i}>{ebook[f]}</th>
            ))}
          </tr>
        ): (
            EbookFields.map((f, i) => (
              <tr key={i}>
                <td>{f}</td>
                <td>{ebook[f]}</td>
              </tr>
            ))
        )}
        </tbody>
        <tfoot><tr><td>{isCollasped? "v": "^"}</td></tr></tfoot>
      </table>
      <div>
        {sections.map((section, i) => (
          <div
            key={i}
            className="whitespace-pre-wrap"
          >
            {section}
          </div>
        ))}
      </div>
    </div>
  );
}