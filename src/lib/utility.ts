export function clamp(num: number, min: number, max: number, fallback?: number, is_int?: boolean): number {
  const rtn = !num ? (fallback ?? min) : Math.min(Math.max(num, min), max);
  return is_int ? Math.trunc(rtn) : rtn;
};