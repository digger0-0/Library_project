'use client'

import { useRouter } from "next/navigation";

export function ReturnButton(){
  const router = useRouter();
  return (
    <div>
      <button
        onClick={() => {router.back()}}
      >
        Return
      </button>
    </div>
  );
}