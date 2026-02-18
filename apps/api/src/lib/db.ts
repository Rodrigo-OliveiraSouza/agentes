import { neon } from '@neondatabase/serverless';
import type { AppBindings } from './types';

export const getSql = (env: AppBindings) => {
  if (!env.DATABASE_URL) {
    return null;
  }

  return neon(env.DATABASE_URL);
};

