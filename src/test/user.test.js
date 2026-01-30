const request = require('supertest');
const app = require('../service');

const dinerUser = {
  name: 'pizza diner',
  email: 'diner@test.com',
  password: 'diner',
};

const adminUser = {
  name: 'pizza admin',
  email: 'admin@test.com',
  password: 'admin',
};

let dinerToken;
let adminToken;
let dinerId;
let adminId;

beforeAll(async () => {
  dinerUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  adminUser.email = 'auth@test.com';

  const dinerRes = await request(app).post('/api/auth').send(dinerUser);
  dinerToken = dinerRes.body.token;
  dinerId = dinerRes.body.user.id;

  const adminRes = await request(app).put('/api/auth').send({ email: 'a@jwt.com', password: 'admin' });
  adminToken = adminRes.body.token;
  adminId = adminRes.body.user.id;
});