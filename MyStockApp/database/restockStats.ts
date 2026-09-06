// database/restockStats.ts
import type { RestockLogEntry } from '../types';

/** Days between each consecutive pair of restocks, sorted chronologically. */
function gapsInDays(entries: RestockLogEntry[]): number[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.restockedAt).getTime() - new Date(b.restockedAt).getTime()
  );
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1].restockedAt).getTime();
    const curr = new Date(sorted[i].restockedAt).getTime();
    gaps.push((curr - prev) / (1000 * 60 * 60 * 24));
  }
  return gaps;
}

/**
 * Average days between restocks for one product. Needs at least 2 logged
 * restocks (i.e. at least 1 gap) to mean anything -- returns null otherwise,
 * which callers should treat as "not enough history yet."
 */
export function computeAverageRestockDays(entries: RestockLogEntry[]): number | null {
  const gaps = gapsInDays(entries);
  if (gaps.length === 0) return null;
  return gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
}

/** Median days between restocks -- less skewed by one unusually long gap. */
export function computeMedianRestockDays(entries: RestockLogEntry[]): number | null {
  const gaps = gapsInDays(entries).sort((a, b) => a - b);
  if (gaps.length === 0) return null;
  const mid = Math.floor(gaps.length / 2);
  return gaps.length % 2 !== 0 ? gaps[mid] : (gaps[mid - 1] + gaps[mid]) / 2;
}
