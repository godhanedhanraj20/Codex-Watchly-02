const request = require('supertest');

describe('auth routes', () => {
  let app;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    process.env.SESSION_SECRET = 'test-secret';
    process.env.BASE_URL = 'http://localhost:3000';
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.OAUTH_CALLBACK_URL = 'http://localhost:3000/auth/google/callback';

    app = require('../../server');
  });

  test('GET /auth/google responds with redirect', async () => {
    const res = await request(app).get('/auth/google');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('accounts.google.com');
  });

  test('mock callback in test mode creates session and /me returns user', async () => {
    const agent = request.agent(app);

    const callbackRes = await agent.get('/auth/google/callback?mock=1');
    expect(callbackRes.status).toBe(302);
    expect(callbackRes.headers.location).toBe('/public/host.html');

    const meRes = await agent.get('/me');
    expect(meRes.status).toBe(200);
    expect(meRes.body.id).toBe('test-host-id');
    expect(meRes.body.email).toBe('mock@example.com');
  });
});
