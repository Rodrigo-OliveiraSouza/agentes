import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { territoriesRoute } from './routes/territories';
import { indicatorsRoute } from './routes/indicators';
import { dataRoute } from './routes/data';
import { geojsonRoute } from './routes/geojson';
import { cityProfileRoute } from './routes/city-profile';
import { homeContentRoute } from './routes/home-content';
import { toErrorResponse } from './lib/errors';
import { rateLimitMiddleware } from './lib/rate-limit';
import type { AppBindings } from './lib/types';

const app = new Hono<{ Bindings: AppBindings }>();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'PUT', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use('/api/*', rateLimitMiddleware());

app.get('/', (c) => {
  return c.json({
    ok: true,
    service: 'ibge-map-api',
    message: 'API online. Use /health ou /api/*',
    routes: ['/health', '/api/territories', '/api/indicators', '/api/data', '/api/geojson', '/api/city-profile', '/api/home-content'],
  });
});

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
app.route('/api/city-profile', cityProfileRoute);
app.route('/api/home-content', homeContentRoute);

app.notFound((c) => {
  return c.json(
    {
      error: {
        code: 'NOT_FOUND',
        message: 'Rota não encontrada.',
      },
    },
    404,
  );
});

app.onError((error) => {
  return toErrorResponse(error);
});

export default app;

