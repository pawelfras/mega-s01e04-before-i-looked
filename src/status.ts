import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { readNight } from './digest/read.js';
import type { Night } from './digest/types.js';
import { lastBeat, type Beat } from './heartbeat.js';

export type NightCounts = Night['counts'];

export type NightEntry = {
  night: string;
  // null when the counts cannot be read (the view shows `—`).
  counts: NightCounts | null;
};

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: NightEntry[];
};

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

// Bad lines are counted, never thrown, and a missing file is `null`; any other read error
// is real and surfaces.
export function nightCounts(runsDir: string, night: string): NightCounts | null {
  return readNight(runsDir, night)?.counts ?? null;
}

export function readStatus(config: RigConfig): Status {
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights: nightsOnDisk(config.runsDir).map((night) => ({
      night,
      counts: nightCounts(config.runsDir, night),
    })),
  };
}
