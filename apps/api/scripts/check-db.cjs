const { Client } = require('D:/ويبسايتي/apps/api/node_modules/pg');
(async () => {
  const db = process.argv[2] ?? 'engineering_lab';
  const c = new Client({ host: '127.0.0.1', port: 55433, user: 'postgres', database: db });
  await c.connect();
  const r = await c.query('select migration_name from _prisma_migrations order by started_at');
  console.log(db, 'migrations:', r.rows.map((x) => x.migration_name).join(' | '));
  const t = await c.query("select column_name from information_schema.columns where table_name='ProductImage' order by ordinal_position");
  console.log(db, 'ProductImage columns:', t.rows.map((x) => x.column_name).join(', '));
  await c.end();
})().catch((e) => { console.error(e); process.exit(1); });
