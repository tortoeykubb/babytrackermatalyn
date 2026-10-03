import Redis from 'ioredis';

// ดึงการเชื่อมต่อจาก REDIS_URL ที่มีอยู่แล้วใน Vercel
const redisUrl = process.env.REDIS_URL;
const redis = redisUrl ? new Redis(redisUrl) : null;

const SOURCE_LABELS = {
  breast: "นมแม่ (เข้าเต้า)",
  stock: "นมแม่ (สต็อก)",
  formula: "นมผง",
};

// กรองลบข้อมูลที่เก่ากว่า 30 วันออกอัตโนมัติ
function filterLast30Days(records) {
  if (!Array.isArray(records)) return [];
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  return records.filter(record => {
    if (!record.datetime) return false;
    const recordDate = new Date(record.datetime);
    return recordDate >= thirtyDaysAgo;
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!redis) {
    console.error("REDIS_URL is missing");
    return res.status(500).json({ error: 'REDIS_URL environment variable is missing' });
  }

  try {
    const rawData = await redis.get('baby_milk_records');
    let recordsDatabase = rawData ? JSON.parse(rawData) : [];
    
    const cleanedRecords = filterLast30Days(recordsDatabase);

    if (cleanedRecords.length !== recordsDatabase.length) {
      recordsDatabase = cleanedRecords;
      await redis.set('baby_milk_records', JSON.stringify(recordsDatabase));
    }

    // GET: ดึงข้อมูล
    if (req.method === 'GET') {
      return res.status(200).json(recordsDatabase);
    }

    // POST: บันทึกข้อมูลใหม่
    if (req.method === 'POST') {
      const record = req.body;
      if (!record || !record.datetime) {
        return res.status(400).json({ error: 'Invalid record data' });
      }
      if (!record.id) record.id = Date.now().toString();

      recordsDatabase.push(record);
      recordsDatabase = filterLast30Days(recordsDatabase);
      
      await redis.set('baby_milk_records', JSON.stringify(recordsDatabase));

      const tokenLine = process.env.LINE_CHANNEL_ACCESS_TOKEN;
      const toLine = process.env.LINE_TO;

      if (tokenLine) {
        const [date, time] = record.datetime.split("T");
        const text =
          `🍼 บันทึกการกินนมใหม่\n` +
          `เวลา: ${time} น. (${date})\n` +
          `ปริมาณ: ${record.amount} ออนซ์\n` +
          `ประเภท: ${SOURCE_LABELS[record.source] ?? record.source}`;

        const endpoint = toLine ? "push" : "broadcast";
        try {
          await fetch(`https://api.line.me/v2/bot/message/${endpoint}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${tokenLine}`
            },
            body: JSON.stringify(toLine ? { to: toLine, messages: [{ type: "text", text }] } : { messages: [{ type: "text", text }] }),
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
      const index = recordsDatabase.findIndex(r => r.id === id);

      if (index !== -1) {
        recordsDatabase[index] = { id, datetime, amount, source };
        recordsDatabase = filterLast30Days(recordsDatabase);
        await redis.set('baby_milk_records', JSON.stringify(recordsDatabase));
        return res.status(200).json({ success: true, record: recordsDatabase[index] });
      } else {
        return res.status(404).json({ error: 'Record not found' });
      }
    }

    // DELETE: ลบข้อมูล
    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      recordsDatabase = recordsDatabase.filter(r => r.id !== id);
      await redis.set('baby_milk_records', JSON.stringify(recordsDatabase));
      return res.status(200).json({ success: true });
    }

  } catch (error) {
    console.error('Storage Error:', error);
    return res.status(500).json({ error: 'Database storage error' });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
