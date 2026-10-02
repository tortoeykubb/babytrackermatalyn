// โค้ดเดิม: fetch('/.netlify/functions/records', ...)
// เปลี่ยนเป็น:
const response = await fetch('/api/records', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
});