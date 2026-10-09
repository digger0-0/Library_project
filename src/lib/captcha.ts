import "server-only";
import { randomBytes, randomInt } from "crypto";
import sharp from "sharp";
import { FormSate }from "./types";
import { logger } from "./logger";
import { CAPTCHA_H, CAPTCHA_W, PIECE_SIZE, TRAVEL, PIECE_TOP, TOLERANCE } from "./captcha-constant";


const backgounrdSVG = (x: number, y: number) => (`
  <svg width="${CAPTCHA_W}" height="${CAPTCHA_H}" xmlns="http://www.w3.org/2000/svg">
    <!-- Background -->
    <rect width="${CAPTCHA_W}" height="${CAPTCHA_H}" fill="blue" />

    <!-- Three lighter circles -->
    <circle cx="60" cy="60" r="30" fill="#66ccff" />
    <circle cx="60" cy="140" r="30" fill="#99ccf3" />
    <circle cx="180" cy="60" r="30" fill="#66e0ff" />

    <!-- Darker rounded square with border -->
    <rect x='${x}' y='${y}' width="${PIECE_SIZE}" height="${PIECE_SIZE}" rx="15" 
          fill="#224488" stroke="#4488cc" stroke-width="4" />
  </svg>
`);

const store = new Map<string, number>();

export async function newCaptcha(): Promise<[string, string] | null>{
  try {
    // gen a captcha code
    const code = randomBytes(16).toString("hex")

    // position
    const xPos = randomInt(80, TRAVEL);
    const yPos = PIECE_TOP;

    // gen svg
    const svg = backgounrdSVG(xPos, yPos);

    // convert to png
    const png = await sharp(Buffer.from(svg, "utf8")).png().toBuffer();

    // save code
    store.set(code, xPos);

    return [code, `data:image/png;base64,${png.toString("base64")}`];
  }catch(err){
    logger.error("New Captcha Creation Failed", {fn: "newCaptcha"}, err);
    return null;
  }
}

export function verifyCaptcha(formData: FormData): FormSate{
  const xPos = Number(formData.get("xPos"));
  const captchaCode = formData.get("captchaCode") as string;

  const answerXPos = store.get(captchaCode);

  // clear leftovers
  store.delete(captchaCode);

  if (answerXPos === undefined) return { success: false, message: "Invalid input" };
  // check xPos type
  if (!Number.isFinite(xPos) || Math.abs(xPos - answerXPos) > TOLERANCE){
    return { success: false, message: "Test failed" };
  }

  return { success: true, message: "" };
}