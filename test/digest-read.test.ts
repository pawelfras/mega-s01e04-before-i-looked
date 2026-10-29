import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { readNight } from '../src/digest/read.js'

describe('readNight on runs/2026-10-28.jsonl', () => {
  const night = readNight('runs', '2026-10-28')

  it('gives 5 jobs and 1 bad line', () => {
    expect(night).not.toBeNull()
    expect(night?.rows).toHaveLength(5)
    expect(night?.badLines).toBe(1)
  })

  it('sorts rows by job', () => {
    expect(night?.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ])
  })

  it('keeps a null owner and times as written', () => {
    const render = night?.rows.find((r) => r.job === 'digest/render')
    expect(render?.owner).toBeNull()
    expect(render?.firstAt).toBe('2026-10-29T05:41:09+01:00')
    const sync = night?.rows.find((r) => r.job === 'lane/sync')
    expect(sync?.firstAt).toBe('2026-10-28T23:00:06+01:00')
    expect(sync?.lastAt).toBe('2026-10-29T05:00:04+01:00')
  })

  it('counts runs, retries, fails and the last error', () => {
    const refresh = night?.rows.find((r) => r.job === 'fixtures/refresh')
    expect(refresh).toMatchObject({ runs: 4, retries: 3, fails: 0, lastStatus: 'ok', lastError: 'upstream 503' })
    const backup = night?.rows.find((r) => r.job === 'notes/backup')
    expect(backup).toMatchObject({ runs: 1, fails: 1, lastStatus: 'fail', lastError: 'quota exceeded' })
    expect(night?.counts).toEqual({ ok: 10, retry: 4, fail: 1 })
  })
})

describe('readNight on a temp runs dir', () => {
  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'rig-runs-'))
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('returns null when the night has no file', () => {
    expect(readNight(dir, '2026-01-01')).toBeNull()
  })

  it('returns no rows for an empty file', () => {
    writeFileSync(join(dir, '2026-01-02.jsonl'), '')
    expect(readNight(dir, '2026-01-02')).toEqual({
      night: '2026-01-02',
      rows: [],
      badLines: 0,
      counts: { ok: 0, retry: 0, fail: 0 },
    })
  })

  it('counts lines with the wrong shape as bad, never throws', () => {
    const lines = [
      '{"at":"2026-01-03T01:00:00+02:00","job":"a","status":"ok","owner":"x"}',
      '{"at":"2026-01-03T01:00:00+02:00","job":"a","status":"done","owner":"x"}',
      '{"at":"2026-01-03T01:00:00+02:00","job":"a","status":"ok"}',
      '[1,2]',
      'not json',
    ]
    writeFileSync(join(dir, '2026-01-03.jsonl'), lines.join('\n') + '\n')
    const night = readNight(dir, '2026-01-03')
    expect(night?.rows).toHaveLength(1)
    expect(night?.badLines).toBe(4)
  })
})
