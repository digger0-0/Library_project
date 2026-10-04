const TZ = process.env.NEXT_PUBLIC_DISPLAY_TZ ?? "Asia/Hong_Kong";
const DT = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" });

// handles the missing "Z" once
export function parseDbDate(v: string): Date {
  return new Date(v.includes("T") ? v : v.replace(" ", "T") + "Z");
}

export const fmtDate = (v: unknown) =>
  (typeof v === "string" && v) ? DT.format(parseDbDate(v)) : "—";
export const fmtBool  = (v: unknown) => (v ? "Yes" : "No");
export const fmtCount = (v: unknown) => (v == null ? "—" : String(v));

export function makeCell<T>(fmt: Partial<Record<keyof T, (v: unknown) => string>>){
  return (f: keyof T, v: unknown) => {
    const conv = fmt[f];
    return conv ? conv(v) : String(v);
  };
}