const assert = require('node:assert/strict');
const { after, before, test } = require('node:test');

const { createApp } = require('./server');

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

async function api(path, { token = 'mock-jwt-token', ...options } = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
}

test('login accepts only the required credentials and protects employee data', async () => {
  const validLogin = await api('/api/login', {
    token: null,
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'password123' }),
  });
  assert.equal(validLogin.status, 200);
  assert.deepEqual(await validLogin.json(), { success: true, token: 'mock-jwt-token' });

  const invalidLogin = await api('/api/login', {
    token: null,
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'wrong' }),
  });
  assert.equal(invalidLogin.status, 401);
  assert.equal((await api('/api/employees', { token: null })).status, 401);
});

test('employee API validates, creates, toggles, and deletes employee records', async () => {
  const initial = await api('/api/employees');
  assert.equal((await initial.json()).employees.length, 5);

  const invalidInputs = [
    { name: ' ', position: 'Engineer', salary: 50000 },
    { name: 'Alex Lee', position: ' ', salary: 50000 },
    { name: 'Alex Lee', position: 'Engineer', salary: '' },
    { name: 'Alex Lee', position: 'Engineer', salary: 'not-a-number' },
  ];
  for (const input of invalidInputs) {
    const invalidResponse = await api('/api/employees', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    assert.equal(invalidResponse.status, 400);
  }

  const createdResponse = await api('/api/employees', {
    method: 'POST',
    body: JSON.stringify({ name: 'Alex Lee', position: 'QA Engineer', salary: '40000' }),
  });
  assert.equal(createdResponse.status, 201);
  const created = (await createdResponse.json()).employee;
  assert.equal(created.name, 'Alex Lee');
  assert.equal(created.salary, 40000);
  assert.equal(created.status, 'Active');

  const toggledResponse = await api(`/api/employees/${created.id}/status`, { method: 'PUT' });
  assert.equal((await toggledResponse.json()).employee.status, 'On Leave');
  const toggledBackResponse = await api(`/api/employees/${created.id}/status`, { method: 'PUT' });
  assert.equal((await toggledBackResponse.json()).employee.status, 'Active');

  const deleted = await api(`/api/employees/${created.id}`, { method: 'DELETE' });
  assert.equal(deleted.status, 200);
  assert.equal((await api(`/api/employees/${created.id}`, { method: 'DELETE' })).status, 404);
  assert.equal((await api(`/api/employees/${created.id}/status`, { method: 'PUT' })).status, 404);
});

test('salary clustering returns three ascending tiers using current employee salaries', async () => {
  const response = await api('/api/employees/salary-clusters');
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.success, true);
  assert.equal(payload.clusters.length, 3);
  assert.deepEqual(payload.clusters.map((cluster) => cluster.group), ['Tier 1', 'Tier 2', 'Tier 3']);
  assert.equal(payload.clusters.reduce((count, cluster) => count + cluster.count, 0), 5);
  assert.deepEqual(
    payload.clusters.filter((cluster) => cluster.centroid !== null).map((cluster) => cluster.centroid),
    [...payload.clusters.filter((cluster) => cluster.centroid !== null).map((cluster) => cluster.centroid)].sort((a, b) => a - b),
  );
});

test('salary clustering handles an empty employee list without crashing', async () => {
  const emptyServer = createApp([]).listen(0, '127.0.0.1');
  await new Promise((resolve) => emptyServer.once('listening', resolve));
  try {
    const response = await fetch(`http://127.0.0.1:${emptyServer.address().port}/api/employees/salary-clusters`, {
      headers: { Authorization: 'Bearer mock-jwt-token' },
    });
    const payload = await response.json();
    assert.deepEqual(payload.clusters, [
      { group: 'Tier 1', centroid: null, count: 0 },
      { group: 'Tier 2', centroid: null, count: 0 },
      { group: 'Tier 3', centroid: null, count: 0 },
    ]);
  } finally {
    await new Promise((resolve, reject) => emptyServer.close((error) => error ? reject(error) : resolve()));
  }
});
