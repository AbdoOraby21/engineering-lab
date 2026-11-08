/**
 * Database backup / restore utility.
 *
 * Usage:
 *   DATABASE_URL=... tsx scripts/db-backup.ts   # writes ./backups/db-<timestamp>.sql
 *   DATABASE_URL=... tsx scripts/db-restore.ts ./backups/db-<timestamp>.sql
 *
 * Requires pg_dump / pg_restore to be available on PATH.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const BACKUP_DIR = join(process.cwd(), 'backups');

const url = new URL(DATABASE_URL);
const [user, password] = (url.password ? [url.username, url.password] : [url.username, '']);
const host = url.hostname;
const port = url.port || '5432';
const db = url.pathname.replace(/^\//, '');

const env = {
  ...process.env,
  ...(password ? { PGPASSWORD: password } : {}),
  PGUSER: user,
  PGHOST: host,
  PGPORT: port,
  PGDATABASE: db,
};

function runBackup(backupFile: string): void {
  mkdirSync(BACKUP_DIR, { recursive: true });
  execFileSync(
    'pg_dump',
    ['--no-owner', '--no-privileges', '--format=plain', '--file', backupFile, db],
    { stdio: 'inherit', env },
  );
  console.log(`Backup written to ${backupFile}`);
}

function runRestore(backupFile: string): void {
  if (!existsSync(backupFile)) {
    console.error(`Backup file not found: ${backupFile}`);
    process.exit(1);
  }
  execFileSync('pg_restore', ['--no-owner', '--no-privileges', '--clean', '--if-exists', '--dbname', db, backupFile], {
    stdio: 'inherit',
    env,
  });
  console.log(`Restored from ${backupFile}`);
}

const command = process.argv[2];
const file = process.argv[3];

if (command === 'backup') {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  runBackup(join(BACKUP_DIR, `db-${ts}.sql`));
} else if (command === 'restore' && file) {
  runRestore(file);
} else {
  console.error('Usage: tsx scripts/db-backup.ts backup | restore <file.sql>');
  process.exit(1);
}
