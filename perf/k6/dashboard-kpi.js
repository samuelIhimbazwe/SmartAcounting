import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const USERNAME = __ENV.SC_USERNAME || 'cfo';
const PASSWORD = __ENV.SC_PASSWORD || 'password';
const TENANT_ID = __ENV.SC_TENANT_ID || '11111111-1111-1111-1111-111111111111';
const USER_ID = __ENV.SC_USER_ID || '22222222-2222-2222-2222-222222222222';

export const options = {
  scenarios: {
    kpi_load: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '20s', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

function login() {
  const payload = JSON.stringify({
    username: USERNAME,
    password: PASSWORD,
    tenantId: TENANT_ID,
    userId: USER_ID,
  });

  const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, { 'login status is 200': (r) => r.status === 200 });
  return res.json('token');
}

const token = login();

export default function () {
  const res = http.get(`${BASE_URL}/api/v1/dashboards/cfo/kpis`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(res, {
    'kpi status is 200': (r) => r.status === 200,
    'kpi payload is array': (r) => Array.isArray(r.json()),
  });

  sleep(1);
}
