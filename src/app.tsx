import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { readNight } from './digest/read.js';
import { lane } from './lane.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  // GET /api/digest/:night
  app.get('/api/digest/:night', async (c) => {
    const night = c.req.param('night');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return c.json({ error: 'not found' }, 404);
    try {
      const { rows, badLines } = await readNight(config.runsDir, night);
      return c.json({ night, rows, badLines });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return c.json({ error: 'not found' }, 404);
      throw err;
    }
  });

  return app;
}
