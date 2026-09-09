# FinSim - Financial Statement Simulator (Multi-Period)

เครื่องมือจำลองงบการเงิน 3 งบ (**Balance Sheet**, **Income Statement / P&L**, **Cash Flow Statement**) จากการบันทึกรายการบัญชีรายวัน (**Dr.** / **Cr.**) แบบหลายงวดบัญชี (Multi-Period) พร้อมเชื่อมโยงตัวเลขอัตโนมัติ

---

## 🌟 ฟีเจอร์หลัก (Key Features)

1. **บันทึกรายการบัญชีรายวัน (Journal Entry Form):**
   - รองรับการลงบัญชีแบบคู่ (Double-Entry: Dr. / Cr.)
   - Dropdown เลือกประเภทบัญชี: **Asset (สินทรัพย์)**, **Debt / Liability (หนี้สิน)**, **Equity (ส่วนของทุน)**, **Revenue (รายได้)**, **Expense (ค่าใช้จ่าย)**
   - Auto-detect หรือเลือกกิจกรรมกระแสเงินสด (CFO ดำเนินงาน, CFI ลงทุน, CFF จัดหาเงิน, Non-Cash)
   - Real-time Balance Check: ตรวจสอบ Dr. = Cr. แบบสดๆ พร้อมแจ้งเตือนผลต่าง
   - ระบบแก้ไขรายการบัญชีย้อนหลัง (Edit Journal Entry) จากประวัติสมุดรายวัน

2. **ระบบจำลองหลายงวดบัญชี (Multi-Period Simulation):**
   - เริ่มต้นตั้งแต่งวด **ปี X0 (ยอดยกมา/ยอดต้นงวด)**, ปี X1, ปี X2, ปี X3...
   - สามารถกดเพิ่มงวดใหม่ได้เรื่อยๆ ไม่จำกัด (เช่น ปี X4, ปี X5...) ผ่าน In-App Modal
   - **งบดุลสะสมต่อเนื่อง (Cumulative Balance Sheet):** สินทรัพย์ หนี้สิน ทุน และกำไรสะสม (Retained Earnings) สะสมข้ามงวดอย่างถูกต้อง
   - **งบกำไรขาดทุน (P&L):** แสดงรายได้และค่าใช้จ่ายเฉพาะของงวดนั้นๆ
   - **งบกระแสเงินสดยกยอด:** เงินสดปลายงวดของปีก่อนหน้า ยกมาเป็นเงินสดต้นงวด (Beginning Cash) ของปีถัดไป

3. **มุมมองการแสดงผล 2 หน้าจอ (Dual Views):**
   - **หน้าห้องทำงาน (Workspace):** บันทึกบัญชี + ดูงบเปรียบเทียบเคียงข้างกันได้สูงสุด 3 งวดที่เลือก (เลือกผ่าน Period Chips)
   - **หน้างบการเงินรวมทุกงวด (All Periods Complete Report):** หน้ารวมงบขนาดเต็มจอ แสดงครบทุกงวดที่มีในระบบในตารางเดียว พร้อมรองรับการพิมพ์ (Print / Export PDF)

---

## 📁 โครงสร้างไฟล์ (File Structure)

```text
├── index.html      # หน้าเว็บหลักและ Semantic Layout
├── style.css       # ดีไซน์สไตล์ FinTech พรีเมียม (Dark Slate, Vibrant Badges)
├── app.js          # กลไกบัญชีคู่ (Accounting Engine) และการคำนวณเชื่อมโยง 3 งบ
└── README.md       # เอกสารแนะนำโครงการ
```

---

## 🚀 วิธีเปิดใช้งาน (Getting Started)

เนื่องจากโปรเจกต์นี้พัฒนาด้วย HTML, CSS, และ JavaScript แท้ (Vanilla Web Technologies) จึงไม่ต้องติดตั้ง dependency หรือ backend ใดๆ:
1. ดาวน์โหลดหรือ Clone repository นี้ลงในเครื่อง
2. ดับเบิลคลิกเปิดไฟล์ `index.html` ด้วยเบราว์เซอร์ (Chrome, Edge, Safari, Firefox ฯลฯ)
3. ใช้งานได้ทันที 100%!
