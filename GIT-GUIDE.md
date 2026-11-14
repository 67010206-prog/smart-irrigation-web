# คู่มือ Git — Smart Irrigation Web

Repository: <https://github.com/67010206-prog/smart-irrigation-web.git>
Branch หลักที่ใช้ร่วมกัน: `main`

---

## 0) เตรียมครั้งแรก (ทำครั้งเดียว)

```bash
# ตรวจว่ามี git และตั้งชื่อผู้เขียน commit
git --version
git config --global user.name  "ชื่อของคุณ"
git config --global user.email "อีเมลที่ผูกกับ GitHub"
```

### กรณีเครื่องใหม่ ยังไม่มีโค้ดในเครื่อง

```bash
git clone https://github.com/67010206-prog/smart-irrigation-web.git
cd smart-irrigation-web
npm install          # หรือ npm ci ถ้ามี package-lock.json
npm run dev
```

### กรณีมีโค้ดอยู่แล้วแต่ยังไม่ได้ผูก remote

```bash
git remote add origin https://github.com/67010206-prog/smart-irrigation-web.git
git branch -M main
git remote -v        # ตรวจว่าชี้ถูก repo
```

> ถ้าเคยตั้ง remote ผิด ใช้ `git remote set-url origin <url>` ทับได้เลย

---

## 1) Push — ส่งงานขึ้น GitHub

```bash
git status                     # ดูว่าไฟล์ไหนเปลี่ยน
git add .                      # เลือกทุกไฟล์ที่เปลี่ยน (หรือระบุชื่อไฟล์)
git commit -m "อธิบายสิ่งที่แก้สั้น ๆ"
git push origin main
```

ถ้ายังไม่เคยตั้ง upstream (push ครั้งแรกของ branch):

```bash
git push -u origin main
```

หลังจากนั้นใช้แค่ `git push` ได้เลย

### รูปแบบข้อความ commit ที่แนะนำ

```
เพิ่มการ์ดถังน้ำในหน้า Dashboard
แก้ API control/pump ให้ forward ไป Node-RED
อัปเดต README วิธีใช้ telemetry
```

---

## 2) Pull — ดึงงานล่าสุดจาก GitHub

```bash
git pull origin main          # ดึง + merge เข้าสาขาปัจจุบัน
git pull --rebase origin main # ดึงแล้ววาง commit ของเราไว้บนสุด (ประวัติสวยกว่า)
```

ก่อนเริ่มทำงานทุกครั้งให้ `git pull` ก่อนเสมอ เพื่อลด conflict

---

## 3) ลำดับทำงานที่แนะนำ (ทุกครั้งที่แก้โค้ด)

```bash
git pull            # 1. ดึงของล่าสุด
# ... แก้โค้ด / npm run build ตรวจว่าไม่พัง ...
git status          # 2. ดูว่าเปลี่ยนอะไร
git add .           # 3. เลือกไฟล์
git commit -m "..." # 4. บันทึก
git push            # 5. ส่งขึ้น GitHub
```

---

## 4) แก้ conflict เบื้องต้น

เมื่อ `git pull` แล้วขึ้น `CONFLICT`:

```bash
git status                     # ไฟล์ที่มีปัญหาจะอยู่ใต้ "Unmerged paths"
# เปิดไฟล์นั้น จะเห็นเครื่องหมาย <<<<<<< ======= >>>>>>>
# เลือกเก็บโค้ดให้ถูกต้อง แล้วลบเครื่องหมายเหล่านี้ออก
git add <ไฟล์ที่แก้แล้ว>
git commit                     # ปิด merge
git push
```

ถ้าอยากยกเลิก merge ที่ยังไม่เสร็จ: `git merge --abort`

---

## 5) คำสั่งที่ใช้บ่อย

| งาน | คำสั่ง |
|---|---|
| ดูไฟล์ที่แก้ | `git status` |
| ดูโค้ดที่เปลี่ยน | `git diff` |
| ดูประวัติ | `git log --oneline -10` |
| ดู remote | `git remote -v` |
| ดู branch | `git branch -a` |
| สร้าง branch ใหม่ | `git checkout -b feature/tank-ui` |
| สลับ branch | `git checkout main` |
| ส่ง branch ใหม่ขึ้น GitHub | `git push -u origin feature/tank-ui` |
| ยกเลิกการแก้ไฟล์ (ยังไม่ commit) | `git restore <ไฟล์>` |
| ยกเลิกการ add | `git restore --staged <ไฟล์>` |
| แก้ข้อความ commit ล่าสุด | `git commit --amend -m "ข้อความใหม่"` |

---

## 6) ไฟล์ที่ไม่ควรขึ้น GitHub

ไฟล์เหล่านี้อยู่ใน `.gitignore` แล้ว — **ห้าม commit** เพราะมีข้อมูลเครื่องตัวเองหรือไฟล์ขนาดใหญ่

```
node_modules/    ของติดตั้ง (สร้างใหม่ได้ด้วย npm install)
.next/           build output
out/             static export
.env             ความลับ / ค่า config ส่วนตัว
.env*.local      ค่า config เฉพาะเครื่อง
next-env.d.ts    ไฟล์ที่ Next.js สร้างเอง
```

ถ้าเผลอ `git add` ไฟล์เหล่านี้ไปแล้ว:

```bash
git rm -r --cached node_modules
git commit -m "เอา node_modules ออกจาก git"
```

> **สำคัญ:** `NODERED_PUMP_URL` / `NODERED_STATUS_URL` / `NEXT_PUBLIC_API_BASE_URL`
> ให้เก็บใน `.env.local` ของแต่ละเครื่อง (ไฟล์นี้ไม่ถูก push) — ใน repo มีแค่ `.env.example`

---

## 7) ปัญหาที่พบบ่อย

**`Authentication failed` / `Support for password authentication was removed`**
GitHub ไม่รับรหัสผ่านแล้ว ให้ใช้ Personal Access Token (PAT) แทนรหัสผ่าน
→ GitHub → Settings → Developer settings → Personal access tokens → Generate (สิทธิ์ `repo`)
แล้วใส่ token ตอน git ถามรหัสผ่าน (หรือใช้ Git Credential Manager / SSH key)

**`Updates were rejected because the remote contains work that you do not have`**
แปลว่า GitHub มี commit ใหม่กว่า ให้ `git pull origin main` ก่อน แล้วค่อย `git push`

**`fatal: not a git repository`**
ต้อง `cd` เข้าโฟลเดอร์โปรเจกต์ก่อน (`smart-irrigation-web`)

**push ขึ้นไปแล้วแต่เว็บไม่เปลี่ยน**
push โค้ดขึ้น GitHub ไม่ได้ deploy อัตโนมัติ ต้องมีคนไป deploy (เช่น Vercel) หรือรันบนเครื่องเอง

---

## 8) branch `main` ถูกป้องกันไว้ (Protected branch)

repo นี้ตั้งกฎไว้ว่า **ห้าม push ตรงเข้า `main`** — ถ้าลองจะได้ error:

```
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: - Changes must be made through a pull request.
```

วิธีทำงานที่ถูกต้องคือ **push ขึ้น branch ใหม่ แล้วเปิด Pull Request**

```bash
git checkout -b feature/ชื่อฟีเจอร์     # 1. แยก branch
# ... แก้โค้ด แล้ว commit ...
git push -u origin feature/ชื่อฟีเจอร์  # 2. push branch ขึ้น GitHub
```

จากนั้นเปิดลิงก์ที่ GitHub พิมพ์ให้ในผลลัพธ์ (รูปแบบ
`https://github.com/67010206-prog/smart-irrigation-web/pull/new/feature/ชื่อฟีเจอร์`)
→ กด **Create pull request** → รอ review → กด **Merge**

หลัง merge แล้ว ดึงของล่าสุดกลับมาและกลับไปใช้ `main`:

```bash
git checkout main
git pull origin main
git branch -d feature/ชื่อฟีเจอร์
```

ทางเลือกอื่น: เจ้าของ repo ไปปิดกฎที่ GitHub → Settings → Branches → Branch protection rules
(ไม่แนะนำ เพราะเสียประโยชน์ของการ review)
