'use client'

import { useRouter } from "next/navigation";

export function ReturnButton(){
  const router = useRouter();
  return (
    <button
      className="btn"
      style={{position: "fixed", right: 0, zIndex: 10, margin: "2px 10px"}}
      onClick={() => {router.back()}}
    >
      Return
    </button>
  );
}