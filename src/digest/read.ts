import type { Night } from './types.js'

/** Returns `null` when `runs/<night>.jsonl` does not exist. */
export function readNight(runsDir: string, night: string): Night | null {
  void runsDir
  void night
  throw new Error('not implemented')
}
