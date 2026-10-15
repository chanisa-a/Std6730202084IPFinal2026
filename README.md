# HR Manager & Salary Analytics

ระบบจัดการพนักงานและวิเคราะห์เงินเดือนด้วย React Native (Expo) และ Express.js ข้อมูลพนักงานเก็บในหน่วยความจำของ backend และจะเริ่มจากข้อมูลตัวอย่าง 5 คนทุกครั้งที่เริ่ม server ใหม่

## โครงสร้างโปรเจกต์

```text
Std6xxxxxxIPFinal2026/
├── backend/        # Express API และข้อมูลพนักงาน in-memory
└── frontend/       # Expo / React Native application
```

หากนำไปส่ง ให้ใช้ชื่อโฟลเดอร์/Repository `Std6xxxxxxIPFinal2026` โดยแทน `6xxxxxx` ด้วยเลขประจำตัวนักศึกษา 7 หลัก

## ติดตั้งและเริ่ม backend

```powershell
cd backend
npm install
npm start
```

API ทำงานที่ `http://localhost:3011` และตรวจสุขภาพได้ที่ `http://localhost:3011/health` (สำหรับมือถือหรืออุปกรณ์อื่น ให้กำหนด `PORT` หรือใช้ IP ของเครื่องที่รัน backend)

## ติดตั้งและเริ่ม frontend

เปิด Terminal อีกหน้าต่าง:

```powershell
cd frontend
npm install
npx expo start
```

Expo Web ใช้ API ที่ `http://localhost:3011` โดยอัตโนมัติ หากทดสอบบนโทรศัพท์ ให้สร้าง `frontend/.env.local` แล้วกำหนด URL ที่อุปกรณ์เข้าถึงได้:

```env
EXPO_PUBLIC_API_URL=http://<IP-ของเครื่องที่รัน-backend>:3011
```

บัญชีทดสอบ: username `admin`, password `password123`.

## API

ทุก endpoint นอกจาก `POST /api/login` ต้องมี header `Authorization: Bearer mock-jwt-token`.

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| `POST` | `/api/login` | เข้าสู่ระบบ |
| `GET` | `/api/employees` | อ่านรายชื่อพนักงาน |
| `POST` | `/api/employees` | เพิ่มพนักงานด้วย `name`, `position`, `salary` |
| `PUT` | `/api/employees/:id/status` | สลับสถานะ Active / On Leave |
| `DELETE` | `/api/employees/:id` | ลบพนักงาน |
| `GET` | `/api/employees/salary-clusters` | จัดกลุ่มเงินเดือนเป็น 3 ระดับด้วย 1D K-Means |

รันการทดสอบ API ด้วย `cd backend; npm test`.
