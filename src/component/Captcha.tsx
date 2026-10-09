'use client'

import { requestCaptcha } from "@/lib/captcha-action";
import { CAPTCHA_H, CAPTCHA_W, PIECE_TOP, PIECE_SIZE, TRAVEL } from "@/lib/captcha-constant";
import { useEffect, useState } from "react"

export function Captcha({ cancel }: { cancel: () => void }){
  const [ slider, setSlider ] = useState<number>(0);
  const [ code, setCode ] = useState<string | null>(null);
  const [ image, setImage ] = useState<string | undefined>(undefined);
  const [ retry, setRetry ] = useState<number>(0);
  const [ error, setError ] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await requestCaptcha();
      if (cancelled) return;
      if (!res){ setError("Could not load the puzzle."); setImage(undefined); setCode(null); return; }
      setError(null); setCode(res[0]); setImage(res[1]);
    })();
    return () => { cancelled = true; };
  }, [retry]);

  useEffect(() => { setSlider(0); }, [image]);

  return (
    <div style={{display: "flex", flexDirection: "column", alignItems: "center"}}>
      <label>Slide the piece into the gap</label>
      <div style={{height: CAPTCHA_H, width: CAPTCHA_W, position: "relative"}}>
        <img src={image} width={CAPTCHA_W} height={CAPTCHA_H} alt="Slide into the gap" draggable={false}/>
        <div style={{
          width: PIECE_SIZE,
          height: PIECE_SIZE,
          position: "absolute",
          top: PIECE_TOP,
          left: slider,
          borderRadius: 15,
          border: "2px solid #fff",
          background: "rgba(255,255,255,.25)",
          pointerEvents: "none"
        }}/>
      </div>
      <input
        type="range" min={0} max={TRAVEL} step={1}
        value={slider}
        onChange={(e) => {setSlider(Number(e.target.value))}}
        style={{width: CAPTCHA_W-PIECE_SIZE}}
        name="xPos"
      />
      <div>
        <input type="hidden" name="captchaCode" value={code ?? ""}/>
        <button className="btn" type="button" onClick={() => {setRetry((val) => (val + 1))}} disabled={retry >= 5}>New Puzzle</button>
        <button className="btn" type="button" onClick={cancel}>Cancel</button>
        <input type="submit" value={"Confirm"}/>
      </div>
    </div>
  );
}