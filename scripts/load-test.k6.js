/**
 * k6 load test for Phase 7 performance targets.
 *
 * Requires k6 (https://k6.io). Run with:
 *   k6 run scripts/load-test.k6.js
 *
 * Targets: p95 < 300 ms for catalog reads under ~100 concurrent VUs.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const BASE = __ENV.API_BASE ?? 'http://127.0.0.1:4000';

const errors = new Counter('errors');

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95) < 300'],
    errors: ['count == 0'],
  },
};

const ENDPOINTS = [
  `${BASE}/api/v1/products?page=1&pageSize=12`,
  `${BASE}/api/v1/search/autocomplete?q=arduino&limit=8`,
  `${BASE}/api/v1/products/arduino-uno`,
];

export default function () {
  const url = ENDPOINTS[Math.floor(Math.random() * ENDPOINTS.length)];
  const res = http.get(url);
  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'p95 < 300ms (observed)': (r) => r.timings.duration < 300,
  });
  if (!ok) errors.add(1);
  sleep(0.5);
}
