import { describe, expect, it } from 'vitest';
import { DigestPage } from '../src/views/digest.js';
import type { Night } from '../src/digest/types.js';

const night: Night = {
  night: '2026-10-28',
  badLines: 2,
  counts: { ok: 3, retry: 3, fail: 1 },
  rows: [
    { job: 'build', owner: null, runs: 2, retries: 0, fails: 0, lastStatus: 'ok', lastError: null, firstAt: '2026-10-28T01:00:00+01:00', lastAt: '2026-10-28T02:00:00+01:00' },
    { job: 'sync', owner: 'ops', runs: 4, retries: 3, fails: 1, lastStatus: 'fail', lastError: 'timeout', firstAt: '2026-10-28T03:00:00+01:00', lastAt: '2026-10-28T04:00:00+01:00' },
  ],
};

describe('digest view', () => {
  it('marks warn rows, shows dashes for missing values and the bad line count', async () => {
    const html = await (<DigestPage night={night} />).toString();
    expect(html).toContain('2026-10-28T04:00:00+01:00');
    expect(html).toContain('<td>—</td>');
    expect(html).toMatch(/<tr class="warn">\s*<td>sync<\/td>/);
    expect(html).not.toMatch(/<tr class="warn">\s*<td>build<\/td>/);
    expect(html).toContain('bad lines: 2');
  });

  it('says nothing ran for an empty night', async () => {
    const html = await (<DigestPage night={{ ...night, rows: [], badLines: 0 }} />).toString();
    expect(html).toContain('nothing ran');
    expect(html).not.toContain('bad lines');
  });
});
