# HR Manager & Salary Analytics

ระบบจัดการพนักงานและวิเคราะห์เงินเดือนด้วย React Native (Expo), Express.js และ MySQL ข้อมูลเพิ่ม/แก้ไข/ลบพนักงานจะบันทึกในตาราง `employees`

## โครงสร้างโปรเจกต์

```text
Std6xxxxxxIPFinal2026/
├── backend/        # Express API และการเชื่อมต่อ MySQL
└── frontend/       # Expo / React Native application
```

หากนำไปส่ง ให้ใช้ชื่อโฟลเดอร์/Repository `Std6xxxxxxIPFinal2026` โดยแทน `6xxxxxx` ด้วยเลขประจำตัวนักศึกษา 7 หลัก

## ตั้งค่า MySQL และเริ่ม backend

```powershell
cd backend
npm install
Copy-Item .env.example .env
notepad .env
npm start
```

กรอกค่าการเชื่อมต่อ MySQL ใน `backend/.env` โดยขอ **MySQL Host, Port, Database name, Username และ Password** จากผู้ดูแล hosting/phpMyAdmin:

```env
PORT=3011
DB_HOST=ค่าจากผู้ให้บริการ
DB_PORT=3306
DB_NAME=ip_std6730202084
DB_USER=ชื่อผู้ใช้ฐานข้อมูล
DB_PASSWORD=รหัสผ่านฐานข้อมูล
```

ห้ามใช้ URL ของ phpMyAdmin เป็น `DB_HOST` และห้ามนำรหัสผ่านฐานข้อมูลใส่ในแอป Expo หรือ push ขึ้น GitHub หากรัน backend บน hosting เครื่องเดียวกับ MySQL โดยมาก host จะเป็น `localhost`/`127.0.0.1`; หากรัน backend บนคอมพิวเตอร์ตัวเอง ผู้ให้บริการ hosting ต้องเปิด remote MySQL และอนุญาต IP ของคอมพิวเตอร์ก่อน ค่า `DB_HOST` ต้องเป็น MySQL host ที่ผู้ให้บริการแจ้ง ไม่ใช่เดาเอาจากหน้าเว็บ phpMyAdmin

ใน phpMyAdmin เลือกฐานข้อมูล `ip_std6730202084` แล้วเปิดแท็บ **SQL** และรันคำสั่งใน [backend/schema.sql](./backend/schema.sql) เพื่อสร้างตาราง `employees` หากยังไม่มี ตารางต้องมี `id`, `name`, `position`, `status`, `salary` ตาม schema นี้ หากตารางว่าง backend จะใส่ข้อมูลตัวอย่าง 5 คนให้อัตโนมัติตอนเริ่มครั้งแรก และจะไม่ลบหรือเติมข้อมูลซ้ำเมื่อมีพนักงานแล้ว

API ทำงานที่ `http://localhost:3011` และตรวจสุขภาพได้ที่ `http://localhost:3011/health`

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
| `GET` | `/api/employees` | อ่านรายชื่อพนักงาน (ค้นหาได้ด้วย `?search=คำค้น`) |
| `POST` | `/api/employees` | เพิ่มพนักงานด้วย `name`, `position`, `salary` |
| `PUT` | `/api/employees/:id` | แก้ไขชื่อ ตำแหน่ง สถานะ และเงินเดือน |
| `PUT` | `/api/employees/:id/status` | สลับสถานะ Active / On Leave |
| `DELETE` | `/api/employees/:id` | ลบพนักงาน |
| `GET` | `/api/employees/salary-clusters` | จัดกลุ่มเงินเดือนเป็น 3 ระดับด้วย 1D K-Means |

คอลัมน์ที่แอปใช้คือ `id`, `name`, `position`, `status`, `salary` ไม่ต้องเพิ่ม `ChaPhan_6730202084` เว้นแต่อาจารย์กำหนดเพิ่มเติมเป็นพิเศษ เพราะแอปไม่ได้อ่านหรือเขียนคอลัมน์นั้น

รันการทดสอบ API ด้วย `cd backend; npm test`. โปรเจกต์รุ่นนี้เปลี่ยนจากเงื่อนไข in-memory ใน PDF มาใช้ MySQL ตามที่ขอ หากผู้สอนตรวจเงื่อนไขเดิม ต้องยืนยันก่อนว่ายอมรับการเปลี่ยนแปลงนี้
