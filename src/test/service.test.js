const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expectValidJwt(testUserAuthToken);
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);
});

test('register new user', async () => {
  const registerRes = await request(app).post('/api/auth').send(testUser);

  expect(registerRes.status).toBe(200);
  expectValidJwt(registerRes.body.token);

  const expectedUser = {
    name: testUser.name,
    email: testUser.email,
    roles: [{ role: 'diner' }],
  };

  expect(registerRes.body.user).toMatchObject(expectedUser);
  expect(registerRes.body.user).toHaveProperty('id');

  authToken = registerRes.body.token;
});

test('register error', async () => {
  const badTestUser = { name: 'bad user', password: 'a' };
  const registerRes = await request(app).post('/api/auth').send(badTestUser);

  expect(registerRes.status).toBe(400);
  expect(registerRes.body).toHaveProperty('message', 'name, email, and password are required');
});

test('bad endpoint', async () => {
  const badRes = (await request(app).get('/wrong/api/name'));
  expect(badRes.status).toBe(404);
  
  expect(badRes.body.message).toBe('unknown endpoint');
});

test('about', async () => {
  const aboutRes = await request(app).get('/');

  expect(aboutRes.status).toBe(200);
  expect(aboutRes.body).toHaveProperty('message','welcome to JWT Pizza');
  expect(aboutRes.body).toHaveProperty('version');
});

test('docs', async () => {
  const docRes = await request(app).get('/api/docs');

  expect(docRes.status).toBe(200);

  expect(docRes.body).toHaveProperty('version');
  expect(docRes.body).toHaveProperty('endpoints');
  expect(docRes.body).toHaveProperty('config');
  expect(docRes.body.config).toHaveProperty('factory');
  expect(docRes.body.config).toHaveProperty('db');
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}