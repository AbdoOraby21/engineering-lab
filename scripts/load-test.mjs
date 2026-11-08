/**
 * Phase 7 load-test smoke script.
 *
 * Hits the public catalog endpoints concurrently and reports p50/p95/p99 latency.
 * Intended to run against a locally running API (PORT=4000) with a seeded DB.
 *
 * Usage:
 *   PORT=4000 node scripts/load-test.mjs
 *
 * Targets (from Phase 7): p95 < 300 ms for catalog reads under ~100 concurrent users.
 */

import http from 'node:http';

const PORT = process.env.PORT ?? '4000';
const HOST = '127.0.0.1';
const BASE = `http://${HOST}:${PORT}`;

const CONCURRENCY = 50;
const ITERATIONS = 20; // total requests per endpoint = CONCURRENCY * ITERATIONS

const endpoints = [
  { name: 'GET /api/v1/products (catalog)', path: '/api/v1/products?page=1&pageSize=12' },
  { name: 'GET /api/v1/search/suggest', path: '/api/v1/search/autocomplete?q=arduino&limit=8' },
  { name: 'GET /api/v1/products/:slug (detail)', path: '/api/v1/products/arduino-uno' },
];

const latencies: Record<string, number[]> = {};

function request(path: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const start = process.hrtime.bigint();
    http
      .get(`${BASE}${path}`, (res) => {
        res.resume();
        res.on('end', () => {
          const end = process.hrtime.bigint();
          resolve(Number(end - start) / 1_000_000); // ms
        });
      })
      .on('error', reject);
  });
}

async function bench(endpoint: { name: string; path: string }): Promise<void> {
  const results: number[] = [];
  const errors: number[] = [];
  let inFlight = 0;
  let completed = 0;
  const total = CONCURRENCY * ITERATIONS;

  await new Promise<void>((resolve) => {
    const schedule = () => {
      if (completed >= total) {
        resolve();
        return;
      }
      inFlight += 1;
      request(endpoint.path)
        .then((ms) => results.push(ms))
        .catch(() => errors.push(1))
        .finally(() => {
          inFlight -= 1;
          completed += 1;
          schedule();
        });
    };
    for (let i = 0; i < CONCURRENCY; i += 1) schedule();
  });

  results.sort((a, b) => a - b);
  const p = (percentile: number): number => {
    const idx = Math.ceil((percentile / 100) * results.length) - 1;
    return results[Math.max(0, Math.min(idx, results.length - 1))];
  };
  latencies[endpoint.name] = results;
  console.log(
    `${endpoint.name}: n=${results.length} errors=${errors.length} ` +
      `p50=${p(50).toFixed(1)}ms p95=${p(95).toFixed(1)}ms p99=${p(99).toFixed(1)}ms ` +
      `max=${results[results.length - 1]?.toFixed(1) ?? 0}ms`,
  );
}

async function main(): Promise<void> {
  console.log(`Load test against ${BASE} (conc=${CONCURRENCY}, iters=${ITERATIONS})\n`);
  for (const endpoint of endpoints) {
    await bench(endpoint);
  }

  const allP95 = endpoints.map((e) => {
    const r = latencies[e.name].slice().sort((a, b) => a - b);
    const idx = Math.ceil(0.95 * r.length) - 1;
    return r[Math.max(0, Math.min(idx, r.length - 1))];
  });
  const worstP95 = Math.max(...allP95);
  console.log(`\nWorst p95: ${worstP95.toFixed(1)} ms (target < 300 ms)`);
  if (worstP95 >= 300) {
    console.error('FAIL: p95 target not met');
    process.exit(1);
  } else {
    console.log('PASS: p95 target met');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
