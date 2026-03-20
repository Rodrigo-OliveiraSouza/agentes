import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const envFilenames = ['.env', '.env.local', '.env.production', '.env.production.local'];

const parseEnvFile = (raw) => {
  const entries = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    entries[key] = value;
  }

  return entries;
};

const fileEnv = {};

for (const filename of envFilenames) {
  const fullPath = path.join(projectRoot, filename);
  if (!fs.existsSync(fullPath)) continue;
  Object.assign(fileEnv, parseEnvFile(fs.readFileSync(fullPath, 'utf8')));
}

const env = {
  ...fileEnv,
  ...process.env,
};

const requiredKeys = ['VITE_GOOGLE_MAPS_API_KEY'];
const missingKeys = requiredKeys.filter((key) => !String(env[key] ?? '').trim());

if (missingKeys.length > 0) {
  console.error(`Missing required build env: ${missingKeys.join(', ')}`);
  console.error('Define the key in apps/web/.env.production or export it in the current shell before running the build.');
  process.exit(1);
}
