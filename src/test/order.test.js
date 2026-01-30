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

test('add menu item as non-admin', async () => {
  const newMenuItem = {
    title: 'Student',
    description: 'No topping, no sauce, just carbs',
    image: 'pizza9.png',
    price: 0.0001
  };

  const addMenuItemRes = await request(app)
    .put('/api/order/menu')
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(newMenuItem);

  expect(addMenuItemRes.status).toBe(403);
  expect(addMenuItemRes.body.message).toBe('unable to add menu item');
});

test('create order for authenticated user', async () => {
  const orderRequest = {
    franchiseId: 1,
    storeId: 1,
    items: [{ menuId: 1, description: 'Veggie', price: 0.05 }]
  };

  const createOrderRes = await request(app)
    .post('/api/order')
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(orderRequest);

  expect(createOrderRes.status).toBe(200);
  expect(createOrderRes.body).toHaveProperty('order');
  expect(createOrderRes.body.order).toHaveProperty('id');
  expect(createOrderRes.body).toHaveProperty('jwt');
});

test('get orders for authenticated user', async () => {
  const ordersRes = await request(app)
    .get('/api/order')
    .set('Authorization', `Bearer ${testUserAuthToken}`);

  expect(ordersRes.status).toBe(200);
  expect(ordersRes.body).toHaveProperty('orders');
  expect(ordersRes.body.orders).toBeInstanceOf(Array);
  expect(ordersRes.body.orders[0]).toHaveProperty('id');
  expect(ordersRes.body.orders[0]).toHaveProperty('items');
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}