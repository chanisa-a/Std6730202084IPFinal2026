import AsyncStorage from '@react-native-async-storage/async-storage';

const apiUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3011').replace(/\/$/, '');
const tokenKey = 'hr_manager_api_token';
const userKey = 'hr_manager_api_user';

export const apiConfigured = Boolean(apiUrl);

export type ApiUser = {
  id: string;
  username: string;
  email: string;
  role: 'admin';
};

export type Employee = {
  id: string;
  name: string;
  position: string;
  status: 'Active' | 'On Leave';
  salary: number;
};

export type EmployeeInput = Pick<Employee, 'name' | 'position' | 'salary' | 'status'>;

export type SalaryCluster = {
  group: string;
  centroid: number | null;
  count: number;
};

type ApiPayload<T> = {
  success?: boolean;
  error?: string;
} & T;

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiPayload<T>> {
  const token = await AsyncStorage.getItem(tokenKey);
  let response: Response;
  try {
    response = await fetch(`${apiUrl}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error(`เชื่อมต่อ API ไม่ได้ ตรวจสอบว่าเซิร์ฟเวอร์ทำงานที่ ${apiUrl}`);
  }

  let payload: ApiPayload<T>;
  try {
    payload = (await response.json()) as ApiPayload<T>;
  } catch {
    throw new Error('เซิร์ฟเวอร์ส่งข้อมูลกลับมาไม่ถูกต้อง');
  }
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error ?? 'คำขอไม่สำเร็จ');
  }
  return payload;
}

export async function signIn(username: string, password: string): Promise<ApiUser> {
  const payload = await request<{ token?: string }>('/api/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (!payload.token) throw new Error('เซิร์ฟเวอร์ไม่ส่ง token สำหรับเข้าสู่ระบบ');
  const user: ApiUser = { id: username, username, email: username, role: 'admin' };
  await AsyncStorage.multiSet([[tokenKey, payload.token], [userKey, JSON.stringify(user)]]);
  return user;
}

export async function restoreUser(): Promise<ApiUser | null> {
  const [storedUser, storedToken] = await AsyncStorage.multiGet([userKey, tokenKey]);
  if (!storedUser[1] || !storedToken[1]) return null;
  try {
    return JSON.parse(storedUser[1]) as ApiUser;
  } catch {
    await clearSession();
    return null;
  }
}

export async function clearSession() {
  await AsyncStorage.multiRemove([tokenKey, userKey]);
}

export async function getEmployees(): Promise<Employee[]> {
  const payload = await request<{ employees: Employee[] }>('/api/employees');
  if (!Array.isArray(payload.employees)) throw new Error('รูปแบบข้อมูลพนักงานจากเซิร์ฟเวอร์ไม่ถูกต้อง');
  return payload.employees;
}

export async function createEmployee(input: Pick<Employee, 'name' | 'position' | 'salary'>): Promise<Employee> {
  const payload = await request<{ employee: Employee }>('/api/employees', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (!payload.employee) throw new Error('เซิร์ฟเวอร์ไม่ได้ส่งข้อมูลพนักงานกลับมา');
  return payload.employee;
}

export async function updateEmployee(id: string, input: EmployeeInput): Promise<Employee> {
  const payload = await request<{ employee: Employee }>(`/api/employees/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
  if (!payload.employee) throw new Error('เซิร์ฟเวอร์ไม่ได้ส่งข้อมูลพนักงานกลับมา');
  return payload.employee;
}

export async function toggleEmployeeStatus(id: string): Promise<Employee> {
  const payload = await request<{ employee: Employee }>(`/api/employees/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
  });
  if (!payload.employee) throw new Error('เซิร์ฟเวอร์ไม่ได้ส่งข้อมูลพนักงานกลับมา');
  return payload.employee;
}

export async function deleteEmployee(id: string): Promise<void> {
  await request<{ id: string }>(`/api/employees/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function getSalaryClusters(): Promise<SalaryCluster[]> {
  const payload = await request<{ clusters: SalaryCluster[] }>('/api/employees/salary-clusters');
  if (!Array.isArray(payload.clusters)) throw new Error('รูปแบบผลวิเคราะห์จากเซิร์ฟเวอร์ไม่ถูกต้อง');
  return payload.clusters;
}
