export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
    return res.status(500).json({ error: 'LINE Token is not configured' });
  }

  try {
    // 1. ดึงข้อมูลบันทึกทั้งหมดจาก API records
    const host = req.headers.host || 'localhost:3000';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const recordsRes = await fetch(`${protocol}://${host}/api/records`);
    
    let allRecords = [];
    if (recordsRes.ok) {
      allRecords = await recordsRes.json();
    }

    // 2. กรองเฉพาะรายการของวันที่เลือก (เปรียบเทียบ YYYY-MM-DD)
    const dayRecords = allRecords.filter(item => {
      if (!item.datetime) return false;
      return item.datetime.startsWith(date);
    });

    // Sort เรียงตามเวลา จากเช้าไปดึก
    dayRecords.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));

    // 3. คำนวณสรุปผล
    let totalAmount = 0;
    let countBreast = 0;
    let countStock = 0;
    let countFormula = 0;

    const sourceNames = {
      breast: 'นมแม่ (เข้าเต้า)',
      stock: 'นมแม่ (สต็อก)',
      formula: 'นมผง'
    };

    let detailListText = '';

    if (dayRecords.length === 0) {
      detailListText = '⚠️ ไม่มีรายการบันทึกการทานนมในวันนี้';
    } else {
      dayRecords.forEach((item, index) => {
        const amt = parseFloat(item.amount) || 0;
        totalAmount += amt;

        if (item.source === 'breast') countBreast++;
        else if (item.source === 'stock') countStock++;
        else if (item.source === 'formula') countFormula++;

        // ดึงเฉพาะเวลา HH:mm
        const timeStr = item.datetime.includes('T') 
          ? item.datetime.split('T')[1].slice(0, 5) 
          : item.datetime.split(' ')[1]?.slice(0, 5) || item.datetime;

        const typeName = sourceNames[item.source] || item.source || 'นม';
        detailListText += `${index + 1}. เวลา ${timeStr} น. - ${amt} ออนซ์ (${typeName})\n`;
      });
    }

    // 4. ประกอบข้อความส่งเข้า LINE
    let summaryText = `📊 สรุปการกินนมของน้องมาตาลิณย์\n`;
    summaryText += `📅 วันที่: ${date}\n`;
    summaryText += `----------------------------------\n`;
    summaryText += `🍼 ปริมาณรวมทั้งหมด: ${totalAmount} ออนซ์\n`;
    summaryText += `🔢 จำนวนรวม: ${dayRecords.length} ครั้ง\n`;
    if (countBreast > 0) summaryText += `• เข้าเต้า: ${countBreast} ครั้ง\n`;
    if (countStock > 0) summaryText += `• นมสต็อก: ${countStock} ครั้ง\n`;
    if (countFormula > 0) summaryText += `• นมผง: ${countFormula} ครั้ง\n`;
    summaryText += `----------------------------------\n`;
    summaryText += `⏰ รายละเอียดรายครั้ง:\n`;
    summaryText += detailListText;

    // 5. ส่งเข้า LINE API
    const endpoint = to ? 'push' : 'broadcast';
    const lineRes = await fetch(`https://api.line.me/v2/bot/message/${endpoint}`, {
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
    console.error('Server Error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
