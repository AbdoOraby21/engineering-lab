import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Use service PostgreSQL in CI, embedded for local development
const isCi = process.env.GITHUB_ACTIONS === 'true';
const testDatabaseUrl = isCi
  ? 'postgresql://postgres@localhost:5432/engineering_lab_test?schema=public'
  : 'postgresql://postgres@127.0.0.1:55433/engineering_lab_test?schema=public';

export default async function globalSetup(): Promise<() => Promise<void>> {
  const { Client } = await import('pg');
  const adminClient = new Client({
    host: isCi ? 'localhost' : '127.0.0.1',
    port: isCi ? 5432 : 55433,
    user: 'postgres',
    database: 'postgres',
  });
  await adminClient.connect();
  try {
    await adminClient.query(`DROP DATABASE IF EXISTS "engineering_lab_test"`);
    await adminClient.query(`CREATE DATABASE "engineering_lab_test"`);
  } finally {
    await adminClient.end();
  }

  const prismaCli = path.join(apiRoot, 'node_modules', 'prisma', 'build', 'index.js');
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: 'inherit',
  });

  return async () => {
    // No-op for service-based CI; local embedded cluster cleanup handled separately
  };
}
