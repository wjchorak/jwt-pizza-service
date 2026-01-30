const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

const dinerUser = {
  name: 'pizza diner',
  email: 'diner@test.com',
  password: 'diner',
};

let dinerToken;
let adminToken;
let adminId;
let franchiseId;
let storeId;

beforeAll(async () => {
  dinerUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const adminUser = await createAdminUser();

  const dinerRes = await request(app).post('/api/auth').send(dinerUser);
  dinerToken = dinerRes.body.token;


  const adminRes = await request(app)
    .put('/api/auth')
    .send({ email: adminUser.email, password: 'toomanysecrets' });

  adminToken = adminRes.body.token;
  adminId = adminRes.body.user.id;
});

test('list franchises (public)', async () => {
  const res = await request(app).get('/api/franchise?page=0&limit=10');

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('franchises');
  expect(res.body).toHaveProperty('more');
  expect(Array.isArray(res.body.franchises)).toBe(true);
});

test('non-admin cannot create franchise', async () => {
  const res = await request(app).post('/api/franchise').set('Authorization', `Bearer ${dinerToken}`).send({ name: 'pizzaPocket' });

  expect(res.status).toBe(403);
  expect(res.body.message).toBe('unable to create a franchise');
});

test('admin can create franchise', async () => {
  const franchiseName = 'pizzaPocket-' + Math.random().toString(36).substring(2, 8);

  const res = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: franchiseName,
      admins: [{ email: 'a@jwt.com' }],
    });

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('id');
  expect(res.body.name).toBe(franchiseName);
  expect(res.body.admins[0].email).toBe('a@jwt.com');

  franchiseId = res.body.id;
});

test('get user franchises (self)', async () => {
  const res = await request(app).get(`/api/franchise/${adminId}`).set('Authorization', `Bearer ${adminToken}`);

  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

test('unauthorized user franchises access returns empty list', async () => {
  const res = await request(app)
    .get(`/api/franchise/${adminId}`)
    .set('Authorization', `Bearer ${dinerToken}`);

  expect(res.status).toBe(200);
  expect(res.body).toEqual([]);
});

test('admin can create store', async () => {
  const res = await request(app)
    .post(`/api/franchise/${franchiseId}/store`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'SLC' });

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('id');
  expect(res.body.name).toBe('SLC');
  expect(res.body.totalRevenue).toBeUndefined();

  storeId = res.body.id;
});

test('non-admin cannot create store', async () => {
  const res = await request(app)
    .post(`/api/franchise/${franchiseId}/store`)
    .set('Authorization', `Bearer ${dinerToken}`)
    .send({ name: 'FAIL' });

  expect(res.status).toBe(403);
  expect(res.body.message).toBe('unable to create a store');
});

test('admin can delete store', async () => {
  const res = await request(app)
    .delete(`/api/franchise/${franchiseId}/store/${storeId}`)
    .set('Authorization', `Bearer ${adminToken}`);

  expect(res.status).toBe(200);
  expect(res.body.message).toBe('store deleted');
});


test('delete franchise', async () => {
  const res = await request(app)
    .delete(`/api/franchise/${franchiseId}`);

  expect(res.status).toBe(200);
  expect(res.body.message).toBe('franchise deleted');
});

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = 'admin-' + Math.random().toString(36).substring(2, 8);
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}