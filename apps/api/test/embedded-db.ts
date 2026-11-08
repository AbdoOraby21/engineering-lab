import { connect } from 'node:net';
import { existsSync, mkdirSync, statSync, readdirSync, copyFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(apiRoot, '../..');

export const EMBEDDED_PG_PORT = 55433;
export const EMBEDDED_PG_USER = 'postgres';

const RUNTIME_DIR = process.env.ENG_LAB_PG_RUNTIME
  ? path.resolve(process.env.ENG_LAB_PG_RUNTIME)
  : path.join(os.homedir(), '.engineering-lab-runtime');
const BIN_DIR = path.join(RUNTIME_DIR, 'bin');
const DATA_DIR = path.join(RUNTIME_DIR, 'data');
const LOG_FILE = path.join(RUNTIME_DIR, 'postgres.log');

export function embeddedUrl(database: string): string {
  return `postgresql://${EMBEDDED_PG_USER}@127.0.0.1:${EMBEDDED_PG_PORT}/${database}?schema=public`;
}

export async function canConnect(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ port, host });
    const done = (value: boolean) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(1000);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

function findBundledNativeDir(): string {
  const pnpmStore = path.join(repoRoot, 'node_modules', '.pnpm');
  if (existsSync(pnpmStore)) {
    const candidates = readdirSync(pnpmStore).filter((entry) =>
      entry.startsWith('@embedded-postgres+windows-x64@'),
    );
    for (const entry of candidates) {
      const native = path.join(
        pnpmStore,
        entry,
        'node_modules',
        '@embedded-postgres',
        'windows-x64',
        'native',
      );
      if (existsSync(path.join(native, 'bin', 'initdb.exe'))) {
        return native;
      }
    }
  }
  throw new Error(
    'Could not locate the bundled @embedded-postgres/windows-x64 binaries. Run `pnpm install` first. (The windows-x64 package is a devDependency that supplies initdb/pg_ctl for the embedded cluster.)',
  );
}

function copyDir(source: string, target: string): void {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      copyDir(sourcePath, targetPath);
    } else if (entry.isFile()) {
      if (!existsSync(targetPath) || statSync(targetPath).size !== statSync(sourcePath).size) {
        copyFileSync(sourcePath, targetPath);
      }
    }
  }
}

function ensureBinaries(): void {
  const initdb = path.join(BIN_DIR, 'bin', 'initdb.exe');
  if (existsSync(initdb)) {
    return;
  }
  const native = findBundledNativeDir();
  console.log(`Copying embedded PostgreSQL binaries to ${BIN_DIR} ...`);
  if (existsSync(BIN_DIR)) {
    rmSync(BIN_DIR, { recursive: true, force: true });
  }
  copyDir(path.join(native), BIN_DIR);
}

function run(exe: string, args: string[], timeoutMs = 120_000): void {
  execFileSync(exe, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: timeoutMs,
    env: { ...process.env, PGCLIENTENCODING: 'UTF8' },
  });
}

export interface EmbeddedCluster {
  startedByUs: boolean;
  stop: () => Promise<void>;
}

export async function ensureEmbeddedCluster(): Promise<EmbeddedCluster> {
  if (await canConnect(EMBEDDED_PG_PORT)) {
    return { startedByUs: false, stop: async () => {} };
  }

  ensureBinaries();
  mkdirSync(RUNTIME_DIR, { recursive: true });

  const pgBin = path.join(BIN_DIR, 'bin');
  const initdb = path.join(pgBin, 'initdb.exe');
  const pgCtl = path.join(pgBin, 'pg_ctl.exe');

  if (!existsSync(path.join(DATA_DIR, 'PG_VERSION'))) {
    if (existsSync(DATA_DIR)) {
      rmSync(DATA_DIR, { recursive: true, force: true });
    }
    run(initdb, [
      '-D',
      DATA_DIR,
      '--auth=trust',
      `--username=${EMBEDDED_PG_USER}`,
      '--no-locale',
      '--encoding=UTF8',
    ]);
  }

  run(pgCtl, ['start', '-D', DATA_DIR, '-l', LOG_FILE, '-w', '-t', '60', '-o', `-p ${EMBEDDED_PG_PORT}`]);

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await canConnect(EMBEDDED_PG_PORT)) {
      return {
        startedByUs: true,
        stop: async () => {
          try {
            run(pgCtl, ['stop', '-D', DATA_DIR, '-m', 'fast', '-w', '-t', '30']);
          } catch {
            // Cluster already stopped.
          }
        },
      };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Embedded PostgreSQL did not start within 60s. See ${LOG_FILE} for details.`);
}

async function pgClient(database: string) {
  const { Client } = await import('pg');
  const client = new Client({
    host: '127.0.0.1',
    port: EMBEDDED_PG_PORT,
    user: EMBEDDED_PG_USER,
    database,
  });
  await client.connect();
  return client;
}

export async function ensureDatabases(databases: string[]): Promise<void> {
  const client = await pgClient('postgres');
  try {
    const { rows } = await client.query<{ datname: string }>(
      'SELECT datname FROM pg_database WHERE datistemplate = false',
    );
    const existing = new Set(rows.map((row) => row.datname));
    for (const database of databases) {
      if (!existing.has(database)) {
        await client.query(`CREATE DATABASE "${database.replace(/"/g, '""')}"`);
      }
    }
  } finally {
    await client.end();
  }
}

export const embeddedBinDir = BIN_DIR;
export const embeddedDataDir = DATA_DIR;
export const embeddedLogFile = LOG_FILE;
