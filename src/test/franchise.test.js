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
let adminId;
let franchiseId;
let storeId;

beforeAll(async () => {
  dinerUser.email = 'reg@test.com';
  adminUser.email = 'auth@test.com';

  const dinerRes = await request(app).post('/api/auth').send(dinerUser);
  dinerToken = dinerRes.body.token;


  const adminRes = await request(app).post('/api/auth').send(adminUser);
  adminToken = adminRes.body.token;
  adminId = adminRes.body.user.id;
});