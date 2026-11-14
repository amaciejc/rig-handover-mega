import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { nightCounts } from '../src/status.js';

const config = { adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: 'runs' };

describe('status board digest links', () => {
  it('links each night to a digest that renders, with counts', async () => {
    const app = createApp(config);
    const html = await (await app.request('/')).text();
    for (const night of ['2026-10-27', '2026-10-28']) {
      const link = `/digest/${night}`;
      expect(html).toContain(link);
      const c = nightCounts('runs', night);
      expect(c).not.toBeNull();
      expect(html).toContain(`ok ${c?.ok} · retry ${c?.retry} · fail ${c?.fail}`);
      expect((await app.request(link)).status).toBe(200);
    }
  });

  it('shows a dash for an unreadable night', () => {
    expect(nightCounts('runs', '1999-01-01')).toBeNull();
  });
});
