const express = require('express');

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

function createApp(initialEmployees = seedEmployees) {
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

  app.get('/api/employees', (request, response) => {
    response.json({ success: true, employees });
  });

  app.post('/api/employees', (request, response) => {
    const { name, position, salary } = request.body ?? {};
    if (
      typeof name !== 'string' || !name.trim()
      || typeof position !== 'string' || !position.trim()
      || salary === undefined || salary === null || (typeof salary === 'string' && !salary.trim())
      || typeof salary === 'boolean'
    ) {
      return response.status(400).json({ success: false, error: 'Name, position, and salary are required.' });
    }

    const parsedSalary = Number(salary);
    if (!Number.isFinite(parsedSalary) || parsedSalary < 0) {
      return response.status(400).json({ success: false, error: 'Salary must be a non-negative number.' });
    }

    const employee = {
      id: String(nextEmployeeId++),
      name: name.trim(),
      position: position.trim(),
      status: 'Active',
      salary: parsedSalary,
    };
    employees.push(employee);
    return response.status(201).json({ success: true, employee });
  });

  app.put('/api/employees/:id/status', (request, response) => {
    const employee = employees.find((item) => item.id === request.params.id);
    if (!employee) return response.status(404).json({ success: false, error: 'Employee not found.' });
    employee.status = employee.status === 'Active' ? 'On Leave' : 'Active';
    return response.json({ success: true, employee });
  });

  app.delete('/api/employees/:id', (request, response) => {
    const employeeIndex = employees.findIndex((item) => item.id === request.params.id);
    if (employeeIndex === -1) return response.status(404).json({ success: false, error: 'Employee not found.' });
    employees.splice(employeeIndex, 1);
    return response.json({ success: true, id: request.params.id });
  });

  app.get('/api/employees/salary-clusters', (request, response) => {
    const clusters = clusterSalaries(employees.map((employee) => employee.salary));
    return response.json({ success: true, clusters });
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
  const port = Number(process.env.PORT || 3011);
  createApp().listen(port, '0.0.0.0', () => {
    console.log(`HR Manager API listening on port ${port}`);
  });
}

module.exports = { clusterSalaries, createApp, seedEmployees };
