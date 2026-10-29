import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

// runs/ is read-only: every night here lives in a temp dir.
const NIGHT_OK = '2026-10-28';
const NIGHT_EMPTY = '2026-10-27';
const NIGHT_BAD = '2026-10-26';
const NIGHT_MISSING = '2026-10-25';

const OK_LINES = [
  '{"at":"2026-10-28T23:00:02+01:00","job":"rig/rotate-logs","status":"ok","owner":"lane-07"}',
  '{"at":"2026-10-29T01:00:05+01:00","job":"lane/sync","status":"ok","owner":"rook"}',
  '{"at":"2026-10-29T01:30:00+01:00","job":"fixtures/refresh","status":"retry","owner":"rook","error":"upstream 503"}',
  '{"at":"2026-10-29T01:31:00+01:00","job":"fixtures/refresh","status":"fail","owner":"rook","error":"upstream 503"}',
  '{"at":"2026-10-29T04:00:01+01:00","job":"notes/backup","status":"ok","owner":null}',
];

const config = (runsDir: string) => ({
  adapter: 'shim',
  installed: '2026-10-29T14:06:00+01:00',
  beatEverySeconds: 60,
  runsDir,
});

let runsDir: string;

beforeAll(() => {
  runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-routes-'));
  writeFileSync(join(runsDir, `${NIGHT_OK}.jsonl`), OK_LINES.join('\n') + '\n');
  writeFileSync(join(runsDir, `${NIGHT_EMPTY}.jsonl`), '');
  writeFileSync(join(runsDir, `${NIGHT_BAD}.jsonl`), [OK_LINES[1], 'this is not json', ''].join('\n'));
});

afterAll(() => {
  rmSync(runsDir, { recursive: true, force: true });
});

describe('GET /digest/:night (page)', () => {
  it('200 for a night with a file, with the job names in a table', async () => {
    const res = await createApp(config(runsDir)).request(`/digest/${NIGHT_OK}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('<table');
    expect(html).toContain('rig/rotate-logs');
    expect(html).toContain('lane/sync');
    expect(html).toContain('fixtures/refresh');
    expect(html).toContain('notes/backup');
  });

  it('404 for a night with no file', async () => {
    const res = await createApp(config(runsDir)).request(`/digest/${NIGHT_MISSING}`);
    expect(res.status).toBe(404);
  });

  it('the empty night says "nothing ran"', async () => {
    const res = await createApp(config(runsDir)).request(`/digest/${NIGHT_EMPTY}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('nothing ran');
  });

  it('a night with a bad line still renders (200)', async () => {
    const res = await createApp(config(runsDir)).request(`/digest/${NIGHT_BAD}`);
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('lane/sync');
  });
});

describe('GET /api/digest/:night (JSON)', () => {
  it('200 with { night, rows, badLines, counts } for a night with a file', async () => {
    const res = await createApp(config(runsDir)).request(`/api/digest/${NIGHT_OK}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.night).toBe(NIGHT_OK);
    expect(body.rows.map((r) => r.job)).toEqual([
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
    expect(body.badLines).toBe(0);
    expect(body.counts).toEqual({ ok: 3, retry: 1, fail: 1 });
  });

  it('404 with { error: "no such night" } for a night with no file', async () => {
    const res = await createApp(config(runsDir)).request(`/api/digest/${NIGHT_MISSING}`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no such night' });
  });

  it('the empty night has rows: []', async () => {
    const res = await createApp(config(runsDir)).request(`/api/digest/${NIGHT_EMPTY}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.rows).toEqual([]);
  });

  it('a night with a bad line is still 200, with badLines: 1', async () => {
    const res = await createApp(config(runsDir)).request(`/api/digest/${NIGHT_BAD}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as Night;
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['lane/sync']);
  });
});
