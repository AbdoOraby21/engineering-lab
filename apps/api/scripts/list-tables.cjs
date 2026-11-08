const { Client } = require('D:/ويبسايتي/apps/api/node_modules/pg');
(async () => {
  const c = new Client({ host: '127.0.0.1', port: 55433, user: 'postgres', database: process.argv[2] ?? 'replay_check' });
  await c.connect();
  const r = await c.query("select tablename from pg_tables where schemaname='public' order by 1");
  console.log(r.rows.map((row) => row.tablename).join(', '));
  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
