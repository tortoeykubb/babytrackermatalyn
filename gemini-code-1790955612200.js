async function sendSummaryToLine() {
  const sendBtn = document.getElementById('sendLineBtn');
  const selectedDate = document.getElementById('filterDate').value;

  if (!selectedDate) {
    alert('กรุณาเลือกวันที่ก่อนกดส่งสรุป');
    return;
  }

  sendBtn.disabled = true;
  sendBtn.innerHTML = 'กำลังส่ง...';

  try {
    // เปลี่ยน path จาก /.netlify/functions/send-line-summary เป็น /api/send-line-summary
    const response = await fetch('/api/send-line-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: selectedDate })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      alert('ส่งสรุปผลเข้า LINE เรียบร้อยแล้ว!');
    } else {
      alert('เกิดข้อผิดพลาด: ' + (result.error || 'ไม่สามารถส่งข้อความได้'));
    }
  } catch (err) {
    console.error('Error sending LINE summary:', err);
    alert('ไม่สามารถเชื่อมต่อระบบส่ง LINE ได้');
  } finally {
    sendBtn.disabled = false;
    sendBtn.innerHTML = 'ส่งสรุปเข้า LINE';
  }
}