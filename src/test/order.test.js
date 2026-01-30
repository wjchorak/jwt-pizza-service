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

test('get pizza menu', async () => {
  const menuRes = await request(app)
    .get('/api/order/menu');

  expect(menuRes.status).toBe(200);
  expect(menuRes.body).toBeInstanceOf(Array);
  expect(menuRes.body.length).toBeGreaterThan(0);
  expect(menuRes.body[0]).toHaveProperty('id');
  expect(menuRes.body[0]).toHaveProperty('title');
  expect(menuRes.body[0]).toHaveProperty('image');
  expect(menuRes.body[0]).toHaveProperty('price');
  expect(menuRes.body[0]).toHaveProperty('description');
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}