import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

type Body = { night: string; rows: { job: string; owner: string | null }[]; badLines: number };

const line = (o: Record<string, unknown>) => JSON.stringify(o);
const run = (job: string, status: string, owner: string | null, at: string) =>
  line({ at, job, status, owner, error: status === 'ok' ? null : 'boom' });

const nights: Record<string, string> = {
  '2026-01-01': '',
  '2026-01-02':
    [
      run('zeta/job', 'ok', 'ann', '2026-01-02T01:00:00+01:00'),
      'not json at all',
      run('alpha/job', 'ok', null, '2026-01-02T02:00:00+01:00'),
    ].join('\n') + '\n',
  '2026-01-03':
    [
      run('flaky/job', 'retry', 'bob', '2026-01-03T01:00:00+01:00'),
      run('flaky/job', 'retry', 'bob', '2026-01-03T01:05:00+01:00'),
      run('flaky/job', 'retry', 'bob', '2026-01-03T01:10:00+01:00'),
      run('flaky/job', 'fail', 'bob', '2026-01-03T01:15:00+01:00'),
      run('fine/job', 'ok', 'ann', '2026-01-03T01:20:00+01:00'),
    ].join('\n') + '\n',
};

let tmp: string;
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'rig-digest-'));
  for (const [night, text] of Object.entries(nights)) await writeFile(join(tmp, `${night}.jsonl`), text);
  app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: tmp });
});

afterAll(async () => {
  await rm(tmp, { recursive: true, force: true });
});

const page = async (night: string) => app.request(`/digest/${night}`);
const json = async (night: string) => app.request(`/api/digest/${night}`);

describe('digest routes', () => {
  it('200 for a normal night', async () => {
    expect((await page('2026-01-03')).status).toBe(200);
    expect((await json('2026-01-03')).status).toBe(200);
  });

  it('404 for a night with no file', async () => {
    expect((await page('2026-02-02')).status).toBe(404);
    expect((await json('2026-02-02')).status).toBe(404);
  });

  it('empty night', async () => {
    const res = await page('2026-01-01');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
    const body = (await (await json('2026-01-01')).json()) as Body;
    expect(body.rows).toEqual([]);
  });

  it('counts a bad line and still renders the other rows', async () => {
    const html = await (await page('2026-01-02')).text();
    expect(html).toContain('1 bad line');
    expect(html).toContain('zeta/job');
    expect(html).toContain('alpha/job');
    const body = (await (await json('2026-01-02')).json()) as Body;
    expect(body.badLines).toBe(1);
    expect(body.rows).toHaveLength(2);
  });

  it('owner null is — on the page and null in JSON', async () => {
    const html = await (await page('2026-01-02')).text();
    expect(html).toContain('<td>—</td>');
    const body = (await (await json('2026-01-02')).json()) as Body;
    expect(body.rows.find((r) => r.job === 'alpha/job')?.owner).toBeNull();
  });

  it('marks retries >= 3 and fail on the page', async () => {
    const html = await (await page('2026-01-03')).text();
    expect(html).toContain('<span class="warn"> retries</span>');
    expect(html).toContain('<span class="warn">fail</span>');
    const ok = await (await page('2026-01-02')).text();
    expect(ok).not.toContain('<span class="warn">fail</span>');
  });

  it('page and JSON list the same jobs in the same order', async () => {
    for (const night of ['2026-01-02', '2026-01-03']) {
      const html = await (await page(night)).text();
      const body = (await (await json(night)).json()) as Body;
      const jobs = body.rows.map((r) => r.job);
      const inPage = [...html.matchAll(/<tr><td>([^<]+)<\/td>/g)].map((m) => m[1]);
      expect(inPage).toEqual(jobs);
    }
  });
});
