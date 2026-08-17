export function clamp(num: number, min: number, max: number, fallback?: number): number {
  if(!num) return fallback ?? min;
  return Math.min(Math.max(num, min), max);
};