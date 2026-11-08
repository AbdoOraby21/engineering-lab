const { Client } = require('pg');
(async () => {
  try {
    const c = new Client({ host: '127.0.0.1', port: 55433, user: 'postgres', database: 'engineering_lab', connectTimeout: 2000 });
    await c.connect();
    const r = await c.query('SELECT count(*) FROM "User"');
    console.log('DB OK on 55433 (trust), users:', r.rows[0].count);
    await c.end();
  } catch (e) {
    console.log('DB FAIL 55433:', e.message);
  }
})();
