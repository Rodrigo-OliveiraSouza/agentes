import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { territoriesRoute } from './routes/territories';
import { indicatorsRoute } from './routes/indicators';
import { dataRoute } from './routes/data';
import { geojsonRoute } from './routes/geojson';
import { toErrorResponse } from './lib/errors';
import { rateLimitMiddleware } from './lib/rate-limit';
import type { AppBindings } from './lib/types';

const app = new Hono<{ Bindings: AppBindings }>();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use('/api/*', rateLimitMiddleware());

app.get('/health', (c) => {
  return c.json({
    ok: true,
    service: 'ibge-map-api',
    timestamp: new Date().toISOString(),
  });
});

app.route('/api/territories', territoriesRoute);
app.route('/api/indicators', indicatorsRoute);
app.route('/api/data', dataRoute);
app.route('/api/geojson', geojsonRoute);

app.onError((error) => {
  return toErrorResponse(error);
});

export default app;

