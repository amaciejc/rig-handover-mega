import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('GET /api/digest/:night', () => {
  it('returns the night rows sorted by job', async () => {
    const res = await createApp(config).request('/api/digest/2026-10-28');
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = (await res.json()) as { night: string; rows: { job: string }[]; badLines: number };
    expect(body.night).toBe('2026-10-28');
    expect(body.rows).toHaveLength(5);
    const jobs = body.rows.map((r) => r.job);
    expect(jobs).toEqual([...jobs].sort());
    expect(body.badLines).toBe(1);
  });

  it('404s for an unknown night', async () => {
    const res = await createApp(config).request('/api/digest/2020-01-01');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'not found' });
  });

  it('404s for a malformed night', async () => {
    const res = await createApp(config).request('/api/digest/..%2Fconfig');
    expect(res.status).toBe(404);
  });
});
