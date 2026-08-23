import { app } from '../src/server/app.js';
import { seedDatabase } from '../src/server/db/seed.js';
import http from 'http';

interface TestResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
  json?: any;
}

function request(
  server: http.Server,
  path: string,
  method: string = 'GET',
  body?: any,
  headers: Record<string, string> = {}
): Promise<TestResponse> {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    if (!addr || typeof addr === 'string') {
      return reject(new Error('Server address not available'));
    }
    const port = addr.port;

    const payload = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined;
    const reqHeaders: Record<string, string> = { ...headers };
    if (payload && !reqHeaders['Content-Type']) {
      reqHeaders['Content-Type'] = 'application/json';
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: reqHeaders,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let json: any = undefined;
          try {
            json = JSON.parse(data);
          } catch {
            // non-json
          }
          const respHeaders: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            if (typeof v === 'string') respHeaders[k] = v;
          }
          resolve({
            status: res.statusCode || 0,
            headers: respHeaders,
            body: data,
            json,
          });
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Memulai Automated Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, title: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${title} - ${detail || ''}`);
      failed++;
    }
  }

  // 1. Seed database
  await seedDatabase();

  // 2. Start temporary testing server on dynamic port
  const server = http.createServer(app);
  await new Promise<void>((res) => server.listen(0, '127.0.0.1', res));

  try {
    // TEST 1: Health Check Endpoint
    const resHealth = await request(server, '/api/health');
    assert(resHealth.status === 200, 'GET /api/health mengembalikan HTTP 200');
    assert(resHealth.json?.status === 'ok', 'GET /api/health mengembalikan JSON status: ok');

    // TEST 2: Health Ready Endpoint
    const resReady = await request(server, '/api/health/ready');
    assert(resReady.status === 200, 'GET /api/health/ready mengembalikan HTTP 200');
    assert(resReady.json?.status === 'ready', 'GET /api/health/ready status: ready');

    // TEST 3: Unmatched API route returns JSON, NOT HTML
    const resNotFound = await request(server, '/api/unknown-route-test');
    assert(resNotFound.status === 404, 'Endpoint tidak dikenal mengembalikan HTTP 404');
    assert(
      resNotFound.json?.error?.code === 'ROUTE_NOT_FOUND',
      'Endpoint tidak dikenal mengembalikan JSON code ROUTE_NOT_FOUND'
    );
    assert(
      !resNotFound.body.includes('<!DOCTYPE') && !resNotFound.body.includes('<html'),
      'Endpoint /api/* tidak pernah mengembalikan HTML'
    );

    // TEST 4: Login with non-existent email -> 401 INVALID_CREDENTIALS (No Auto-Create)
    const resNonExistent = await request(server, '/api/auth/login', 'POST', {
      email: 'nonexistent_user_random_98234@banksoal.sch.id',
      password: 'SomePassword123!',
    });
    assert(
      resNonExistent.status === 401,
      'Login email tidak terdaftar mengembalikan HTTP 401 (Auto-Create dinonaktifkan)'
    );
    assert(
      resNonExistent.json?.error?.code === 'INVALID_CREDENTIALS',
      'Login email tidak terdaftar menghasilkan JSON error code INVALID_CREDENTIALS'
    );

    // TEST 5: Login with wrong password -> 401 INVALID_CREDENTIALS (No Password Bypass)
    const resWrongPass = await request(server, '/api/auth/login', 'POST', {
      email: 'admin@banksoal.sch.id',
      password: 'completelyWrongPassword!',
    });
    assert(
      resWrongPass.status === 401,
      'Login password salah mengembalikan HTTP 401 (Password Bypass dinonaktifkan)'
    );
    assert(
      resWrongPass.json?.error?.code === 'INVALID_CREDENTIALS',
      'Login password salah menghasilkan JSON error code INVALID_CREDENTIALS'
    );

    // TEST 6: Login with Valid Admin Credentials
    const resLoginAdmin = await request(server, '/api/auth/login', 'POST', {
      email: 'admin@banksoal.sch.id',
      password: 'Admin#2026!',
    });
    assert(resLoginAdmin.status === 200, 'Login admin sah mengembalikan HTTP 200');
    assert(resLoginAdmin.json?.success === true, 'Login response success: true');
    assert(Boolean(resLoginAdmin.json?.data?.accessToken), 'Login response menghasilkan JWT accessToken');
    assert(resLoginAdmin.json?.data?.user?.role === 'ADMIN', 'Login response mengembalikan user role ADMIN');

    const adminToken = resLoginAdmin.json?.data?.accessToken;

    // TEST 7: Authenticated GET /api/auth/me with Bearer Token
    const resMe = await request(server, '/api/auth/me', 'GET', undefined, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert(resMe.status === 200, 'GET /api/auth/me dengan Bearer token mengembalikan HTTP 200');
    assert(resMe.json?.data?.user?.email === 'admin@banksoal.sch.id', 'GET /api/auth/me mengembalikan user admin');

    // TEST 8: Unauthenticated GET /api/auth/me -> 401
    const resMeUnauth = await request(server, '/api/auth/me', 'GET');
    assert(resMeUnauth.status === 401, 'GET /api/auth/me tanpa token mengembalikan HTTP 401');

    // TEST 9: Authenticated Master Data list
    const resMaster = await request(server, '/api/master/all', 'GET', undefined, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert(resMaster.status === 200, 'GET /api/master/all mengembalikan HTTP 200');
    assert(Array.isArray(resMaster.json?.data?.categories), 'Master data categories berupa array');

    // TEST 10: Authenticated Documents list
    const resDocs = await request(server, '/api/documents', 'GET', undefined, {
      Authorization: `Bearer ${adminToken}`,
    });
    assert(resDocs.status === 200, 'GET /api/documents mengembalikan HTTP 200');
    assert(Array.isArray(resDocs.json?.data?.items), 'Documents items berupa array');

    console.log(`\n📊 Ringkasan Test: ${passed} Passed, ${failed} Failed`);
    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
