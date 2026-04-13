# 🐾 Cattagram — SillyTavern Extension

## วิธีติดตั้ง

1. **คัดลอกโฟลเดอร์** `cattagram-st-extension` ทั้งหมดไปไว้ที่:
   ```
   SillyTavern/public/extensions/third-party/cattagram/
   ```
   
2. **เปิด SillyTavern** แล้วไปที่ Extensions → เปิด "Cattagram"

3. **ปุ่ม 🐾** จะปรากฏที่มุมขวาล่างของหน้าจอ — แตะเพื่อเปิด

---

## ฟีเจอร์

### 🪟 Floating Window
- หน้าต่างลอยที่ลากได้, ย่อ/ขยายได้, ปรับขนาดได้
- เปิด/ปิดด้วยปุ่ม 🐾 มุมขวาล่าง

### 👤 บัญชีผู้ใช้
- **ผู้ใช้จริง** — ตั้งชื่อ, username, avatar, bio ในแท็บโปรไฟล์
- **บอท/ตัวละคร** — เพิ่มได้ไม่จำกัดในแท็บตัวละคร แต่ละตัวมี API แยก

### 🔗 เชื่อม SillyTavern
- **Import อัตโนมัติ** — ตรวจจับ API URL & Key จาก ST โดยอัตโนมัติ
- **Global API** — ตั้งครั้งเดียว ใช้ได้กับทุกตัวละคร
- **Per-char API** — แต่ละตัวละครตั้ง API แยกได้
- รองรับ ST hosted, ST local, Ollama, LM Studio

### 💉 Jailbreak Injection
- ใส่ jailbreak text ใน **"เชื่อม SillyTavern → Jailbreak"**
- กด "💉 ใส่ Jailbreak" → inject เข้า ST Extension Prompt โดยตรง
- กด "🔒 ปิด" เพื่อลบ

### 💬 DM Chat
- แชทกับ bot ทีละตัว ผ่าน OpenAI-compatible API
- ประวัติการสนทนาเก็บ local 200 ข้อความต่อตัว
- Jailbreak จะถูกแทรกอัตโนมัติถ้าเปิดใช้งาน

### 🎨 ธีม
- Dark/Light mode
- 6 ธีมสี: ส้มแมว, ฟ้าใส, มิ้นท์, ม่วง, กุหลาบ, นีออน

---

## โครงสร้างไฟล์

```
cattagram-st-extension/
├── manifest.json   ← ST extension manifest
├── index.js        ← Main extension + floating window + app
└── style.css       ← Floating window styles
```

---

## API Compatibility

ใช้ `/v1/chat/completions` (OpenAI format) — รองรับ:
- SillyTavern (any backend)
- Ollama
- LM Studio  
- OpenAI
- Claude via proxy
