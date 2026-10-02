export default async function handler(req, res) {
  // ตั้งค่า CORS ให้เรียกใช้งานได้
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRเพื่อให้โปรเจกต์รองรับการทำงานบน **Vercel Serverless Functions** ได้ทันทีโดยไม่มีค่าใช้จ่าย สามารถสร้างและปรับปรุงโครงสร้างโค้ดได้ตามนี้เลยครับ

---

### 1. ไฟล์ API สรุปรายวัน (`api/send-line-summary.js`)

สร้างโฟลเดอร์ชื่อ `api` ขึ้นมาที่ root ของโปรเจกต์ แล้วสร้างไฟล์ `send-line-summary.js` ด้านใน:

```javascript
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { date } = req.body || {};
  if (!date) {
    return res.status(400).json({ error: 'Missing date parameter' });
  }

  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_TO;

  if (!token) {
    return res.status(500).json({ error: 'LINE_CHANNEL_ACCESS_TOKEN is not configured' });
  }

  try {
    // 💡 หากเชื่อมต่อ Google Sheets API หรือ Database ให้ดึงสรุปของวันที่ระบุที่นี่
    // ตัวอย่างรูปแบบการคำนวณสรุปข้อมูล
    const summaryText = 
      `📊 สรุปการกินนมของน้องมาตาลิณย์\n` +
      `📅 ประจำวันที่: ${date}\n\n` +
      `🍼 สรุปรายการถูกส่งผ่าน Vercel Serverless Function เรียบร้อยแล้ว`;

    const endpoint = to ? 'push' : 'broadcast';
    const lineRes = await fetch(`[https://api.line.me/v2/bot/message/$](https://api.line.me/v2/bot/message/$){endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(
        to
          ? { to, messages: [{ type: 'text', text: summaryText }] }
          : { messages: [{ type: 'text', text: summaryText }] }
      ),
    });

    if (!lineRes.ok) {
      const errorText = await lineRes.text();
      return res.status(lineRes.status).json({ error: errorText });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error in send-line-summary API:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}