const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const { Client } = require('D:/ويبسايتي/apps/api/node_modules/pg');
  const admin = new Client({ host: '127.0.0.1', port: 55433, user: 'postgres', database: 'postgres' });
  await admin.connect();
  await admin.query('DROP DATABASE IF EXISTS replay_check');
  await admin.query('CREATE DATABASE replay_check');
  await admin.end();

  const c = new Client({ host: '127.0.0.1', port: 55433, user: 'postgres', database: 'replay_check' });
  await c.connect();

  const migrationsDir = path.resolve('prisma/migrations');
  const names = fs
    .readdirSync(migrationsDir)
    .filter((entry) => fs.statSync(path.join(migrationsDir, entry)).isDirectory())
    .sort();

  for (const name of names) {
    const file = path.join(migrationsDir, name, 'migration.sql');
    const sql = fs.readFileSync(file, 'utf8');
    process.stdout.write(`applying ${name} ... `);
    try {
      await c.query(sql);
      process.stdout.write('OK\n');
    } catch (error) {
      process.stdout.write('FAILED\n');
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
  console.log('CHAIN OK');
  await c.end();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
