const express = require('express');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

const seedEmployees = [
  { id: '1', name: 'John Doe', position: 'Software Engineer', status: 'Active', salary: 45000 },
  { id: '2', name: 'Jane Smith', position: 'Product Manager', status: 'Active', salary: 65000 },
  { id: '3', name: 'Michael Johnson', position: 'UX Designer', status: 'On Leave', salary: 52000 },
  { id: '4', name: 'Emily Davis', position: 'Data Analyst', status: 'Active', salary: 38000 },
  { id: '5', name: 'David Wilson', position: 'Engineering Manager', status: 'Active', salary: 85000 },
];

function assignToNearestCluster(value, centroids) {
  let nearestIndex = 0;
  let nearestDistance = Math.abs(value - centroids[0]);
  for (let index = 1; index < centroids.length; index += 1) {
    const distance = Math.abs(value - centroids[index]);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  }
  return nearestIndex;
}

function clusterSalaries(salaries, k = 3) {
  if (salaries.length === 0) {
    return Array.from({ length: k }, (_, index) => ({ group: `Tier ${index + 1}`, centroid: null, count: 0 }));
  }

  const sorted = [...salaries].sort((left, right) => left - right);
  let centroids = Array.from({ length: k }, (_, index) => {
    const quantileIndex = Math.floor(((index + 0.5) * sorted.length) / k);
    return sorted[Math.min(quantileIndex, sorted.length - 1)];
  });
  let groups = Array.from({ length: k }, () => []);

  for (let iteration = 0; iteration < 100; iteration += 1) {
    groups = Array.from({ length: k }, () => []);
    for (const salary of salaries) {
      groups[assignToNearestCluster(salary, centroids)].push(salary);
    }

    const nextCentroids = groups.map((group, index) => (
      group.length ? group.reduce((sum, salary) => sum + salary, 0) / group.length : centroids[index]
    ));
    const converged = nextCentroids.every((centroid, index) => Math.abs(centroid - centroids[index]) < 0.000001);
    centroids = nextCentroids;
    if (converged) break;
  }

  const clusters = groups.map((group) => ({
    centroid: group.length
      ? Number((group.reduce((sum, salary) => sum + salary, 0) / group.length).toFixed(2))
      : null,
    count: group.length,
  }));
  clusters.sort((left, right) => {
    if (left.centroid === null) return right.centroid === null ? 0 : 1;
    if (right.centroid === null) return -1;
    return left.centroid - right.centroid;
  });
  return clusters.map((cluster, index) => ({ group: `Tier ${index + 1}`, ...cluster }));
}

function employeeResponse(row) {
  return {
    id: String(row.id),
    name: String(row.name),
    position: String(row.position),
    status: row.status === 'On Leave' ? 'On Leave' : 'Active',
    salary: Number(row.salary),
  };
}

function validateEmployee(input, requireStatus = false) {
  const { name, position, salary } = input ?? {};
  if (
    typeof name !== 'string' || !name.trim()
    || typeof position !== 'string' || !position.trim()
    || salary === undefined || salary === null || (typeof salary === 'string' && !salary.trim())
    || typeof salary === 'boolean'
  ) {
    return { error: 'Name, position, and salary are required.' };
  }

  const parsedSalary = Number(salary);
  if (!Number.isFinite(parsedSalary) || parsedSalary < 0 || parsedSalary > 99999999.99) {
    return { error: 'Salary must be a number between 0 and 99,999,999.99.' };
  }

  const employee = { name: name.trim(), position: position.trim(), salary: parsedSalary };
  if (requireStatus) {
    if (input.status !== 'Active' && input.status !== 'On Leave') {
      return { error: 'Status must be Active or On Leave.' };
    }
    employee.status = input.status;
  }
  return { employee };
}

function createApp(options = {}) {
  const { initialEmployees = seedEmployees, pool = null } = Array.isArray(options)
    ? { initialEmployees: options }
    : options;
  const employees = initialEmployees.map((employee) => ({ ...employee }));
  let nextEmployeeId = employees.reduce((nextId, employee) => {
    const numericId = Number(employee.id);
    return Number.isInteger(numericId) ? Math.max(nextId, numericId + 1) : nextId;
  }, 1);
  const app = express();

  app.use((request, response, next) => {
    response.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    });
    if (request.method === 'OPTIONS') return response.sendStatus(204);
    next();
  });
  app.use(express.json());

  app.get('/health', (request, response) => {
    response.json({ ok: true });
  });

  app.post('/api/login', (request, response) => {
    const { username, password } = request.body ?? {};
    if (username !== 'admin' || password !== 'password123') {
      return response.status(401).json({ success: false, error: 'Invalid username or password' });
    }
    return response.status(200).json({ success: true, token: 'mock-jwt-token' });
  });

  app.use('/api', (request, response, next) => {
    if (request.get('authorization') !== 'Bearer mock-jwt-token') {
      return response.status(401).json({ success: false, error: 'Unauthorized. Please log in.' });
    }
    next();
  });

  app.get('/api/employees', async (request, response, next) => {
    try {
      const search = typeof request.query.search === 'string' ? request.query.search.trim() : '';
      if (pool) {
        const [rows] = search
          ? await pool.execute(
              'SELECT id, name, position, status, salary FROM employees WHERE name LIKE ? OR position LIKE ? OR status LIKE ? ORDER BY id',
              [`%${search}%`, `%${search}%`, `%${search}%`],
            )
          : await pool.query('SELECT id, name, position, status, salary FROM employees ORDER BY id');
        return response.json({ success: true, employees: rows.map(employeeResponse) });
      }
      const matches = employees.filter((employee) => (
        !search || [employee.name, employee.position, employee.status].some((value) => value.toLowerCase().includes(search.toLowerCase()))
      ));
      return response.json({ success: true, employees: matches });
    } catch (error) {
      return next(error);
    }
  });

  app.post('/api/employees', async (request, response, next) => {
    const validation = validateEmployee(request.body);
    if (validation.error) return response.status(400).json({ success: false, error: validation.error });
    const input = validation.employee;
    try {
      if (pool) {
        const [result] = await pool.execute(
          'INSERT INTO employees (name, position, status, salary) VALUES (?, ?, ?, ?)',
          [input.name, input.position, 'Active', input.salary],
        );
        const [rows] = await pool.execute(
          'SELECT id, name, position, status, salary FROM employees WHERE id = ? LIMIT 1',
          [result.insertId],
        );
        return response.status(201).json({ success: true, employee: employeeResponse(rows[0]) });
      }
      const employee = { id: String(nextEmployeeId++), ...input, status: 'Active' };
      employees.push(employee);
      return response.status(201).json({ success: true, employee });
    } catch (error) {
      return next(error);
    }
  });

  app.put('/api/employees/:id', async (request, response, next) => {
    const validation = validateEmployee(request.body, true);
    if (validation.error) return response.status(400).json({ success: false, error: validation.error });
    const input = validation.employee;
    try {
      if (pool) {
        const [result] = await pool.execute(
          'UPDATE employees SET name = ?, position = ?, status = ?, salary = ? WHERE id = ?',
          [input.name, input.position, input.status, input.salary, request.params.id],
        );
        if (result.affectedRows === 0) {
          const [rows] = await pool.execute('SELECT id FROM employees WHERE id = ? LIMIT 1', [request.params.id]);
          if (rows.length === 0) return response.status(404).json({ success: false, error: 'Employee not found.' });
        }
        const [rows] = await pool.execute(
          'SELECT id, name, position, status, salary FROM employees WHERE id = ? LIMIT 1',
          [request.params.id],
        );
        return response.json({ success: true, employee: employeeResponse(rows[0]) });
      }
      const employee = employees.find((item) => item.id === request.params.id);
      if (!employee) return response.status(404).json({ success: false, error: 'Employee not found.' });
      Object.assign(employee, input);
      return response.json({ success: true, employee });
    } catch (error) {
      return next(error);
    }
  });

  app.put('/api/employees/:id/status', async (request, response, next) => {
    try {
      if (pool) {
        const [result] = await pool.execute(
          "UPDATE employees SET status = IF(status = 'Active', 'On Leave', 'Active') WHERE id = ?",
          [request.params.id],
        );
        if (result.affectedRows === 0) {
          const [rows] = await pool.execute('SELECT id FROM employees WHERE id = ? LIMIT 1', [request.params.id]);
          if (rows.length === 0) return response.status(404).json({ success: false, error: 'Employee not found.' });
        }
        const [rows] = await pool.execute(
          'SELECT id, name, position, status, salary FROM employees WHERE id = ? LIMIT 1',
          [request.params.id],
        );
        return response.json({ success: true, employee: employeeResponse(rows[0]) });
      }
      const employee = employees.find((item) => item.id === request.params.id);
      if (!employee) return response.status(404).json({ success: false, error: 'Employee not found.' });
      employee.status = employee.status === 'Active' ? 'On Leave' : 'Active';
      return response.json({ success: true, employee });
    } catch (error) {
      return next(error);
    }
  });

  app.delete('/api/employees/:id', async (request, response, next) => {
    try {
      if (pool) {
        const [result] = await pool.execute('DELETE FROM employees WHERE id = ?', [request.params.id]);
        if (result.affectedRows === 0) return response.status(404).json({ success: false, error: 'Employee not found.' });
        return response.json({ success: true, id: request.params.id });
      }
      const employeeIndex = employees.findIndex((item) => item.id === request.params.id);
      if (employeeIndex === -1) return response.status(404).json({ success: false, error: 'Employee not found.' });
      employees.splice(employeeIndex, 1);
      return response.json({ success: true, id: request.params.id });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/employees/salary-clusters', async (request, response, next) => {
    try {
      let salaries;
      if (pool) {
        const [rows] = await pool.query('SELECT salary FROM employees');
        salaries = rows.map((row) => Number(row.salary));
      } else {
        salaries = employees.map((employee) => employee.salary);
      }
      const clusters = clusterSalaries(salaries);
      return response.json({ success: true, clusters });
    } catch (error) {
      return next(error);
    }
  });

  app.use((error, request, response, next) => {
    if (error instanceof SyntaxError && 'body' in error) {
      return response.status(400).json({ success: false, error: 'Request body must contain valid JSON.' });
    }
    console.error(error);
    return response.status(500).json({ success: false, error: 'Internal server error.' });
  });

  return app;
}

if (require.main === module) {
  dotenv.config();
  const requiredConfig = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missingConfig = requiredConfig.filter((key) => !process.env[key]);
  if (missingConfig.length > 0) {
    throw new Error(`Missing database configuration: ${missingConfig.join(', ')}. Copy .env.example to .env and fill in the database credentials.`);
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 5,
    charset: 'utf8mb4',
  });
  const port = Number(process.env.PORT || 3011);
  (async () => {
    try {
      await pool.execute('SELECT id, name, position, status, salary FROM employees LIMIT 0');
      const [rows] = await pool.query('SELECT id FROM employees LIMIT 1');
      if (rows.length === 0) {
        for (const employee of seedEmployees) {
          await pool.execute(
            'INSERT INTO employees (name, position, status, salary) VALUES (?, ?, ?, ?)',
            [employee.name, employee.position, employee.status, employee.salary],
          );
        }
        console.log('Inserted 5 starter employees into the empty employees table.');
      }
      createApp({ pool }).listen(port, '0.0.0.0', () => {
        console.log(`HR Manager API listening on port ${port} (MySQL database: ${process.env.DB_NAME})`);
      });
    } catch (error) {
      await pool.end();
      console.error(`Unable to connect to MySQL or find the employees table: ${error.message}`);
      process.exitCode = 1;
    }
  })();
}

module.exports = { clusterSalaries, createApp, seedEmployees };
