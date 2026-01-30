const request = require('supertest');
const app = require('../service');

const dinerUser = {
  name: 'pizza diner',
  email: 'diner@test.com',
  password: 'diner',
};

let dinerToken;
let dinerId;

beforeAll(async () => {
  dinerUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  
  const dinerRes = await request(app).post('/api/auth').send(dinerUser);
  dinerToken = dinerRes.body.token;
  dinerId = dinerRes.body.user.id;
});

test('get authenticated user', async () => {
  const res = await request(app)
    .get('/api/user/me')
    .set('Authorization', `Bearer ${dinerToken}`);

  expect(res.status).toBe(200);
  expect(res.body).toHaveProperty('id');
  expect(res.body.id).toBe(dinerId);
  expect(res.body).toHaveProperty('name');
  expect(res.body).toHaveProperty('email');
  expect(res.body).toHaveProperty('roles');
});

test('update user', async () => {
  const updatedUserData = { name: 'Updated Name', email: 'updated@test.com', password: 'newpassword' };

  const res = await request(app)
    .put(`/api/user/${dinerId}`)
    .set('Authorization', `Bearer ${dinerToken}`)
    .send(updatedUserData);

  expect(res.status).toBe(200);
  expect(res.body.user).toHaveProperty('id');
  expect(res.body.user.name).toBe(updatedUserData.name);
  expect(res.body.user.email).toBe(updatedUserData.email);
  expect(res.body.token).toBeDefined();
});