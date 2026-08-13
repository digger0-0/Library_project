'use client'

import { Classifications } from "@/lib/types"
import { useEffect, useRef, useState } from "react";

interface ChildProps {
  onSelectedChange: (selected: (typeof Classifications)[number]) => void;
}

export function BookClassificationSelector(
  { onSelectedChange }:
  ChildProps
){
  const [query, setQuery] = useState<string>("");
  const [open, setOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredQueries =
    query === ''
      ? Classifications
      : Classifications.filter((c) => {
          return c.toLowerCase().includes(query.toLowerCase())
        });
  const rows = Math.min(5, Math.max(1, filteredQueries.length));

  // Close the dropdown when the user clicks outside the combobox.
  // Using a document "mousedown" listener instead of onBlur: with onBlur, the
  // blur event fires BEFORE the option's click/change registers, so the
  // dropdown is hidden before the selection can update the input. With this
  // listener, clicks on the dropdown (inside the container) are ignored, and
  // the option's change event runs normally.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef}>
      <input
        type="text"
        name="query"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true); // keep the list open while typing
        }}
        onFocus={() => { setOpen(true) }}
      />
      <select
        name="classification"
        onChange={(e) => {
          onSelectedChange(e.target.value);
          setQuery(e.target.value);
          setOpen(false);
        }}
        value={""}
        size={rows}
        hidden={!open}
      >
        {filteredQueries.map((c, i) => (
          <option key={i} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}