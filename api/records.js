// ตัวแปรเก็บข้อมูลชั่วคราวใน Memory (สำหรับการทดสอบ)
let recordsDatabase = [];

const SOURCE_LABELS = {
  breast: "นมแม่ (เข้าเต้า)",
  stock: "นมแม่ (สต็อก)",
  formula: "นมผง",
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET: ดึงรายการบันทึกทั้งหมด
  if (req.method === 'GET') {
    return res.status(200).json(recordsDatabase);
  }

  // POST: บันทึกรายการใหม่
  if (req.method === 'POST') {
    const record = req.body;
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const to = process.env.LINE_TO;

    if (!record || !record.datetime) {
      return res.status(400).json({ error: 'Invalid record data' });
    }

    // เก็บลง Array
    recordsDatabase.push(record);

    // ส่งแจ้งเตือนอัตโนมัติเข้า LINE
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

  return res.status(405).json({ error: 'Method Not Allowed' });
}
