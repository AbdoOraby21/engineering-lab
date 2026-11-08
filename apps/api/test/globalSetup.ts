import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { ensureDatabases, ensureEmbeddedCluster, embeddedUrl } from './embedded-db.js';
import { Client } from 'pg';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const testDatabaseUrl = embeddedUrl('engineering_lab_test');

export default async function globalSetup(): Promise<() => Promise<void>> {
  const cluster = await ensureEmbeddedCluster();
  await ensureDatabases(['engineering_lab', 'engineering_lab_test']);

  // Recreate the test database from scratch so a previously failed migration
  // record never blocks subsequent test runs (test-only infrastructure).
  const adminClient = new Client({
    host: '127.0.0.1',
    port: 55433,
    user: 'postgres',
    database: 'postgres',
  });
  await adminClient.connect();
  try {
    await adminClient.query(`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'engineering_lab_test' AND pid <> pg_backend_pid()`);
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
    await cluster.stop();
  };
}
