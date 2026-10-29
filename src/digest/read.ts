import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { DigestRow, JobStatus, Night, RunLine } from './types.js'

const STATUSES: readonly JobStatus[] = ['ok', 'retry', 'fail']

function isStatus(value: unknown): value is JobStatus {
  return typeof value === 'string' && (STATUSES as readonly string[]).includes(value)
}

/** Parses one log line; `null` when it isn't JSON or doesn't have the `RunLine` shape. */
function parseLine(text: string): RunLine | null {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const o = value as Record<string, unknown>
  if (typeof o.at !== 'string' || o.at === '') return null
  if (typeof o.job !== 'string' || o.job === '') return null
  if (!isStatus(o.status)) return null
  if (!('owner' in o) || (o.owner !== null && typeof o.owner !== 'string')) return null
  if (o.error !== undefined && typeof o.error !== 'string') return null
  const line: RunLine = { at: o.at, job: o.job, status: o.status, owner: o.owner }
  if (o.error !== undefined) line.error = o.error
  return line
}

/**
 * Returns `null` when `runs/<night>.jsonl` does not exist.
 *
 * Lines are taken in file order. Per job: `owner` and `lastStatus` come from its last line,
 * `lastError` is the most recent `error` seen (or `null`), `firstAt` / `lastAt` are kept as
 * written. Blank lines are skipped; any other line that doesn't parse counts in `badLines`.
 */
export function readNight(runsDir: string, night: string): Night | null {
  let text: string
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw err
  }

  const byJob = new Map<string, DigestRow>()
  const counts = { ok: 0, retry: 0, fail: 0 }
  let badLines = 0

  for (const raw of text.split('\n')) {
    if (raw.trim() === '') continue
    const line = parseLine(raw)
    if (line === null) {
      badLines++
      continue
    }
    counts[line.status]++
    const row = byJob.get(line.job)
    if (row === undefined) {
      byJob.set(line.job, {
        job: line.job,
        owner: line.owner,
        runs: 1,
        retries: line.status === 'retry' ? 1 : 0,
        fails: line.status === 'fail' ? 1 : 0,
        lastStatus: line.status,
        lastError: line.error ?? null,
        firstAt: line.at,
        lastAt: line.at,
      })
      continue
    }
    row.owner = line.owner
    row.runs++
    if (line.status === 'retry') row.retries++
    if (line.status === 'fail') row.fails++
    row.lastStatus = line.status
    if (line.error !== undefined) row.lastError = line.error
    row.lastAt = line.at
  }

  const rows = [...byJob.values()].sort((a, b) => (a.job < b.job ? -1 : a.job > b.job ? 1 : 0))
  return { night, rows, badLines, counts }
}
