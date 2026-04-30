import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const USERNAME = __ENV.SC_USERNAME || 'cfo';
const PASSWORD = __ENV.SC_PASSWORD || 'password';
const TENANT_ID = __ENV.SC_TENANT_ID || '11111111-1111-1111-1111-111111111111';
const USER_ID = __ENV.SC_USER_ID || '22222222-2222-2222-2222-222222222222';

export const options = {
  scenarios: {
    copilot_load: {
      executor: 'ramping-vus',
      startVUs: 2,
      stages: [
        { duration: '20s', target: 20 },
        { duration: '30s', target: 40 },
        { duration: '10s', target: 0 },
      ],
      gracefulRampDown: '5s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
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
  const payload = JSON.stringify({
    role: 'cfo',
    question: 'Why is DSO up?',
  });

  const res = http.post(`${BASE_URL}/api/v1/ai/copilot/query`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  check(res, {
    'copilot status is 200': (r) => r.status === 200,
    'copilot has answer field': (r) => !!r.json('answer'),
  });

  sleep(1);
}
