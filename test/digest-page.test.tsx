import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('digest page', () => {
  it('renders the jobs of a night', async () => {
    const res = await createApp(config).request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    for (const job of ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs']) {
      expect(html).toContain(job);
    }
  });

  it('404s for an unknown night', async () => {
    expect((await createApp(config).request('/digest/2020-01-01')).status).toBe(404);
  });

  it('404s for a malformed night', async () => {
    expect((await createApp(config).request('/digest/..%2Frig')).status).toBe(404);
    expect((await createApp(config).request('/digest/abc')).status).toBe(404);
  });
});
