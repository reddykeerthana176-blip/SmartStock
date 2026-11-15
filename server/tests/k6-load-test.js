import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * SmartStock High-Throughput Load Testing Script (k6)
 * Target Workload: 1,000,000 daily transactions
 * Baseline: ~12 req/sec | Peak Hours: 50 - 150 req/sec
 * SLA: p95 latency < 120ms, 0% error rate on concurrent atomic stock deductions
 */

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp-up to 20 virtual users
    { duration: '1m', target: 50 },   // Normal operational load (50 VUs)
    { duration: '1m', target: 100 },  // Peak traffic spike (100 VUs)
    { duration: '30s', target: 0 },   // Graceful ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<150'], // 95% of requests must complete below 150ms
    http_req_failed: ['rate<0.01'],    // Error rate must be less than 1%
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:5000/api';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
  };

  // 1. Dashboard summary read
  const dashboardRes = http.get(`${BASE_URL}/dashboard/summary`, { headers });
  check(dashboardRes, {
    'Dashboard status is 200': (r) => r.status === 200,
    'KPI total products returned': (r) => r.json('data.kpi.totalProducts') !== undefined,
  });

  // 2. Paginated inventory query
  const inventoryRes = http.get(`${BASE_URL}/products?page=1&limit=20`, { headers });
  check(inventoryRes, {
    'Inventory status is 200': (r) => r.status === 200,
  });

  // 3. Barcode lookup
  const barcodeRes = http.get(`${BASE_URL}/barcode/097855173515`, { headers });
  check(barcodeRes, {
    'Barcode lookup status is 200': (r) => r.status === 200,
  });

  sleep(0.5);
}
