export type JobStatus = 'ok' | 'retry' | 'fail'

/** One parsed log line. */
export interface RunLine {
  at: string
  job: string
  status: JobStatus
  owner: string | null
  error?: string
}

/** One row per job. `firstAt` / `lastAt` are as written in the log (offset kept). */
export interface DigestRow {
  job: string
  owner: string | null
  runs: number
  retries: number
  fails: number
  lastStatus: JobStatus
  lastError: string | null
  firstAt: string
  lastAt: string
}

export interface Night {
  night: string
  rows: DigestRow[]
  badLines: number
  counts: { ok: number; retry: number; fail: number }
}
