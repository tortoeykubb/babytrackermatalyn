export default async function handler(req, res) {
  // ตั้งค่า CORS
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
    return res.status(500).json({ error: 'LINE_CHANNEL_ACCESS_TOKEN is not configured in Vercel Environment Variables' });
  }

  try {
    const summaryText = 
      `📊 สรุปการกินนมของน้องมาตาลิณย์\n` +
      `📅 ประจำวันที่: ${date}\n\n` +
      `🍼 ส่งสรุปผลรายวันเข้า LINE เรียบร้อยแล้วค่ะ`;

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
      console.error('LINE API Error:', errorText);
      return res.status(lineRes.status).json({ error: errorText });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Server Error:', err);
    return res.status(500).json({ error: err.message || 'Internal Server Error' });
  }
}
