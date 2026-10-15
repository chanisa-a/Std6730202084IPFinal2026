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

function createFakePool(initialRows = []) {
  const rows = initialRows.map((employee) => ({ ...employee }));
  let nextId = rows.reduce((next, employee) => Math.max(next, Number(employee.id) + 1), 1);

  return {
    rows,
    async query(sql, parameters = []) {
      if (sql.includes('WHERE name LIKE')) {
        const search = parameters[0].slice(1, -1).toLowerCase();
        return [rows.filter((employee) => (
          employee.name.toLowerCase().includes(search)
          || employee.position.toLowerCase().includes(search)
          || employee.status.toLowerCase().includes(search)
        ))];
      }
      if (sql.includes('SELECT id, name, position, status, salary FROM employees ORDER BY id')) return [[...rows]];
      if (sql.includes('SELECT id FROM employees LIMIT 1')) return [rows.slice(0, 1)];
      if (sql.includes('SELECT salary FROM employees')) return [rows.map(({ salary }) => ({ salary }))];
      throw new Error(`Unexpected query: ${sql}`);
    },
    async execute(sql, parameters = []) {
      if (sql.includes('WHERE name LIKE')) {
        const search = parameters[0].slice(1, -1).toLowerCase();
        return [rows.filter((employee) => (
          employee.name.toLowerCase().includes(search)
          || employee.position.toLowerCase().includes(search)
          || employee.status.toLowerCase().includes(search)
        ))];
      }
      if (sql.includes('INSERT INTO employees')) {
        const [name, position, status, salary] = parameters;
        const employee = { id: nextId++, name, position, status, salary };
        rows.push(employee);
        return [{ insertId: employee.id, affectedRows: 1 }];
      }
      if (sql.includes('SELECT id, name, position, status, salary FROM employees WHERE id =')) {
        return [rows.filter((employee) => employee.id === Number(parameters[0]))];
      }
      if (sql.includes('SELECT id FROM employees WHERE id =')) {
        return [rows.filter((employee) => employee.id === Number(parameters[0])).map(({ id }) => ({ id }))];
      }
      if (sql.includes('UPDATE employees SET name')) {
        const [name, position, status, salary, id] = parameters;
        const employee = rows.find((item) => item.id === Number(id));
        if (!employee) return [{ affectedRows: 0 }];
        Object.assign(employee, { name, position, status, salary });
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('UPDATE employees SET status = IF')) {
        const employee = rows.find((item) => item.id === Number(parameters[0]));
        if (!employee) return [{ affectedRows: 0 }];
        employee.status = employee.status === 'Active' ? 'On Leave' : 'Active';
        return [{ affectedRows: 1 }];
      }
      if (sql.includes('DELETE FROM employees')) {
        const index = rows.findIndex((item) => item.id === Number(parameters[0]));
        if (index === -1) return [{ affectedRows: 0 }];
        rows.splice(index, 1);
        return [{ affectedRows: 1 }];
      }
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
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

test('MySQL storage persists create, edit, status, search, delete, and salary analytics operations', async () => {
  const pool = createFakePool();
  const databaseServer = createApp({ pool }).listen(0, '127.0.0.1');
  await new Promise((resolve) => databaseServer.once('listening', resolve));
  const databaseUrl = `http://127.0.0.1:${databaseServer.address().port}`;
  const databaseApi = (path, options = {}) => fetch(`${databaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: 'Bearer mock-jwt-token',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  try {
    const createdResponse = await databaseApi('/api/employees', {
      method: 'POST',
      body: JSON.stringify({ name: 'Nisa Example', position: 'Developer', salary: 50000 }),
    });
    assert.equal(createdResponse.status, 201);
    const created = (await createdResponse.json()).employee;
    assert.equal(created.id, '1');
    assert.equal(pool.rows.length, 1);

    const updatedResponse = await databaseApi(`/api/employees/${created.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: 'Nisa Updated', position: 'Senior Developer', status: 'On Leave', salary: 60000 }),
    });
    assert.deepEqual((await updatedResponse.json()).employee, {
      id: '1',
      name: 'Nisa Updated',
      position: 'Senior Developer',
      status: 'On Leave',
      salary: 60000,
    });

    const search = await databaseApi('/api/employees?search=Senior');
    assert.equal((await search.json()).employees.length, 1);
    const clusters = await databaseApi('/api/employees/salary-clusters');
    assert.equal((await clusters.json()).clusters.reduce((total, item) => total + item.count, 0), 1);

    assert.equal((await databaseApi(`/api/employees/${created.id}/status`, { method: 'PUT' })).status, 200);
    assert.equal((await databaseApi(`/api/employees/${created.id}`, { method: 'DELETE' })).status, 200);
    assert.equal(pool.rows.length, 0);
  } finally {
    await new Promise((resolve, reject) => databaseServer.close((error) => error ? reject(error) : resolve()));
  }
});
