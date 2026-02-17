const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

const dinerUser = {
  name: 'pizza diner',
  email: 'diner@test.com',
  password: 'diner',
};

let dinerToken;
let dinerId;
let adminToken;

beforeAll(async () => {
  dinerUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';

  const dinerRes = await request(app)
    .post('/api/auth')
    .send(dinerUser);

  dinerToken = dinerRes.body.token;
  dinerId = dinerRes.body.user.id;

  const adminUser = await createAdminUser();

  const adminRes = await request(app)
    .put('/api/auth')
    .send({ email: adminUser.email, password: 'toomanysecrets' });

  adminToken = adminRes.body.token;
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
  const updatedUserData = { 
    name: 'Updated Name', 
    email: 'updated@test.com', 
    password: 'newpassword' 
  };

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

test('list users unauthorized', async () => {
  const listUsersRes = await request(app).get('/api/user');
  expect(listUsersRes.status).toBe(401);
});

test('list users forbidden for non-admin', async () => {
  const res = await request(app)
    .get('/api/user')
    .set('Authorization', `Bearer ${dinerToken}`);

  expect(res.status).toBe(403);
});

test('list users as admin', async () => {
  const listUsersRes = await request(app)
    .get('/api/user')
    .set('Authorization', `Bearer ${adminToken}`);

  expect(listUsersRes.status).toBe(200);
  expect(listUsersRes.body).toHaveProperty('users');
  expect(Array.isArray(listUsersRes.body.users)).toBe(true);
  expect(listUsersRes.body.users.length).toBeGreaterThan(0);

  const firstUser = listUsersRes.body.users[0];
  expect(firstUser).toHaveProperty('id');
  expect(firstUser).toHaveProperty('name');
  expect(firstUser).toHaveProperty('email');
  expect(firstUser).toHaveProperty('roles');
});

describe('delete user endpoint', () => {
  let userIdToDelete;

  beforeAll(async () => {
    const userToDelete = {
      name: 'delete-me',
      email: Math.random().toString(36).substring(2, 12) + '@delete.com',
      password: 'deletepassword',
    };

    const createRes = await request(app)
      .post('/api/auth')
      .send(userToDelete);

    expect(createRes.status).toBe(200);
    userIdToDelete = createRes.body.user.id;
  });

  test('delete user unauthorized (no token)', async () => {
    const res = await request(app)
      .delete(`/api/user/${userIdToDelete}`);

    expect(res.status).toBe(401);
  });

  test('delete user non-admin', async () => {
    const res = await request(app)
      .delete(`/api/user/${userIdToDelete}`)
      .set('Authorization', `Bearer ${dinerToken}`);

    expect(res.status).toBe(403);
  });
});

async function createAdminUser() {
  let user = {
    password: 'toomanysecrets',
    roles: [{ role: Role.Admin }],
  };

  user.name = 'admin-' + Math.random().toString(36).substring(2, 8);
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);

  return { ...user, password: 'toomanysecrets' };
}
