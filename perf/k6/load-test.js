/**
 * k6 smoke load test for SmartAccounting API.
 *
 * Env:
 *   BASE_URL          — e.g. https://api.rw.smartaccounting.app
 *   K6_USERNAME       — login email
 *   K6_PASSWORD       — login password
 *   K6_ROLE           — dashboard role segment (default: ceo)
 *   K6_PRODUCTS_PATH  — default: /api/v1/retail/products
 *   K6_SALES_PATH     — default: /api/v1/pos/checkout
 *   K6_KPIS_PATH      — default: /api/v1/dashboards/ceo/kpis
 *
 * Run: k6 run perf/k6/load-test.js
 */
import http from 'k6/http';
import {check, sleep} from 'k6';
import {Trend} from 'k6/metrics';

const loginDuration = new Trend('login_duration', true);
const productsDuration = new Trend('products_duration', true);
const salesDuration = new Trend('sales_duration', true);
const kpisDuration = new Trend('kpis_duration', true);

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
const USERNAME = __ENV.K6_USERNAME || 'ceo@demo.local';
const PASSWORD = __ENV.K6_PASSWORD || 'Demo123!';
const ROLE = (__ENV.K6_ROLE || 'ceo').toLowerCase();

const PATHS = {
  login: '/api/v1/auth/login',
  products: __ENV.K6_PRODUCTS_PATH || '/api/v1/retail/products',
  sales: __ENV.K6_SALES_PATH || '/api/v1/pos/checkout',
  kpis: __ENV.K6_KPIS_PATH || `/api/v1/dashboards/${ROLE}/kpis`,
};

export const options = {
  vus: 10,
  duration: '30s',
  thresholds: {
    http_req_duration: ['p(95)<500'],
    login_duration: ['p(95)<500'],
    products_duration: ['p(95)<500'],
    sales_duration: ['p(95)<500'],
    kpis_duration: ['p(95)<500'],
  },
};

function authHeaders(token) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  };
}

export default function () {
  const loginRes = http.post(
    `${BASE_URL}${PATHS.login}`,
    JSON.stringify({email: USERNAME, password: PASSWORD}),
    {headers: {'Content-Type': 'application/json'}},
  );
  loginDuration.add(loginRes.timings.duration);
  const loginOk = check(loginRes, {
    'login status 200': r => r.status === 200,
    'login has token': r => {
      try {
        return !!r.json('accessToken');
      } catch {
        return false;
      }
    },
  });
  if (!loginOk) {
    sleep(1);
    return;
  }

  const token = loginRes.json('accessToken');
  const hdr = authHeaders(token);

  const productsRes = http.get(`${BASE_URL}${PATHS.products}`, hdr);
  productsDuration.add(productsRes.timings.duration);
  check(productsRes, {'products status 2xx': r => r.status >= 200 && r.status < 300});

  const salesRes = http.post(
    `${BASE_URL}${PATHS.sales}`,
    JSON.stringify({
      lines: [],
      tenderLines: [{tenderType: 'CASH', amount: 0}],
    }),
    hdr,
  );
  salesDuration.add(salesRes.timings.duration);
  check(salesRes, {
    'sales reachable': r => r.status === 200 || r.status === 400 || r.status === 422,
  });

  const kpisRes = http.get(`${BASE_URL}${PATHS.kpis}`, hdr);
  kpisDuration.add(kpisRes.timings.duration);
  check(kpisRes, {'kpis status 200': r => r.status === 200});

  sleep(0.5);
}
