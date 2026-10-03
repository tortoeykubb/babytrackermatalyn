import { kv } from '@vercel/kv';

const SOURCE_LABELS = {
  breast: "นมแม่ (เข้าเต้า)",
  stock: "นมแม่ (สต็อก)",
  formula: "นมผง",
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET: ดึงข้อมูลทั้งหมดจาก KV Storage
    if (req.method === 'GET') {
      const recordsDatabase = (await kv.get('baby_milk_records')) || [];
      return res.status(200).json(recordsDatabase);
    }

    // POST: บันทึกรายการใหม่ลง KV Storage
    if (req.method === 'POST') {
      const record = req.body;
      if (!record || !record.datetime) {
        return res.status(400).json({ error: 'Invalid record data' });
      }
      if (!record.id) record.id = Date.now().toString();

      let recordsDatabase = (await kv.get('baby_milk_records')) || [];
      recordsDatabase.push(record);
      
      // บันทึกกลับลงฐานข้อมูลถาวร
      await kv.set('baby_milk_records', recordsDatabase);

      // ส่งแจ้งเตือน LINE
      const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
      const to = process.env.LINE_TO;

      if (token) {
        const [date, time] = record.datetime.split("T");
        const text =
          `🍼 บันทึกการกินนมใหม่\n` +
          `เวลา: ${time} น. (${date})\n` +
          `ปริมาณ: ${record.amount} ออนซ์\n` +
          `ประเภท: ${SOURCE_LABELS[record.source] ?? record.source}`;

        const endpoint = to ? "push" : "broadcast";
        try {
          await fetch(`https://api.line.me/v2/bot/message/${endpoint}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(to ? { to, messages: [{ type: "text", text }] } : { messages: [{ type: "text", text }] }),
          });
        } catch (err) {
          console.error("LINE notification error", err);
        }
      }

      return res.status(200).json({ success: true, record });
    }

    // PUT: แก้ไขข้อมูล
    if (req.method === 'PUT') {
      const { id, datetime, amount, source } = req.body || {};
      let recordsDatabase = (await kv.get('baby_milk_records')) || [];
      const index = recordsDatabase.findIndex(r => r.id === id);

      if (index !== -1) {
        recordsDatabase[index] = { id, datetime, amount, source };
        await kv.set('baby_milk_records', recordsDatabase);
        return res.status(200).json({ success: true, record: recordsDatabase[index] });
      } else {
        return res.status(404).json({ error: 'Record not found' });
      }
    }

    // DELETE: ลบข้อมูล
    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      let recordsDatabase = (await kv.get('baby_milk_records')) || [];
      recordsDatabase = recordsDatabase.filter(r => r.id !== id);
      await kv.set('baby_milk_records', recordsDatabase);
      return res.status(200).json({ success: true });
    }

  } catch (error) {
    console.error('Storage Error:', error);
    return res.status(500).json({ error: 'Database storage error' });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
