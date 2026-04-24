# 🎓 จับคู่ย้ายครู (Teacher Swap Match)

ระบบจับคู่สลับตำแหน่งข้าราชการครูไทย — ช่วยครูที่ต้องการย้ายในทิศทางตรงข้ามกันเจอกันได้ง่าย ไม่ต้องไปโพสต์ถามในเฟซบุ๊ก

## ✨ ฟีเจอร์

- ลงประกาศขอย้าย/สลับตำแหน่ง พร้อมข้อมูลครบถ้วน
- **ระบบจับคู่อัตโนมัติ (A↔B)** — จับคู่เมื่อจังหวัดสลับกัน + วิชาเอก + ระดับชั้นตรงกัน
- **🔒 ระบบยินยอมแลกเบอร์ (Privacy Protection)** — เบอร์โทรถูกซ่อนเป็น `08X-XXX-XXXX` จนกว่าทั้งสองฝ่ายจะยินยอมแลก
- ค้นหา/กรองตามจังหวัด อำเภอ วิชาเอก ระดับชั้น
- แจ้งเตือนเมื่อเจอคู่ที่แมทช์
- ระบบส่งข้อความติดต่อภายในแอป
- สมัครสมาชิก/เข้าสู่ระบบด้วยรหัสผ่าน (SHA-256 hash)
- ใช้ **Google Sheets เป็นฐานข้อมูล** — ฟรี 100%
- Deploy บน **GitHub Pages** — ฟรีถาวร

## 🔒 ระบบความเป็นส่วนตัว (Privacy)

### เบอร์โทรศัพท์

เมื่อครู A ลงประกาศ เบอร์โทรของ A จะ**ไม่ถูกเปิดเผย**ให้ครูคนอื่นเห็น — จะแสดงเป็น `08X-XXX-XXXX` เท่านั้น

### Flow การแลกเบอร์

1. ครู A เห็นโพสต์ของครู B ที่แมทช์กัน → กด **"ขอแลกเบอร์ติดต่อ"** (พิมพ์ข้อความแนะนำตัวได้)
2. ครู B ได้รับคำขอในแท็บ **"คำขอแลกเบอร์"** พร้อม badge
3. ครู B กด **"ยินยอมแลกเบอร์"** หรือ **"ปฏิเสธ"**
4. เมื่อยินยอม → เบอร์โทรของทั้ง A และ B จะถูกเปิดเผยให้กันและกันเห็นทันที
5. ทั้งสองฝ่ายสามารถยกเลิกการยินยอมได้ตลอดเวลา — เบอร์จะกลับไปซ่อนอีกครั้ง

## 🏗️ สถาปัตยกรรม

```
┌─────────────────┐     HTTPS      ┌──────────────────────┐     ┌──────────────┐
│  Browser (React)│ ─────────────► │ Google Apps Script   │ ──► │ Google Sheets│
│  GitHub Pages   │                │ (เป็น backend ให้เรา)│     │ (ฐานข้อมูล)  │
└─────────────────┘                └──────────────────────┘     └──────────────┘
```

---

## 📋 คู่มือการ Setup แบบละเอียด (จากศูนย์ → ใช้งานได้)

### ⏱️ ใช้เวลาประมาณ 30-45 นาที

### สิ่งที่คุณต้องมี
- บัญชี Google (ฟรี)
- บัญชี GitHub (ฟรี)
- Node.js ติดตั้งบนเครื่อง (ดาวน์โหลดได้จาก [nodejs.org](https://nodejs.org))
- Git ติดตั้งบนเครื่อง

---

## ขั้นตอนที่ 1: สร้าง Google Sheets (ฐานข้อมูล)

1. เข้า [sheets.google.com](https://sheets.google.com) แล้วสร้าง **Spreadsheet ใหม่**
2. ตั้งชื่อว่า **"Teacher Swap Database"** (หรืออะไรก็ได้)
3. ยังไม่ต้องสร้างคอลัมน์เอง — script จะสร้างให้อัตโนมัติในขั้นต่อไป

---

## ขั้นตอนที่ 2: ตั้งค่า Google Apps Script (Backend)

1. ในหน้า Google Sheets ที่เปิดไว้ → ไปที่เมนู **Extensions** → **Apps Script**
2. หน้าต่าง Apps Script จะเปิดขึ้น — ลบ code ทั้งหมดที่มีอยู่ออก
3. เปิดไฟล์ `google-apps-script.gs` ในโปรเจกต์นี้ → **copy ทั้งหมด** → **paste** ลงใน Apps Script
4. กด **บันทึก** (Ctrl+S หรือ ⌘+S) → ตั้งชื่อโปรเจกต์ เช่น "Teacher Swap Backend"
5. ในแถบด้านซ้าย เลือกฟังก์ชัน `setupSheets` แล้วกด **▶ Run**
   - ระบบจะขอ authorize → กด **Review permissions** → เลือกบัญชี Google ของคุณ
   - ถ้าขึ้นเตือน "Google hasn't verified this app" → กด **Advanced** → **Go to [project name] (unsafe)**
   - กลับมาที่หน้า Sheets จะเห็น sheet ใหม่ 3 ตัว: `Posts`, `Messages`, `Users` ✅

### Deploy เป็น Web App

6. กดปุ่ม **Deploy** (มุมขวาบน) → **New deployment**
7. กด ⚙️ **Select type** → เลือก **Web app**
8. ตั้งค่าให้ตรงตามนี้ (สำคัญมาก):
   - **Description**: `Teacher Swap API v1`
   - **Execute as**: **Me (your email)**
   - **Who has access**: **Anyone**
9. กด **Deploy**
10. **คัดลอก Web app URL** ที่ได้ — จะหน้าตาประมาณนี้:
    ```
    https://script.google.com/macros/s/AKfycby.../exec
    ```
    **เก็บ URL นี้ไว้** จะใช้ในขั้นตอนต่อไป

> 💡 **หมายเหตุ**: ทุกครั้งที่แก้ code ใน Apps Script ต้อง Deploy → **Manage deployments** → แก้ version เป็น **New version** แล้ว Deploy ใหม่ (URL เดิมจะใช้ได้)

---

## ขั้นตอนที่ 3: ตั้งค่าโปรเจกต์ React บนเครื่อง

1. เปิด Terminal / Command Prompt ไปที่โฟลเดอร์ `teacher-swap`
2. ติดตั้ง dependencies:
   ```bash
   npm install
   ```
3. คัดลอกไฟล์ config:
   ```bash
   cp .env.example .env
   ```
   (บน Windows ใช้ `copy .env.example .env`)
4. เปิดไฟล์ `.env` แล้ววาง URL จากขั้นตอนที่ 2 ข้อ 10:
   ```
   VITE_API_URL=https://script.google.com/macros/s/AKfycby.../exec
   ```

### ทดสอบรันบนเครื่อง

```bash
npm run dev
```

เปิด browser ไปที่ `http://localhost:5173` — ถ้าเห็นหน้าเว็บ ✅ ลองสมัครสมาชิก/ลงประกาศ แล้วกลับไปดูใน Google Sheets — ข้อมูลควรเพิ่มขึ้นมา

---

## ขั้นตอนที่ 4: Deploy ขึ้น GitHub Pages

### 4.1 สร้าง GitHub repository

1. เข้า [github.com](https://github.com) → **New repository**
2. ตั้งชื่อ repo เช่น `teacher-swap` (จำชื่อนี้ไว้!)
3. เลือก **Public**
4. ยังไม่ต้อง init README

### 4.2 แก้ไข vite.config.js

เปิดไฟล์ `vite.config.js` เปลี่ยน `base` ให้ตรงกับชื่อ repo:

```javascript
base: '/teacher-swap/',  // ถ้า repo ชื่อ my-app ต้องเป็น '/my-app/'
```

### 4.3 Push code ขึ้น GitHub

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/teacher-swap.git
git push -u origin main
```

### 4.4 ตั้งค่า Secret (ซ่อน API URL)

1. ไปที่ repo บน GitHub → **Settings** → **Secrets and variables** → **Actions**
2. กด **New repository secret**
   - **Name**: `VITE_API_URL`
   - **Value**: URL ของ Google Apps Script (จากขั้นตอนที่ 2)
3. กด **Add secret**

### 4.5 เปิดใช้ GitHub Pages

1. Settings → **Pages**
2. ภายใต้ **Build and deployment** → **Source** → เลือก **GitHub Actions**

### 4.6 Trigger การ deploy

GitHub Actions จะรันอัตโนมัติทุกครั้งที่ push — ถ้าไม่รัน ลอง push ใหม่หรือกด re-run workflow

1. ไปที่แท็บ **Actions** บน GitHub — ดูว่า workflow รันสำเร็จไหม (ใช้เวลา ~2 นาที)
2. เมื่อเสร็จ เว็บจะอยู่ที่:
   ```
   https://YOUR_USERNAME.github.io/teacher-swap/
   ```

🎉 **เสร็จแล้ว!** แชร์ URL นี้ให้เพื่อนครูใช้ได้เลย

---

## 🔧 การอัปเดตเว็บ

แค่แก้ code แล้ว push ขึ้น GitHub:

```bash
git add .
git commit -m "update"
git push
```

GitHub Actions จะ deploy ให้อัตโนมัติ

---

## ⚠️ ข้อจำกัดที่ควรรู้

### ปัญหาด้าน Performance
- Google Apps Script มี quota **20,000 requests/วัน** — เหลือเฟือสำหรับหลักพันคน
- Google Sheets ทำงานช้าเมื่อเกิน 10,000 แถว → ถ้าโตเกิน ควรย้ายไป PostgreSQL/Firebase

### ปัญหาด้าน Security
- ⚠️ **Password hashing ใน Apps Script เป็นแบบเบื้องต้น** — ไม่ได้ secure ระดับธนาคาร เพียงพอสำหรับระบบนี้แต่อย่าใช้ password เดียวกับบัญชีอื่น
- ⚠️ **ไม่มีระบบ rate limiting** — ถ้าโดน spam ให้เพิ่ม validation ใน Apps Script
- ⚠️ **ข้อมูลเบอร์โทรเห็นได้หมด** — ควรปรับให้ซ่อนเบอร์จนกว่าจะแมทช์และกดดู

### ปัญหาด้าน Privacy (PDPA)
- เก็บข้อมูลส่วนบุคคลต้องมี **นโยบายความเป็นส่วนตัว** และแจ้งผู้ใช้ก่อน
- ควรเพิ่มปุ่ม "ลบบัญชี" เพื่อให้ผู้ใช้ลบข้อมูลของตัวเองได้

---

## 🛠️ ปัญหาที่พบบ่อย + วิธีแก้

### ❌ เรียก API ไม่ได้ / CORS error
- ตรวจสอบว่า Deploy Apps Script แล้วเลือก **"Who has access: Anyone"**
- ถ้าเพิ่งแก้ code ใน Apps Script ต้อง **New version** แล้ว Deploy ใหม่

### ❌ หน้าเว็บขึ้น 404 หลัง deploy
- ตรวจสอบว่าใน `vite.config.js` ค่า `base` ตรงกับชื่อ repo (มี `/` ปิดท้าย)

### ❌ GitHub Actions รันไม่สำเร็จ
- เช็คว่าตั้งค่า **Settings → Pages → Source = GitHub Actions** แล้ว
- เช็คว่าใส่ Secret `VITE_API_URL` ถูกต้อง

### ❌ ข้อมูลไม่บันทึกลง Sheet
- ลองเปิด Apps Script → **Executions** ดู error log
- ตรวจสอบว่า `SPREADSHEET_ID` ใช้ Sheet ที่ถูกต้อง (ควรเป็น Sheet ที่ผูกกับ Apps Script)

---

## 📂 โครงสร้างโปรเจกต์

```
teacher-swap/
├── .github/workflows/deploy.yml     # Auto-deploy ขึ้น GitHub Pages
├── google-apps-script.gs            # Backend code (copy ไปวางใน Apps Script)
├── src/
│   ├── App.jsx                      # หน้าหลัก + views ย่อย
│   ├── main.jsx                     # entry point
│   ├── index.css                    # stylesheet
│   ├── components/
│   │   ├── AuthModal.jsx            # modal เข้าสู่ระบบ/สมัครสมาชิก
│   │   └── PostCard.jsx             # การ์ดแสดงประกาศ
│   └── lib/
│       ├── api.js                   # เรียก Google Apps Script
│       └── constants.js             # รายชื่อจังหวัด วิชา ระดับชั้น
├── index.html
├── package.json
├── vite.config.js
├── .env.example                     # template สำหรับ .env
└── .gitignore
```

---

## 🚀 ไอเดียต่อยอด

- **ระบบจับคู่แบบวงกลม** (A→B→C→A) — สำหรับเคสที่หาคู่ตรงๆ ไม่ได้
- **ระบบ OTP ผ่าน SMS** — ยืนยันว่าเป็นครูจริง
- **ผูกกับเลขบัตรประชาชน/ใบรับรองการเป็นข้าราชการ**
- **ซ่อนเบอร์โทรจนกว่าทั้งสองฝ่ายจะยืนยันการแมทช์**
- **Timeline การย้าย** — แสดงรอบการย้ายของ สพฐ.
- **Export โพสต์ที่แมทช์เป็น PDF** — สำหรับใช้ยื่นเอกสารจริง

---

## 📝 License

ใช้งานฟรีสำหรับทุกจุดประสงค์ที่เป็นประโยชน์ต่อครูไทย 🙏

สร้างขึ้นเพื่อช่วยแก้ปัญหาการย้ายของข้าราชการครูไทย
