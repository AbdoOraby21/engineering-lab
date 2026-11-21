// Serverless entry for Vercel. The long-running server lives in index.ts;
// here we only export the Express app and expose a cron endpoint that runs
// the jobs node-cron would otherwise schedule.
import express from 'express';
import { createApp } from './app.js';
import { env } from './config/env.js';
import {
  expireOverdueOrders,
  sendExpiryReminders,
  sendLowStockDigest,
} from './jobs/expiry.js';

const root = express();

root.get('/api/v1/cron/jobs', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
    return;
  }
  try {
    await expireOverdueOrders();
    await sendExpiryReminders();
    await sendLowStockDigest();
    res.json({ data: { ok: true, env: env.NODE_ENV } });
  } catch {
    res.status(500).json({ error: { code: 'CRON_FAILED', message: 'Cron job failed' } });
  }
});

root.use(createApp());

export default root;
